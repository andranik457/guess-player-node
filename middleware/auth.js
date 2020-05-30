
const { TokenModel } = require("../models/defaults");
const helperFunction = require("../modules/helpers");
const tokenFunction = require("../modules/token");
const async = require("async");
const moment = require("moment");
const winston = require("winston");
const { getCountriesSettings, getGroupsSettings } = require("../modules/globals");
const { UnauthorizedException, ServiceUnavailableException } = require("../modules/error");

function setRequestUserSettingsCallback (req, params, cb) {
    let settings = getGroupsSettings();
    if (Object.keys(settings).length) {
        return cb(setRequestUserSettings(req, params));
    }
    if (!req.recursiveAttempt) {
        req.recursiveAttempt = 0;
    }
    if (req.recursiveAttempt++ === 5) {
        cb(new ServiceUnavailableException("Service unavailable"));
    }
    setTimeout(() => {
        setRequestUserSettingsCallback(req, params, cb);
    }, 500);
}

function setRequestUserSettings (req, params) {
    let { groupId, countryCode, extraGroupId, useMode } = params;
    if (!req.user) {
        req.user = {};
    }
    if (groupId) {
        req.user.group = getGroupsSettings(groupId);
    }
    let extraGroup = null;
    if (extraGroupId) {
        req.user.group = extraGroup = getGroupsSettings(extraGroupId);
    }
    if (countryCode) {
        req.user.country = getCountriesSettings(countryCode);
    }
    /* set group from country */
    if (!req.user.group && req.user.country) {
        let { groups } = req.user.country;
        req.user.group = groups[Object.keys(groups)[0]];
    }
    /* set default group */
    if (!req.user.group) {
        req.user.group = getGroupsSettings(process.env.GROUP_DEFAULT_ID);
    }
    /* set country */
    if (!req.user.country) {
        req.user.country = req.user.group && req.user.group.country
            ? req.user.group.country
            : getCountriesSettings(process.env.GROUP_DEFAULT_COUNTRY);
    }
    /* set group as main country first group */
    if (!extraGroup && req.user.country.mainCountry) {
        let { groups } = req.user.country.mainCountry;
        let group = groups[Object.keys(groups)[0]];
        if (group) {
            req.user.group = group;
        }
    }
    req.user.store = req.user.country.mainCountry
        ? req.user.country.mainCountry.store
        : req.user.country.store;
    req.user.groupId = req.user.group._id.toString();
    req.user.countryCode = req.user.country.name;
    req.user.useMode = useMode;
    if (req.user.countryCode.toLowerCase() === "default") {
        req.user.countryCode = req.user.country.mainCountry
            ? req.user.country.mainCountry.name
            : "";
    }
}

const auth = {
    freeAuth: (req, res, next) => {
        setRequestUserSettingsCallback(req, {
            groupId: req.query.groupId,
            extraGroupId: req.query.extraGroupId,
            countryCode: req.query.country,
            useMode: "anonymous"
        }, next);
    },

    userAuth: (req, res, next) => {
        if (!req.headers.authorization) {
            next(new UnauthorizedException("Unauthorized: No authorization header"));
            return;
        }
        const decode = tokenFunction.decodeToken(req.headers.authorization);
        if (!redisClient.connected) {
            auth.mongoAuth(decode.bearer, (err, result) => {
                if (err) return next(err);
                setRequestUserSettingsCallback(req, {
                    groupId: result.groupId,
                    extraGroupId: req.query.extraGroupId,
                    countryCode: result.country,
                    useMode: ((result.useMode || result.mode) && (result.useMode || result.mode)) || null
                }, next);
            });
            return;
        }
        async.series([
            callback => {
                auth.redisAuth(decode, err => err ? callback(null) : next());
            },
            callback => {
                auth.mongoAuth(decode.bearer, (err, result) => {
                    err ? callback(err, null) : callback(null, result);
                });
            }
        ], (err, result) => {
            if (err) return next(err);
            async.parallel([
                () => next(),
                () => {
                    tokenFunction.userToRedis(result[1], err => {
                        if (err) return winston.log("error", err);
                    });
                }
            ]);
        });
    },

    mongoAuth: (bearer, next) => {
        TokenModel.findOne({ bearer }, null, { lean: true })
            .then(document => {
                if (!document) {
                    return next(new UnauthorizedException("Wrong authorization"));
                }
                next(null, document);
            }, next);
    }
};

module.exports = auth;
