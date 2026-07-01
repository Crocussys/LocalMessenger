const db = require("../database/db");
const certificationTokenService = require("../services/certificationTokenService");

function confirmCertification(req, res) {
    if (!req.secure) {
        return res.status(400).json({
            error: "Сертификацию можно подтвердить только через HTTPS"
        });
    }

    const token = req.body.token?.trim();

    if (!token) {
        return res.status(400).json({
            error: "Токен не указан"
        });
    }

    const tokenData = certificationTokenService.consumeCertificationToken(token);

    if (!tokenData) {
        return res.status(400).json({
            error: "Токен недействителен или истёк"
        });
    }

    const account = db.prepare(`
        SELECT id, display_name, device_token
        FROM accounts
        WHERE id = ?
    `).get(tokenData.accountId);

    if (!account) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    db.prepare(`
        UPDATE accounts
        SET is_certified = 1
        WHERE id = ?
    `).run(account.id);

    res.json({
        ok: true,
        account_id: account.id,
        display_name: account.display_name,
        device_token: account.device_token
    });
}

module.exports = {
    confirmCertification
};