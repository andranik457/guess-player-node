
/**
 * Module dependencies
 */

const helperFunction = require("./helpers");
const jwt = require("jsonwebtoken");
const async = require("async");

const token = {

    /**
     * Decode JWT
     * @param {Object} auth
     * @returns {{bearer: *, userId: (*|tokenSchema.userId|{type, required}), ... }}
     */

    decodeToken: auth => {
        const token = auth.split(" ");
        const decoded = jwt.verify(token[1], process.env.JWT_SECRET);
        return {
            bearer: token[1],
            userId: decoded.userId
        };
    },

    /**
     * Create Token Mask To Store In Redis
     * @param {Object} info
     * @returns {string}
     */

    createTokenMask: info => {
        const tokenType = "bearer";
        const userId = info.userId || info.user.userId;
        return `${tokenType}:${userId}:${info.bearer}`;
    }

};

module.exports = token;
