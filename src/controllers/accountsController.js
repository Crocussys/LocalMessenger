const crypto = require("crypto");
const db = require("../database/db");
const pairingService = require("../services/pairingService");
const { generateQrDataUrl } = require("../utils/qr");
const config = require("../config");
const certificationTokenService = require("../services/certificationTokenService");

function getAllAccounts(req, res) {
    const accounts = db
        .prepare(`
            SELECT id, display_name, is_active, device_token, is_certified
            FROM accounts
            ORDER BY id DESC
        `)
        .all();

    res.json(accounts);
}

function createAccount(req, res) {
    const displayName = req.body.display_name?.trim();

    if (!displayName) {
        return res.status(400).json({
            error: "Имя аккаунта не указано"
        });
    }

    const result = db
        .prepare(`
            INSERT INTO accounts (display_name)
            VALUES (?)
        `)
        .run(displayName);

    const account = db
        .prepare(`
            SELECT id, display_name, is_active, device_token
            FROM accounts
            WHERE id = ?
        `)
        .get(result.lastInsertRowid);

    res.status(201).json(account);
}

async function createPairLink(req, res) {
    const accountId = Number(req.params.id);

    const account = db
        .prepare(`
            SELECT id, display_name, is_active, device_token
            FROM accounts
            WHERE id = ?
        `)
        .get(accountId);

    if (!account) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    if (account.device_token) {
        return res.status(400).json({
            error: "К аккаунту уже привязано устройство"
        });
    }

    const token = pairingService.createPairLink(account.id);

    const serverUrl = `${req.protocol}://${req.get("host")}`;
    const pairUrl = `${serverUrl}/pair?token=${token}`;
    const qrDataUrl = await generateQrDataUrl(pairUrl);

    res.json({
        account_id: account.id,
        display_name: account.display_name,
        pair_url: pairUrl,
        qr_data_url: qrDataUrl
    });
}

function pairDevice(req, res) {
    const token = req.body.token?.trim();

    if (!token) {
        return res.status(400).json({
            error: "Токен не указан"
        });
    }

    const pairLink = pairingService.consumePairLink(token);

    if (!pairLink) {
        return res.status(400).json({
            error: "Ссылка привязки недействительна или истекла"
        });
    }

    const account = db
        .prepare(`
            SELECT id, display_name, device_token
            FROM accounts
            WHERE id = ?
        `)
        .get(pairLink.accountId);

    if (!account) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    if (account.device_token) {
        return res.status(400).json({
            error: "К аккаунту уже привязано устройство"
        });
    }

    const deviceToken = crypto.randomBytes(32).toString("hex");

    db.prepare(`
        UPDATE accounts
        SET device_token = ?
        WHERE id = ?
    `).run(deviceToken, account.id);

    const certificationToken = certificationTokenService.createCertificationToken(account.id);

    res.json({
        account_id: account.id,
        display_name: account.display_name,
        device_token: deviceToken,
        cert_url: `${config.getServerUrl()}/cert/rootCA.crt`,
        certify_url: `${config.getHttpsServerUrl()}/certify?token=${certificationToken}`
    });
}

function getAvailableAccounts(req, res) {
    const accounts = db
        .prepare(`
            SELECT
                a.id,
                a.display_name,
                d.id AS dialog_id
            FROM accounts a
            LEFT JOIN dialog_members dm_target
                ON dm_target.account_id = a.id
            LEFT JOIN dialog_members dm_current
                ON dm_current.dialog_id = dm_target.dialog_id
                AND dm_current.account_id = ?
            LEFT JOIN dialogs d
                ON d.id = dm_target.dialog_id
                AND d.type = 'private'
                AND dm_current.account_id IS NOT NULL
            WHERE a.is_active = 1
              AND a.id != ?
            GROUP BY a.id
            ORDER BY a.display_name
        `)
        .all(req.account.id, req.account.id);

    res.json(accounts.map((account) => ({
        id: account.id,
        display_name: account.display_name,
        has_dialog: Boolean(account.dialog_id),
        dialog_id: account.dialog_id
    })));
}

function updateAccount(req, res) {
    const accountId = Number(req.params.id);
    const displayName = req.body.display_name?.trim();
    const isActive = req.body.is_active;

    const account = db.prepare(`
        SELECT id
        FROM accounts
        WHERE id = ?
    `).get(accountId);

    if (!account) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    if (!displayName) {
        return res.status(400).json({
            error: "Имя аккаунта не указано"
        });
    }

    db.prepare(`
        UPDATE accounts
        SET display_name = ?,
            is_active = ?
        WHERE id = ?
    `).run(displayName, isActive ? 1 : 0, accountId);

    const updatedAccount = db.prepare(`
        SELECT id, display_name, is_active, device_token, is_certified
        FROM accounts
        WHERE id = ?
    `).get(accountId);

    res.json(updatedAccount);
}

function unpairAccount(req, res) {
    const accountId = Number(req.params.id);

    const result = db.prepare(`
        UPDATE accounts
        SET device_token = NULL,
            is_certified = 0
        WHERE id = ?
    `).run(accountId);

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    res.json({ ok: true });
}

function resetCertification(req, res) {
    const accountId = Number(req.params.id);

    const result = db.prepare(`
        UPDATE accounts
        SET is_certified = 0
        WHERE id = ?
    `).run(accountId);

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    res.json({ ok: true });
}

function deleteAccount(req, res) {
    const accountId = Number(req.params.id);

    const result = db.prepare(`
        DELETE FROM accounts
        WHERE id = ?
    `).run(accountId);

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Аккаунт не найден"
        });
    }

    res.json({ ok: true });
}

module.exports = {
    getAllAccounts,
    createAccount,
    createPairLink,
    pairDevice,
    getAvailableAccounts,
    updateAccount,
    unpairAccount,
    resetCertification,
    deleteAccount
};