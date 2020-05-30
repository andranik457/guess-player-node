
const winston = require("winston");
const mongoose = require("mongoose");
const { $set } = require("../variables");
mongoose.Promise = Promise;
const connections = {};

const statuses = {};
const isConnectionsEstablished = () =>
    statuses.DB1 &&
    statuses.BUCKET;

const changeConnectionStatus = (name, status = true) => {
    const connectionsStatusBeforeChanges = isConnectionsEstablished();
    statuses[name] = status;
    const connectionsStatusAfterChanges = isConnectionsEstablished();
    if (connectionsStatusAfterChanges === connectionsStatusBeforeChanges) return;
    $set("MongodbConnectionsStatus", connectionsStatusAfterChanges ? "connected" : "disconnected");
};

const createConfiguration = (name) => {
    const url = process.env[`MONGO_${name}_HOST`];
    const options = {
        useNewUrlParser: process.env[`MONGO_${name}_USE_NEW_URL_PARSER`] || true,
        autoReconnect: process.env[`MONGO_${name}_AUTO_RECONNECT`] || false,
        bufferMaxEntries: parseInt(process.env[`MONGO_${name}_BUFFER_MAX_ENTRIES`] || 0),
        bufferCommands: process.env[`MONGO_${name}_BUFFER_COMMAND`] || false,
        connectTimeoutMS: parseInt(process.env[`MONGO_${name}_CONNECTION_TIMEOUT_MS`] || 20000),
        poolSize: parseInt(process.env[`MONGO_${name}_POOL_SIZE`] || 50),
        useUnifiedTopology: true
    };
    if (process.env[`MONGO_${name}_REPLICA_SET`]) {
        options.replicaSet = process.env[`MONGO_${name}_REPLICA_SET`];
        options.readPreference = process.env[`MONGO_${name}_READ_PREFERENCE`] || "secondaryPreferred";
    }
    return { url, options };
};

const createConnection = (name) => {
    const { url, options } = createConfiguration(name);
    connections[name] = mongoose.createConnection(url, options);
    connections[name].on("disconnected", (e) => {
        changeConnectionStatus(name, false);
        winston.log("error", "Reconnecting to " + url);
        setTimeout(() => { createConnection(name); }, 5000);
    });
    connections[name].on("error", (e) => {
        winston.log("error", e);
    });
    connections[name].on("open", () => {
        changeConnectionStatus(name, true);
        winston.log("info", `Connected to MongoDB ${name} ` + url);
    });
    return connections[name];
};

/*
* DB Main Configuration
* */
const db1Configuration = createConfiguration("GUESS_PLAYER");
mongoose.connect(db1Configuration.url, db1Configuration.options);
mongoose.connection.on("disconnected", (e) => {
    changeConnectionStatus("GUESS_PLAYER", false);
    winston.log("error", "Reconnecting to " + db1Configuration.url);
    setTimeout(() => {
        mongoose.connect(db1Configuration.url, db1Configuration.options);
    }, 5000);
});
mongoose.connection.on("open", (e) => {
    changeConnectionStatus("GUESS_PLAYER", true);
    winston.log("info", "Connected to MongoDB DB1 " + db1Configuration.url);
});

mongoose.connection.on("error", (err) => {
    winston.log("info", err);
});

/*
* Other Connections
* */
const connBase = mongoose.connection;
const connBaseMaster = createConnection("GUESS_PLAYER");

module.exports = {
    connBase,
    connBaseMaster
};
