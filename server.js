
const app = require("express")();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const morgan = require("morgan");
const winston = require("winston");
require("./modules/globals");
const bodyParser = require("body-parser");
const expressJwt = require("express-jwt");
const errorMiddleware = require("./middleware/error");
const authMiddlewares = require("./middleware/auth");
const makeLowerCase = require("./modules/helpers").makeReqVariablesLowercase;
const routes = require("./routes/routes");
const { parseAcceptLanguage } = require("./middleware/language");
const { $get } = require("./variables");

/* Express middleware */
app.use(parseAcceptLanguage({ acceptLanguageCodes: ["en", "es"] }));
app.use("/api", expressJwt({ secret: process.env.JWT_SECRET }));
app.use(bodyParser.urlencoded({ extended: false, type: "application/x-www-form-urlencoded" }));
app.use(bodyParser.text({ type: "application/x-www-form-urlencoded", limit: "6mb" }));
app.use(bodyParser.raw({ type: "image/*", limit: "6mb" }));
app.use(bodyParser.json({
    type: function (v) {
        if (v.headers["content-type"]) {
            if (v.headers["content-type"].match(/multipart\/form-data/)) {
                return false;
            }
        }
        return true;
    },
    limit: "6mb"
}));

// if (process.env.NODE_ENV === "DEVELOPMENT") {
    app.use(morgan("dev"));
// }

app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
    if (req.headers["access-control-request-headers"]) {
        res.header(
            "Access-Control-Allow-Headers",
            req.headers["access-control-request-headers"]
        );
    }
    return res.send();
}
next();
});
app.use((req, res, next) => {
    const os = req.headers["app-os"] &&
    req.headers["app-os"].match(/android/i)
        ? "Android" : "iOS";
const bn = req.headers["app-build-number"] &&
!isNaN(req.headers["app-build-nustatuasdsa/asdmber"])
    ? parseInt(req.headers["app-build-number"]) : 0;
req.device = { os, bn, is: (i) => os.toLowerCase() === i.toLowerCase() };
next();
});

// app.use("/search", authMiddlewares.freeAuth);
app.use("/backend/search", makeLowerCase);

/* Routes */
app.use("/backend/", routes);

/* Production Error Handler */
app.use(errorMiddleware);

/*
* App Connection
* */
const connect = (app) =>
process.env.NODE_ENV === "DEVELOPMENT" || (
    $get("MongodbConnectionsStatus") === "connected" &&
    $get("ElasticConnectionsStatus") === "connected" &&
    $get("GlobalSettings") === "loaded"
)
    ? app.listen(
    process.env.SERVER_PORT,
    process.env.SERVER_HOSTNAME,
    winston.log(
        "info", "Node.js server is running at " +
        `http://${process.env.SERVER_HOSTNAME}:${process.env.SERVER_PORT} ` +
        `in ${process.env.NODE_ENV} mode with process id ${process.pid}`
    )
    )
    : setTimeout(() => {
    winston.log("info", "Node.js server is trying to establish");
connect(app);
}, 4000);
connect(app);

process.on("uncaughtException", onTerminate("Unexpected Error"));
process.on("unhandledRejection", onTerminate("Unhandled Promise"));
process.on("SIGTERM", onTerminate("SIGTERM"));
process.on("SIGINT", onTerminate("SIGINT"));

process.on("beforeExit", (code) => {
    console.log("ProcessEnded - Process beforeExit event with code: ", code);
});
process.on("exit", (code) => {
    console.log("ProcessEnded - Process exit event with code: ", code);
});
process.on("warning", (warning) => {
    console.warn(warning.name);    // Print the warning name
console.warn(warning.message); // Print the warning message
console.warn(warning.stack);   // Print the stack trace
});

function onTerminate (name) {
    return (err, promise) => {
        console.log(`ProcessEnded ${name}`);
        if (err && err instanceof Error) {
            console.log(err.message, err.stack);
            console.log(promise);
        } else {
            console.log(err);
        }
        process.exit(1);
    };
}
