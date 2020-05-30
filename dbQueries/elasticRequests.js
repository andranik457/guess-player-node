
const elastic = {

    searchPhrase: (connection, data, next) => {
        const { options, settings } = data;
        if (!settings.sort) settings.sort = [];
        connection.client.search({
            index: connection.index,
            body: {
                sort: [...settings.sort, { _score: "desc" }, { _id: "desc" }],
                from: options.from,
                size: options.size,
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query: options.query,
                                fields: settings.fields,
                                type: settings.type,
                                // fuzziness: "AUTO",
                                analyzer: settings.analyzer,
                                operator: settings.operator
                            }
                        },
                        must_not: {
                            term: {
                                popularity: 1
                            }
                        }
                    }
                }
            }
        }, (err, res) => err ? next(err) : next(null, res));
    },

    searchUnique: (connection, { options, settings }, next) => {
        connection.client.search({
            index: connection.index,
            body: {
                query: {
                    match: {
                        [settings.searchingField]: {
                            query: options.query,
                            // fuzziness: "AUTO",
                            analyzer: "standard",
                            operator: "and"
                        }
                    }
                },
                sort: [{ [settings.sortingField]: { order: options.order || "desc" } }, { _score: "desc" }, { _id: "desc" }],
                collapse: {
                    field: settings.distinctField
                },
                from: options.from,
                size: options.size
            }
        }, (err, res) => err ? next(err) : next(null, res));
    },

    searchOrPhrases: (connection, data, next) => {
        const { options, settings } = data;
        if (!settings.sort) settings.sort = [];
        const should = (field, terms) => {
            const res = [];
            terms.forEach(term => {
                const item = { match: {} };
                item.match[field] = term;
                res.push(item);
            });
            return res;
        };

        connection.client.search({
            index: connection.index,
            body: {
                sort: [...settings.sort, { _score: "desc" } ],
                from: options.from,
                size: options.size,
                query: {
                    bool: {
                        must: {
                            bool: {
                                should: should(settings.field, options.terms)
                            }
                        },
                        must_not: {
                            term: {
                                popularity: 1
                            }
                        }

                    }
                }
            }
        }, (err, res) => err ? next(err) : next(null, res));
    },

    searchTerms: (connection, data, next) => {
        const { query, count } = data.options;
        connection.client.search({
            index: connection.index,
            body: {
                sort: [{
                    popularity: {
                        order: "desc"
                    }
                }, { _score: "desc" }],
                from: 0,
                size: count,
                query: {
                    constant_score: {
                        filter: {
                            terms: query
                        }
                    }
                }
            }
        }, (err, res) => err ? next(err) : next(null, res));
    },

    getTerm: (connection, termId, next) => {
        connection.client.get({
            index: connection.index,
            type: "_doc",
            id: termId
        }, (err, res) => err ? next(err) : next(null, res));
    },

    searchUsers: async (connection, data) => {
        const { options, settings } = data;
        let request = {
            index: connection.index,
            body: {
                from: options.from,
                size: options.size,
                sort: [],
                query: {
                    bool: {}
                }
            }
        };

        const must = [];

        if (options.query) {
            must.push({
                match_phrase_prefix: {
                    [settings.field]: options.query
                }
            });
        }

        if (!options.query) {
            request.body.query.bool.must_not = {
                match: {
                    "profile.trackDownloaded.value": 0
                }
            };
        }

        if (options.conditions) {
            Object.keys(options.conditions).forEach((key) => {
                must.push({ match: { [key]: options.conditions[key] } });
            });
        }

        if (must.length) {
            request.body.query.bool.must = must;
        }

        request.body.sort.push({ "profile.trackDownloaded.value": "desc" });
        request.body.sort.push("_score");

        try {
            return await connection.client.search(request);
        } catch (err) {
            return new Error(err);
        }
    },

    searchLists: async (connection, data) => {
        const { conditions, options } = data;
        const { query, artistId, releaseId, trackId, itemId, type, store, empties } = conditions;
        const request = {
            index: connection.index,
            body: {
                from: options.from,
                size: options.size,
                sort: [],
                _source: ["title"],
                query: {
                    bool: {
                        must: []
                    }
                }
            }
        };

        request.body.query.bool.must.push({ match: { status: true } });
        if (type) { request.body.query.bool.must.push({ match: { type } }); }
        if (store) { request.body.query.bool.must.push({ match: { store } }); }
        if (!empties) { request.body.query.bool.must.push({ exists: { "field": "items.itemId" } }); }

        const keys = ["artistId", "releaseId", "trackId", "itemId"];
        [artistId, releaseId, trackId, itemId].forEach((value, index) => {
            if (value) {
                request.body.query.bool.must.push({
                    match: {
                        [`items.${keys[index]}`]: value
                    }
                });
            }
        });

        const should = [];
        if (query) {
            should.push({
                match: {
                    title: {
                        query: query,
                        // operator: "and",
                        "analyzer": "standard"
                    }
                }
            });
            should.push({
                match: {
                    "items.title": {
                        query: query,
                        // operator: "and",
                        "analyzer": "standard"
                    }
                }
            });
        }

        if (should.length) {
            request.body.query.bool.must.push({ bool: { should } });
        }

        try {
            return await connection.client.search(request);
        } catch (err) {
            return new Error(err);
        }
    }

};

module.exports = elastic;
