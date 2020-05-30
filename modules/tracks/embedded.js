
const { getStore } = require("../helpers");
const Common = require("./common");
const { DBQueriesModel } = require("../../models/logs");

async function deleteTracks (Model, query, trackIds) {
    const update = {
        $pull: {
            "items": {
                trackId: { $in: trackIds }
            }
        }
    };
    Model.updateOne(query, update);
    /* Logging */
    DBQueriesModel.create({
        model: Model.modelName,
        conditions: JSON.stringify([query, update]),
        operation: "updateOne"
    });
}

module.exports = {
    async getEmbeddedTracks (Model, parameters) {
        const { query, options, settings } = parameters;
        const list = await Model.aggregate([
            { $match: { ...query } },
            { $project: {
                _id: 1,
                itemType: 1,
                store: 1,
                items: {
                    $slice: [
                        "$items", options.skip || 0,
                        options.limit || 20
                    ]
                }
            }
            },
            { $limit: 1 }
        ]);

        if (!list || !list.length || !list[0].items || !list[0].items.length) {
            return { tracks: [], items: [] };
        }
        query._id = list[0]._id;

        // Detect Store
        settings.store = getStore(list[0].store);

        const { items, tracks, updates, deletes } =
            await Common.getTracks(!list[0].items, { ...settings, index: options.skip || 0 });

        updates.forEach(([query]) => {
            deletes.push(query);
        });
        if (deletes.length) {
            await deleteTracks(Model, query, deletes.map(item => item.trackId));
        }

        return {
            tracks,
            items
        };
    }
};
