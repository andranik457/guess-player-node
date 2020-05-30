
const { QuestionsModel }    = require("../models/defaults");
const ObjectId              = require('mongodb').ObjectID;

async function getQuestion (req) {
    const level = ''+ req.params.level || "1";

    let pastQuestions = JSON.parse(req.body.pastQuestions).map(questionId => ObjectId(questionId));

    console.log(pastQuestions);

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

    const possibleImagesCount = questionInfo[0].showImagesUrls.length;

    const imageIndex = await getRandomInt(possibleImagesCount);

    return {
        questionId: ''+ questionInfo[0]._id,
        questionImageUrl: questionInfo[0].showImagesUrls[imageIndex]
    };

}

async function checkAnswer (req) {
    const questionId = ObjectId(req.body.questionId);
    const answer = req.body.answer;

    const filter = {
        _id: questionId,
        showName: answer
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
    checkAnswer
};