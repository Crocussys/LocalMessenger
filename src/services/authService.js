const db = require("../database/db");

function getAccountByDeviceToken(deviceToken) {
    if (!deviceToken) {
        return null;
    }

    return db
        .prepare(`
            SELECT id, display_name, is_active, is_certified
            FROM accounts
            WHERE device_token = ?
        `)
        .get(deviceToken);
}

function getCurrentAccount(req) {
    const deviceToken = req.get("X-Device-Token");
    return getAccountByDeviceToken(deviceToken);
}

module.exports = {
    getAccountByDeviceToken,
    getCurrentAccount
};