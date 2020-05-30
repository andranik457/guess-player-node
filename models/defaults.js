
/* Module dependencies */

let { connBase, connBaseMaster } = require("../connections/mongo");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/* Default Schema */
const defaultSchema = new Schema({}, {
    versionKey: false,
    strict: false
});

/* Mongo Models */
const QuestionsModel = connBaseMaster.model("questions", defaultSchema);

module.exports = {
    QuestionsModel
};
