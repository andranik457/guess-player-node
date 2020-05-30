
module.exports = function extraGroupMiddleware (req, res, next) {
    if (req.query && req.query.extraGroupId) {
        // splitting extra group
        const split = req.query.extraGroupId.split(":");
        const types = split.slice(1);
        const extraGroupId = split[0].toString();

        if (!extraGroupId.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i)) {
            delete req.query.extraGroupId;
            return next();
        }

        if (types.includes("ads") || !types.length) {
            if (
                req.originalUrl.match(/api\/settings\/adConfigurations/) ||
                req.originalUrl.match(/^\/mix\/v3\/ads\/.*/)
            ) {
                req.query.extraGroupId = extraGroupId;
                return next();
            }
        }
    }
    delete req.query.extraGroupId;
    return next();
};
