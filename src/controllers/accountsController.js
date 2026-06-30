const crypto = require("crypto");
const db = require("../database/db");
const pairingService = require("../services/pairingService");

const config = require("../config");

function getAllAccounts(req, res) {
    const accounts = db
        .prepare(`
            SELECT id, display_name, is_active, device_token
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

function createPairLink(req, res) {
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

    res.json({
        account_id: account.id,
        display_name: account.display_name,
        pair_url: `${serverUrl}/pair?token=${token}`
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

    res.json({
        account_id: account.id,
        display_name: account.display_name,
        device_token: deviceToken
    });
}

module.exports = {
    getAllAccounts,
    createAccount,
    createPairLink,
    pairDevice
};