
const _ = require("lodash");

const elasticRequests = require("../dbQueries/elasticRequests");
const { elasticGuessPlayerConnection } = require("../connections/elastic");
const { isIntId } = require("./helpers");
const async = require("async");
const winston = require("winston");
// const { storeMediaModel } = require("../models/tracks");
const { BadRequestException } = require("../modules/error/index");
const itemsResponse = (page, pageSize, totalItems, items) => { return { status: "OK", result: { page, pageSize, totalItems, items } }; };

const search = {

    suggestPlayer: (req, next) => {
        let query = search.setupBody(req.query);

        const options = new function () {
            this.query = query.q || "";
            this.size = parseInt("5");
        }();

        elasticRequests.searchPhrase(elasticGuessPlayerConnection, {
            options: { ...options },
            settings: {
                sort: [{ _score: "desc" }],
                type: "cross_fields",
                fields: ["showName"],
                operator: "and"
            }
        }, (err, result) => {
            if (err) {
                console.log('adsadsadasdad');
            }
            // if (err) return search.emptyResponse(err, query.page, next);

            let suggestList = [];
            result.hits.hits.forEach((one) => {
                suggestList.push(one['_source']['showName']);
            });


            search.responseSender(query.page, result.hits.hits.length, result.hits.total.value, suggestList, next);

        //     search.getTracks(trackIds, releaseIds, artistIds, {
        //         group: req.user.group,
        //         store: req.user.store,
        //         index: options.from
        //     }, (err, arr) => {
        //         if (err) return search.emptyResponse(err, query.page, next);
        //         search.responseSender(query.page, result.hits.hits.length, result.hits.total.value, arr, next);
        //     });
        });
    },

    setupBody: body => {
        !body.pagesize || body.pagesize <= 0 || ((typeof body.pagesize !== "string") && (typeof body.pagesize !== "number")) ? body.pagesize = 20 : false;
        body.pagesize > 100 ? body.pagesize = 100 : false;
        !body.page || body.page <= 0 || typeof body.page !== "string" ? body.page = 1 : false;
        return body;
    },

    responseSender: (page, pageSize, totalItems, items, next) => {
        next(null, itemsResponse(page, pageSize, totalItems, items));
    }

};

module.exports = search;
