
const ES = require("elasticsearch");
const winston = require("winston");
const { $set } = require("../variables");

const defaultConfigs = {
    requestTimeout: 4000
};

const elasticGuessPlayerClient = new ES.Client({
    hosts: process.env.ELASTIC_GUESS_PLAYER_HOST.split(",")
        .map(host => process.env.ELASTIC_GUESS_PLAYER_USERNAME
            ? process.env.ELASTIC_GUESS_PLAYER_USERNAME + ':' + process.env.ELASTIC_GUESS_PLAYER_PASSWORD + '@' + host
            : host),
    ...defaultConfigs
});

const statuses = {};
const isConnectionsEstablished = () =>
    statuses.GUESS_PLAYER;

/*
* App Connection
* */
const connect = (name, connection) => {
    /* check ES Connection */
    connection.ping({ requestTimeout: 10000 }, err => {
        if (err) {
            if (process.env.NODE_ENV === "DEVELOPMENT") { return; }
            setTimeout(() => connect(name, connection), 5000);
            return winston.log("error", err);
        }
        // eslint-disable-next-line security/detect-object-injection
        statuses[name] = true;
        $set("ElasticConnectionsStatus", isConnectionsEstablished() ? "connected" : "connecting");
        winston.log("info", `Connected to ${name} elasticsearch by host ${process.env[`ELASTIC_${name}_HOST`]}`);
    });
};

connect("GUESS_PLAYER", elasticGuessPlayerClient);

module.exports = {
    elasticGuessPlayerConnection: {
        client: elasticGuessPlayerClient,
        index: process.env.ELASTIC_GUESS_PLAYER_INDEX,
    }
};
