const mongoose = require("mongoose");
const winston = require("winston");
const { connBase } = require("../connections/mongo");
const { $get } = require("../variables.js");

const {
    AppSettingsModel,
    AdsModel,
    SystemSettingsModel,
    LicensorsSettingsModel,
    YTRefusedArtistsSettingsModel,
    YTRefusedLicensorsSettingsModel,
    refusedArtistsSettingsModel,
    refusedTracksSettingsModel,
    CountriesModel,
    GroupsModel,
    AdsQueuesSettingsModel,
    AdsMainSettingsModel,
    AdsContainersSettingsModel,
    CustomAdsSettingsModel
} = require("../models/defaults");
const { $set } = require("../variables");

let countriesSettings = {};
let groupsSettings = {};
let globalSettings = {};
let updateInterval = process.env.NODE_ENV === "DEVELOPMENT"
    ? 60000 : 60000 * 5;

winston.log("info", `Set up global settings update interval ${updateInterval / 60000} minutes`);

async function getCountries (force = false) {
    if (!force && globalSettings.countries) {
        return globalSettings.countries;
    }
    let list = await CountriesModel.find({ enabledStatus: true }, {
        _id: true,
        name: true,
        displayName: true,
        mainCountry: true,
        groupId: true,
        store: true
    }, {
        lean: true
    });

    return (globalSettings.countries = list);
}

async function getGroups (force = false) {
    if (!force && globalSettings.groups) {
        return globalSettings.groups;
    }
    let list = await GroupsModel.find({}, {
        _id: true,
        settings: true,
        countryId: true,
        pages: true
    }, {
        lean: true
    });
    return (globalSettings.groups = list);
}

async function getAppSettings (force = false) {
    if (!force && globalSettings.appSettings) {
        return globalSettings.appSettings;
    }
    let list = await AppSettingsModel.find({}, {
        _id: true,
        settings: true,
        name: true
    }, {
        lean: true
    });
    return (globalSettings.appSettings = list);
}

async function getSystemSettings (force = false) {
    if (!force && globalSettings.systemSettings) {
        return globalSettings.systemSettings;
    }
    let list = await SystemSettingsModel.find({}, {
        _id: true,
        settings: true,
        name: true
    }, {
        lean: true
    });
    return (globalSettings.systemSettings = list);
}

async function getOfflineSettings (force = false) {
    if (!force && globalSettings.offlineSettings) {
        return globalSettings.offlineSettings;
    }
    let list = await AdsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.offlineSettings = list);
}

async function getAdQueueSettingiOS (force = false) {
    if (!force && globalSettings.adQueueSetting_iOS) {
        return globalSettings.adQueueSetting_iOS;
    }
    let list = await AdsQueuesSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adQueueSetting_iOS = list);
}

async function getAdQueueSettingAndroid (force = false) {
    if (!force && globalSettings.adQueueSetting_Android) {
        return globalSettings.adQueueSetting_Android;
    }
    let list = await AdsQueuesSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adQueueSetting_Android = list);
}
async function getAdContainerSettingiOS (force = false) {
    if (!force && globalSettings.adContainerSetting_iOS) {
        return globalSettings.adContainerSetting_iOS;
    }
    let list = await AdsContainersSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adContainerSetting_iOS = list);
}

async function getAdContainerSettingAndroid (force = false) {
    if (!force && globalSettings.adContainerSetting_Android) {
        return globalSettings.adContainerSetting_Android;
    }
    let list = await AdsContainersSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adContainerSetting_Android = list);
}

async function getAdMainSettingiOS (force = false) {
    if (!force && globalSettings.adMainSetting_iOS) {
        return globalSettings.adMainSetting_iOS;
    }
    let list = await AdsMainSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adMainSetting_iOS = list);
}

async function getAdMainSettingAndroid (force = false) {
    if (!force && globalSettings.adMainSetting_Android) {
        return globalSettings.adMainSetting_Android;
    }
    let list = await AdsMainSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.adMainSetting_Android = list);
}

async function getCustomAdsSettings (force = false) {
    if (!force && globalSettings.customAdsSettings) {
        return globalSettings.customAdsSettings;
    }
    let list = await CustomAdsSettingsModel.find({}, {
        _id: true,
        updated_at: true
    }, {
        lean: true
    });
    return (globalSettings.customAdsSettings = list);
}

