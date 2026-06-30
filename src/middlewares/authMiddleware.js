const authService = require("../services/authService");

function requireAuth(req, res, next) {
    const account = authService.getCurrentAccount(req);

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

    req.account = account;

    next();
}

module.exports = {
    requireAuth
};