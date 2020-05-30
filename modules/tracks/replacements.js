
// const moment = require("moment");
const { storeMediaModel } = require("../../models/tracks");
const { NotFoundException } = require("../error/index");
const { getTracksByIsrcList } = require("./common");

const getTrackReplacements = async (req) => {
    // get tracks
    const trackId = parseInt(req.params.id);

    // get track isrc
    const TrackModel = storeMediaModel("tracks", req.user.store);
    const track = await TrackModel.findOne({ trackId }, { isrc: 1 }, { lean: true });

    if (!track || !track.isrc) {
        throw new NotFoundException();
    }

    // get replacement
    const options = {
        group: req.user.group,
        notInTrackids: [trackId]
    };
    const replacementTracks = await getTracksByIsrcList(TrackModel, [track.isrc], options);
    const replacement = Object.values(replacementTracks);

    if (!replacement.length) {
        throw new NotFoundException();
    }

    // const status = req.query.status || 0;
    // if status 400 update track
    /* if( status === 400 || status === 403 || status === 404 ){
        TrackModel.updateOne({trackId},{$set: {damagedAt: (moment().unix())}});
    } */

    // redirect
    return `${process.env.HOST_MIX}/mix/search/get/track/by/trackId?` +
        `trackId=${replacement[0].trackId}&groupId=${req.user.groupId}`;
};

module.exports = {
    getTrackReplacements
};
