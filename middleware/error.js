
const winston = require("winston");

module.exports = function errorMiddleware (err, req, res, next) {
    const exception = err.exception || "Default";

    /*
    * Account Status
    * */
    if (req.originalUrl.match(/^\/api\/users\/status/)) {
        if (typeof err === "object" && err.status === 401) {
            return res.json({
                status: "OK",
                result: {
                    accountStatus: "0",
                    message: {
                        title: "You have logged in from another device",
                        text: "Please log in again to activate device"
                    }
                }
            });
        }
    }

    /*
    * Duplicate Errors
    * */
    if (err.code && err.code.toString() === "11000") {
        err.status = 409;
    }

    /*
    * Log Output
    * */
    if ((typeof err !== "object") || !err.status || (err.status >= 500)) {
        winston.log("error", `${req.headers["front-request-id"]}: ${req.originalUrl} ${
            typeof err === "object" && err.stack ? err.stack : err
        }`);
    }

    res.status(err.status || 500);

    err.content
        ? res.json({ error: err.content || {}, exception })
        : res.json({ message: err.message, error: {}, exception });
};
