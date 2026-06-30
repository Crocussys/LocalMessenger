const db = require("../database/db");

function getMe(req, res) {
    const deviceToken = req.get("X-Device-Token");

    if (!deviceToken) {
        return res.status(401).json({
            error: "Устройство не привязано"
        });
    }

    const account = db
        .prepare(`
            SELECT id, display_name, is_active
            FROM accounts
            WHERE device_token = ?
        `)
        .get(deviceToken);

    if (!account) {
        return res.status(401).json({
            error: "Устройство не привязано"
        });
    }

    if (!account.is_active) {
        return res.status(403).json({
            error: "Аккаунт отключён"
        });
    }

    res.json(account);
}

module.exports = {
    getMe
};