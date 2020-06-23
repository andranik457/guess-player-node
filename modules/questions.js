
const { QuestionsModel }    = require("../models/defaults");
const ObjectId              = require('mongodb').ObjectID;

/**
 *
 * @param req
 * @returns {Promise<*>}
 */
async function getQuestion (req) {
    const level = ''+ req.params.level || "1";

    let pastQuestions = JSON.parse(req.body.pastQuestions).map(questionId => ObjectId(questionId));

    let filter = [
        {
            $match: {
                _id: { $nin: pastQuestions},
                level: level
            }
        },
        { $sample: { size: 1 } }
    ];

    const questionInfo = await QuestionsModel.aggregate(filter);

    if (questionInfo.length === 0) {
        return null;
    }

    let possibleHintsCount = 0;

    let shapes = questionInfo[0]['shapes'];

    let item = shapes[Math.floor(Math.random() * shapes.length)];

    let selectedShape = item.type;

    let questionShapeInfo = {};
    shapes.forEach(shape => {
        if (selectedShape === shape['type']) {
            possibleHintsCount++;

            if (questionShapeInfo['level'] === undefined || shape['level'] > questionShapeInfo['level']) {
                questionShapeInfo = {
                    level: shape['level'],
                    imageUrl: shape['imageUrl']
                };
            }
        }
    });

    return {
        questionId:         ''+ questionInfo[0]._id,
        shape:              selectedShape,
        questionImageUrl:   questionShapeInfo['imageUrl'],
        possibleHintsCount: possibleHintsCount - 1
    };

}

async function getHintTypeEasyImage(req) {
    const questionId            = req.params.questionId;
    const possibleHintsCount    = parseInt(req.params.possibleHintsCount);
    const selectedShape         = req.params.shape;

    let filter = { _id: ObjectId(questionId) };

    const questionInfo = await QuestionsModel.findOne(filter, null, {lean: true});
    const shapes = questionInfo['shapes'];

    let hintData = {};
    shapes.forEach(shape => {
        if (selectedShape === shape['type'] && possibleHintsCount === shape.level) {
            hintData = {
                imageUrl: shape['imageUrl']
            };
        }
    });

    return {
        imageUrl:           hintData.imageUrl,
        possibleHintsCount: possibleHintsCount - 1
    }
}

/**
 *
 * @param req
 * @returns {Promise<*>}
 */
async function checkAnswer (req) {
    const questionId = ObjectId(req.body.questionId);
    const answer = req.body.answer;

    const filter = {
        _id: questionId,
        name: answer
    };

    const questionData = await QuestionsModel.findOne(filter, null, {lean: true});

    if (questionData) {
        return {
            showName: questionData.showName,
            imageUrl: questionData.imageUrl
        }
    }

    return null;
}


async function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    getQuestion,
    checkAnswer,
    getHintTypeEasyImage
};