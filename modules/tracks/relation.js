
const Common = require("./common");
const { DBQueriesModel } = require("../../models/logs");

async function updateTracks (Model, query, updates, whole) {
    /*
    * Find Duplicates
    * */
    const duplicates = {};
    if (!whole) {
        const filter = updates.reduce((ac, [, update]) => ac.$or.push({ ...query, ...update }) && ac, { $or: [] });
        const result = await Model.find(filter, { trackId: 1 }, { lean: true });
        result.forEach(item => {
            duplicates[item.trackId] = 1;
        });
    }

    /*
    * Deletion after finding duplicates
    * */
    const deletes = [];

    /*
    *
    * */
    const bulkOperations = [];
    updates.forEach(([cnd, update]) => {
        if (duplicates[update.trackId]) {
            return deletes.push(cnd);
        }
        bulkOperations.push({
            updateOne: {
                filter: { ...query, ...cnd },
                update
            }
        });
    });

    if (bulkOperations.length) {
        Model.bulkWrite(bulkOperations, { ordered: false }).catch(console.log);
    }

    return { deletes, duplicates };
}

async function deleteTracks (Model, query, conditions) {
    const trackIds = [];
    conditions.forEach((cnd) => {
        trackIds.push(cnd.trackId);
    });

    DBQueriesModel.create({
        model: Model.modelName,
        conditions: JSON.stringify({ ...query, trackId: { $in: trackIds } }),
        operation: "deleteMany"
    }).catch(console.log);
    Model.deleteMany({ ...query, trackId: { $in: trackIds } }).catch(console.log);
}

module.exports = {
    /**
     * Returns trackId releaseId artistId pairs with updates information in it
     * @param  Model {Object} - main options
     * Should consist
     *      @param parameters
     *      @param parameters.query: Its a pure query like {userId: "78052"}
     *      @param parameters.options: its a query options:
     *          @param parameters.options.skip {Number}
     *          @param parameters.options.limit {Number}
     *          @param parameters.options.sort {Number}
     *      @param parameters.settings: its a main settings
     *          @param parameters.settings.group {Object} - The requested user group
     *          @param parameters.settings.store {String} - The store
     *          @param parameters.settings.owner {Boolean} - Is this list owner is requested
     *          @param parameters.settings.update {Boolean} - Should be updated the content or not
     *          @param parameters.settings.whole {Boolean} - When its whole list without pagination
     * @return {tracks, items, deletes, updates }
     * The Tracks
     * The Items
     * Deleted commands List
     * Updates commands List
     * */
    async getTracks (Model, parameters) {
        const { query, options, settings, projection, whole } = parameters;

        const docs = await Model.find(
            { ...query },
            projection || null,
            { lean: true, ...options }
        );

        if (!docs || !docs.length) {
            return { tracks: [], items: [] };
        }

        const { items, tracks, updates, deletes } =
            await Common.getTracks(docs, { ...settings, index: options.skip || 0 });

        if (deletes.length) await deleteTracks(Model, query, deletes);
        const result = updates.length && (await updateTracks(Model, query, updates, whole));
        if (result && result.deletes && result.deletes.length) {
            if (result && result.deletes && result.deletes.length) {
                await deleteTracks(Model, query, result.deletes);
            }
        }

        return {
            tracks: tracks.filter((track) => !result.duplicates || !result.duplicates[track.trackId]),
            items
        };
    }
};
