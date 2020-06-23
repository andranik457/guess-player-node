
const router = require("express").Router();
const { expressWrapper } = require("../modules/helpers");
const { NotFoundException } = require("../modules/error");
const searchFunction = require("../modules/search");
const { getQuestion, checkAnswer, getHintTypeEasyImage } = require("../modules/questions");

const response = (res, next) => (err, result) => {
    if (err) return next(err);
    if (result) return res.send(result);
    next({ status: 500, message: "empty result" });
};

router.get("/search/suggest", (req, res, next) => {
    searchFunction.suggestPlayer(req, response(res, next));
});



router.post("/question/:level", expressWrapper(getQuestion));
router.post("/check/:answer", expressWrapper(checkAnswer));

router.get("/hint/easy-image/:questionId/:shape/:possibleHintsCount", expressWrapper(getHintTypeEasyImage));


/* 404 */
router.use((req, res, next) => {
    next(new NotFoundException("Invalid Path"), req, res);
});

module.exports = router;
