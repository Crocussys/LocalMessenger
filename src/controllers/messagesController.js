const db = require("../database/db");

function isDialogMember(dialogId, accountId) {
    const member = db
        .prepare(`
            SELECT 1
            FROM dialog_members
            WHERE dialog_id = ?
              AND account_id = ?
        `)
        .get(dialogId, accountId);

    return Boolean(member);
}

function getDialogMessages(req, res) {
    const dialogId = Number(req.params.id);

    if (!dialogId) {
        return res.status(400).json({
            error: "Некорректный ID диалога"
        });
    }

    if (!isDialogMember(dialogId, req.account.id)) {
        return res.status(403).json({
            error: "Нет доступа к этому диалогу"
        });
    }

    const messages = db
        .prepare(`
            SELECT
                m.id,
                m.dialog_id,
                m.sender_account_id,
                a.display_name AS sender_display_name,
                m.type,
                m.text,
                m.file_path,
                m.created_at
            FROM messages m
            JOIN accounts a ON a.id = m.sender_account_id
            WHERE m.dialog_id = ?
            ORDER BY m.id ASC
        `)
        .all(dialogId);

    res.json(messages);
}

function createDialogMessage(req, res) {
    const dialogId = Number(req.params.id);
    const text = req.body.text?.trim();

    if (!dialogId) {
        return res.status(400).json({
            error: "Некорректный ID диалога"
        });
    }

    if (!isDialogMember(dialogId, req.account.id)) {
        return res.status(403).json({
            error: "Нет доступа к этому диалогу"
        });
    }

    if (!text) {
        return res.status(400).json({
            error: "Сообщение пустое"
        });
    }

    const result = db
        .prepare(`
            INSERT INTO messages (
                dialog_id,
                sender_account_id,
                type,
                text
            )
            VALUES (?, ?, 'text', ?)
        `)
        .run(dialogId, req.account.id, text);

    const message = db
        .prepare(`
            SELECT
                m.id,
                m.dialog_id,
                m.sender_account_id,
                a.display_name AS sender_display_name,
                m.type,
                m.text,
                m.file_path,
                m.created_at
            FROM messages m
            JOIN accounts a ON a.id = m.sender_account_id
            WHERE m.id = ?
        `)
        .get(result.lastInsertRowid);

    const io = req.app.get("io");

    io.to(`dialog:${dialogId}`).emit("new-message", message);
    
    res.status(201).json(message);
}

function createVoiceMessage(req, res) {
    const dialogId = Number(req.params.id);

    if (!dialogId) {
        return res.status(400).json({
            error: "Некорректный ID диалога"
        });
    }

    if (!isDialogMember(dialogId, req.account.id)) {
        return res.status(403).json({
            error: "Нет доступа к этому диалогу"
        });
    }

    if (!req.file) {
        return res.status(400).json({
            error: "Файл голосового сообщения не найден"
        });
    }

    const filePath = `/uploads/voice/${req.file.filename}`;

    const result = db
        .prepare(`
            INSERT INTO messages (
                dialog_id,
                sender_account_id,
                type,
                file_path
            )
            VALUES (?, ?, 'voice', ?)
        `)
        .run(dialogId, req.account.id, filePath);

    const message = db
        .prepare(`
            SELECT
                m.id,
                m.dialog_id,
                m.sender_account_id,
                a.display_name AS sender_display_name,
                m.type,
                m.text,
                m.file_path,
                m.created_at
            FROM messages m
            JOIN accounts a ON a.id = m.sender_account_id
            WHERE m.id = ?
        `)
        .get(result.lastInsertRowid);

    const io = req.app.get("io");
    io.to(`dialog:${dialogId}`).emit("new-message", message);

    res.status(201).json(message);
}

module.exports = {
    getDialogMessages,
    createDialogMessage,
    createVoiceMessage
};