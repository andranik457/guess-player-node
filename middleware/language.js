
module.exports = {
    parseAcceptLanguage (arg) {
        return (req, res, next) => {
            const accept = arg.acceptLanguageCodes;
            const acceptLanguage = req.headers["accept-language"];
            const defaultLanguage = { code: "en", region: "US", quality: 1 };
            if (!acceptLanguage) {
                req.language = defaultLanguage;
                return next();
            }
            let languages = [];
            acceptLanguage.split(",").forEach(chunk => {
                let splitted = chunk.split(";q=");
                let language = splitted[0].trim().split("-");
                let quality = splitted[1] ? (splitted[1].trim() || 1) : 1;
                languages.push({
                    code: language[0],
                    region: language[1] || "",
                    quality: parseFloat(quality)
                });
            });
            // Filter give accept
            languages = languages.filter(item => accept.includes(item.code));
            // find max
            let maxQuality = Math.max.apply(null, languages.map(i => i.quality));
            let language = defaultLanguage;
            languages.forEach(item => {
                if (item.quality === maxQuality) {
                    language = item;
                }
            });
            req.language = language;
            next();
        };
    }
};
