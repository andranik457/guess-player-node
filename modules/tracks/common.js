
const { promisify } = require("util");
const SearchFunctions = require("../search");
const { storeMediaModel } = require("../../models/tracks");

/**
 * get licenses id by group
 * @param group {Object}
 * @return {array}
 * */
function getGroupLicensorIds (group) {
    return Object.values(
        group.settings.licensorSetting.settings
    ).map(i => +i.licensorId);
}

/**
 * Get isrc's tracks list
 * @param Model {mongoose} - The Mongoose model
 * @param isrcList {Array} - isrc list
 * @param  options {Object} - main options with group in it
 * @return {object}
 * */
async function getTracksByIsrcList (Model, isrcList, options) {
    const tracks = {};
    const licensorIds = getGroupLicensorIds(options.group);

    const conditions = [
        { isrc: { $in: isrcList } },
        { deletedAt: null },
        { licensorId: { $in: licensorIds } },
        {
            $or: [
                { streamingReleaseDate: { $ne: "" } },
                { adSupportedReleaseDate: { $ne: "" } }
            ]
        }
    ];

    if (options.notInTrackids) {
        conditions.push({
            trackId: {
                $nin: options.notInTrackids
            }
        });
    }

    /*
    *  Finding alternative only for HFA Licensed even for own library
    *  To ignore hfa alternatives for own library us this conditions as well:  && !options.owner
    */
    if (options.group.settings.systemSetting.settings.hfaOn.value) {
        conditions.push({ audioLicense: 1 });
    }

    if (isrcList.length) {
        const result = await Model.aggregate([
            { $match: { $and: conditions } },
            {
                $group: {
                    _id: "$isrc",
                    track: {
                        $first: {
                            trackId: "$trackId",
                            releaseId: "$releaseId",
                            artistId: "$artistId"
                        }
                    }
                }
            }
        ]);
        result.forEach(i => {
            tracks[ i._id ] = i.track;
        });
    }
    return tracks;
}

/**
 * Get trackId releaseId artistId pairs without any updates
 * @param items {Array} - pure items
 * @param  options {Object} - main options
 * @return {Array}
 * */
async function getWithoutUpdates (items, options) {
    if (!items || !items.length) { return []; }
    const TrackModel = storeMediaModel("tracks", options.store);
    let tracks = await TrackModel.find(
        { trackId: { $in: items.map(i => i.trackId) }, deletedAt: null },
        { trackId: 1, releaseId: 1, artistId: 1 },
        { lean: true }
    );
    const data = [];
    tracks.forEach((track) => {
        const { trackId, artistId, releaseId } = track;
        data.push({ trackId, artistId, releaseId });
    });
    return data;
}

/**
 * Returns trackId releaseId artistId pairs with updates information in it
 * @param items {Array} - pure items
 * @param  options {Object} - main options
 * @return {Array}
 * */

async function getWithUpdates (items, options) {
    if (!items || !items.length) { return []; }

    const itemByTrackId = {};
    items.forEach((track, item) => {
        itemByTrackId[ track.trackId ] = item;
    });
    const TrackModel = storeMediaModel("tracks", options.store);

    /*
    * Get tracks from origin collection
    */
    const trackByTrackId = {};
    const tracks = await TrackModel.find(
        { trackId: { $in: items.map(i => i.trackId) } },
        { trackId: 1, releaseId: 1, artistId: 1, isrc: 1, licensorId: 1, audioLicense: 1, deletedAt: 1 },
        { lean: true }
    );
    tracks.forEach((track) => {
        trackByTrackId[track.trackId] = track;
    });

    /*
    * Iterate through items fill in items
    * and find out not available track ids
    */
    const notAvailableIsrcs = [];
    items.forEach((item) => {
        const track = trackByTrackId[item.trackId];
        if (!track) {
            item.delete = { trackId: item.trackId };
            return;
        }

        if (track.deletedAt) {
            item.delete = { trackId: item.trackId };
            notAvailableIsrcs.push(track.isrc);
        }
        item.artistId = track.artistId;
        item.releaseId = track.releaseId;
    });

    /*
    * Process not available tracks
    */
    if (notAvailableIsrcs.length) {
        const isrcList = Array.from(new Set(notAvailableIsrcs));
        const isrcTracks = isrcList.length
            ? await getTracksByIsrcList(TrackModel, isrcList, options)
            : {};

        items.forEach((item) => {
            if (!item.delete) return;

            let alternative;
            if (trackByTrackId[item.trackId]) {
                const { isrc } = trackByTrackId[item.trackId];
                if (isrc && isrcTracks[isrc]) {
                    alternative = isrcTracks[isrc];
                    /*
                    * Catch duplications
                    * */
                    if (trackByTrackId[alternative.trackId]) {
                        alternative = undefined;
                    }
                }
            }

            /* When Found Alternative */
            if (alternative) {
                /* Initialize Update */
                item.update = [
                    { trackId: item.trackId },
                    { trackId: alternative.trackId }
                ];
                /* Delete Deletion */
                delete item.delete;
                /**/
                item.trackId = alternative.trackId;
                item.artistId = alternative.artistId;
                item.releaseId = alternative.releaseId;
            }
        });
    }

    return items;
}

/**
 * Returns trackId releaseId artistId pairs with updates information in it
 * @param items {Array} - pure items
 * @param settings {Object} its a main settings
 *     @param settings.group {Object} - The requested user group
 *     @param settings.store {String} - The store
 *     @param settings.owner {Boolean} - Is this list owner is requested
 *     @param settings.index {Number} - The starting position
 *     @param settings.update {Boolean} - Should be updated the content or not
 * @return {tracks, items, deletes, updates }
 * The Tracks
 * The Items
 * Deleted commands List
 * Updates commands List
 * */

async function getTracks (items, settings) {
    const { update } = settings;

    const result = update
        ? await getWithUpdates(items, settings)
        : await getWithoutUpdates(items, settings);

    const trackIds = [];
    const artistIds = [];
    const releaseIds = [];

    const deletes = [];
    const updates = [];

    result.forEach((item) => {
        if (item.delete) { return deletes.push(item.delete); }
        if (item.update) { updates.push(item.update); }
        trackIds.push(item.trackId);
        artistIds.push(item.artistId);
        releaseIds.push(item.releaseId);
    });

    const getTracks = promisify(SearchFunctions.getTracks);
    const tracksList = trackIds.length
        ? await getTracks(trackIds, releaseIds, artistIds, settings)
        : [];

    const trackByTrackId = {};
    tracksList.forEach((track) => {
        trackByTrackId[track.trackId] = track;
    });

    const tracks = [];
    result.forEach((item) => {
        if (trackByTrackId[item.trackId]) {
            return tracks.push(trackByTrackId[item.trackId]);
        }
        deletes.push({ trackId: item.trackId });
    });

    return { tracks, items, deletes, updates };
}

module.exports = {
    getWithUpdates,
    getWithoutUpdates,
    getTracksByIsrcList,
    getTracks
};