async function getLicensorsSettings (force = false) {
    if (!force && globalSettings.licensorsSetting) {
        return globalSettings.licensorsSetting;
    }
    let list = await LicensorsSettingsModel.find({}, {
        _id: true,
        settings: true
    }, {
        lean: true
    });
    list.forEach(item => {
        let _settings = {};
        let keys = Object.keys(item.settings);
        keys.forEach((key) => {
            if (item.settings[key].value) {
                _settings[key] = item.settings[key];
            }
        });
        item.settings = _settings;
    });
    return (globalSettings.licensorsSetting = list);
}

async function getYtRefusedLicensorsSettings (force = false) {
    if (!force && globalSettings.ytRefusedLicensorsSetting) {
        return globalSettings.ytRefusedLicensorsSetting;
    }
    let list = await YTRefusedLicensorsSettingsModel.find({}, {
        _id: true,
        settings: true
    }, {
        lean: true
    });
    list.forEach(item => {
        let _settings = {};
        let keys = Object.keys(item.settings);
        keys.forEach((key, value) => {
            if (item.settings[key].value) {
                _settings[key] = item.settings[key];
            }
        });
        item.settings = _settings;
    });
    return (globalSettings.ytRefusedLicensorsSetting = list);
}

async function getRefusedArtistsSettings (force = false) {
    if (!force && globalSettings.refusedArtistsSetting) {
        return globalSettings.refusedArtistsSetting;
    }
    let list = await refusedArtistsSettingsModel.find({}, {
        _id: true,
        artists: true
    }, {
        lean: true
    });
    list.forEach(item => {
        const artistsMap = {};
        if (item.artists) {
            const keys = Object.keys(item.artists);
            keys.forEach((key, value) => {
                artistsMap[key] = true;
            });
        }
        item.artists = artistsMap;
    });
    return (globalSettings.refusedArtistsSetting = list);
}

async function getRefusedTracksSettings (force = false) {
    if (!force && globalSettings.refusedTracksSetting) {
        return globalSettings.refusedTracksSetting;
    }
    const result = await refusedTracksSettingsModel.find(
        { },
        { _id: true, tracks: true },
        { lean: true });

    return (globalSettings.refusedTracksSetting = result.map(item => {
        const tracksMap = {};
        if (item.tracks) {
            const isrcs = Object.keys(item.tracks);
            isrcs.forEach((isrc, value) => {
                tracksMap[isrc] = true;
            });
        }
        return {
            _id: item._id,
            tracks: tracksMap
        };
    }));
}

async function getYtRefusedArtistsSettings (force = false) {
    if (!force && globalSettings.ytRefusedArtistsSetting) {
        return globalSettings.ytRefusedArtistsSetting;
    }
    let list = await YTRefusedArtistsSettingsModel.find({}, {
        _id: true,
        artists: true
    }, {
        lean: true
    });

    list.forEach(item => {
        let _artists = {};
        if (item.artists) {
            let keys = Object.keys(item.artists);
            keys.forEach((key, value) => {
                _artists[key] = value;
            });
        }
        item.artists = _artists;
    });
    globalSettings.ytRefusedArtistsSetting = list;
    return globalSettings.ytRefusedArtistsSetting;
}

function getGroupsSettings (groupId = null) {
    return groupId ? groupsSettings[groupId] : groupsSettings;
}

function getCountriesSettings (countryCode = null) {
    return countryCode ? countriesSettings[countryCode] : countriesSettings;
}

async function setGroupsSettings () {
    let groups = await getGroups();
    let appSettings = await getAppSettings();
    let systemSettings = await getSystemSettings();
    let offlineSettings = await getOfflineSettings();
    let licensorSettings = await getLicensorsSettings();
    let ytRefusedLicensorsSettings = await getYtRefusedLicensorsSettings();
    let refusedArtistsSettings = await getRefusedArtistsSettings();
    let refusedTracksSettings = await getRefusedTracksSettings();
    let ytRefusedArtistsSettings = await getYtRefusedArtistsSettings();
    let adQueueSettingiOS = await getAdQueueSettingiOS();
    let adQueueSettingAndroid = await getAdQueueSettingAndroid();
    let adContainerSettingAndroid = await getAdContainerSettingAndroid();
    let adMainSettingAndroid = await getAdMainSettingAndroid();
    let adContainerSettingiOS = await getAdContainerSettingiOS();
    let adMainSettingiOS = await getAdMainSettingiOS();
    let customAdsSettings = await getCustomAdsSettings();

    let _i = (group, key) => group.settings[key]
        ? { _id: mongoose.Types.ObjectId(group.settings[key]) }
        : null;

    groups.forEach(group => {
        groupsSettings[group._id.toString()] = {
            _id: group._id,
            settings: {
                appSetting: appSettings.find(i => i._id.toString() === group.settings.appSettingId),
                systemSetting: systemSettings.find(i => i._id.toString() === group.settings.systemSettingId),
                licensorSetting: licensorSettings.find(i => i._id.toString() === group.settings.licensorsSettingId),
                ytRefusedLicensorsSetting: ytRefusedLicensorsSettings.find(i => i._id.toString() === group.settings.ytRefusedLicensorsSettingId),
                refusedArtistsSetting: refusedArtistsSettings.find(i => i._id.toString() === group.settings.refusedArtistsSettingId),
                refusedTracksSetting: refusedTracksSettings.find(i => i._id.toString() === group.settings.refusedTracksSettingId),
                ytRefusedArtistsSetting: ytRefusedArtistsSettings.find(i => i._id.toString() === group.settings.ytRefusedArtistsSettingId),
                sdkSetting_iOS: _i(group, "sdkSetting_iOS"),
                sdkSetting_Android: _i(group, "sdkSetting_Android"),
                blockedRoutesSetting: _i(group, "blockedRoutesSettingId"),
                offlineAdsSetting: offlineSettings.find(i => i._id.toString() === group.settings.offlineAdsSettingId),
                adQueueSetting_iOS: adQueueSettingiOS.find(i => i._id.toString() === group.settings.adQueueSetting_iOS),
                adQueueSetting_Android: adQueueSettingAndroid.find(i => i._id.toString() === group.settings.adQueueSetting_Android),
                adMainSetting_iOS: adMainSettingiOS.find(i => i._id.toString() === group.settings.adMainSetting_iOS),
                adMainSetting_Android: adMainSettingAndroid.find(i => i._id.toString() === group.settings.adMainSetting_Android),
                adFilterSetting_iOS: _i(group, "adFilterSetting_iOS"),
                adFilterSetting_Android: _i(group, "adFilterSetting_Android"),
                adContainerSetting_iOS: adContainerSettingiOS.find(i => i._id.toString() === group.settings.adContainerSetting_iOS),
                adContainerSetting_Android: adContainerSettingAndroid.find(i => i._id.toString() === group.settings.adContainerSetting_Android),
                brandedWalletSetting: _i(group, "brandedWalletSettingId"),
                dailyDropSetting: _i(group, "dailyDropSettingId"),
                customAdsSettings: customAdsSettings.find(i => i._id.toString() === group.settings.customAdsSettingId)
            },
            pages: group.pages // Deprecated
        };
    });
    return groupsSettings;
}

async function setCountriesSettings () {
    let groupSettings_ = getGroupsSettings();
    let countries = await getCountries();
    countries.forEach(country => {
        let displayName = country.name;
        countriesSettings[displayName] = country;
        countriesSettings[displayName].groups = {};

        country.groupId.forEach(groupId => {
            countriesSettings[displayName].groups[groupId] = groupSettings_[groupId];
            if (groupSettings_[groupId]) {
                groupSettings_[groupId].country = country;
            }
        });
    });

    countries.forEach(country => {
        if (country.mainCountry) {
            country.mainCountry = countriesSettings[country.mainCountry.name];
        }
    });
    return countriesSettings;
}

async function forceUpdate () {
    if ($get("MongodbConnectionsStatus") !== "connected") {
        setTimeout(() => forceUpdate(), 1000);
        return false;
    }

    await Promise.all([
        getCountries(true),
        getGroups(true),
        getAppSettings(true),
        getOfflineSettings(true),
        getAdQueueSettingiOS(true),
        getAdQueueSettingAndroid(true),
        getAdContainerSettingiOS(true),
        getAdContainerSettingAndroid(true),
        getAdMainSettingiOS(true),
        getAdMainSettingAndroid(true),
        getCustomAdsSettings(true),
        getSystemSettings(true),
        getLicensorsSettings(true),
        getYtRefusedLicensorsSettings(true),
        getRefusedArtistsSettings(true),
        getRefusedTracksSettings(true),
        getYtRefusedArtistsSettings(true),
        setGroupsSettings()
    ]);
    winston.log(
        "info",
        `Settings successfully updated after ${updateInterval / 60000} minutes`
    );
    $set("GlobalSettings", "loaded");
    await setCountriesSettings();
    return true;
}

setInterval(
    async () => await forceUpdate(),
    updateInterval
);

connBase.on("connected", async () => {
    await forceUpdate();
});

module.exports = {
    getGroupsSettings,
    getCountriesSettings
};
