const db = require("../database/db");

function openPrivateDialog(req, res) {
    const currentAccount = req.account;

    const targetAccountId = Number(req.body.target_account_id);

    if (!targetAccountId) {
        return res.status(400).json({
            error: "Не указан аккаунт собеседника"
        });
    }

    if (targetAccountId === currentAccount.id) {
        return res.status(400).json({
            error: "Нельзя создать диалог с самим собой"
        });
    }

    const targetAccount = db
        .prepare(`
            SELECT id, display_name, is_active
            FROM accounts
            WHERE id = ?
        `)
        .get(targetAccountId);

    if (!targetAccount || !targetAccount.is_active) {
        return res.status(404).json({
            error: "Собеседник не найден"
        });
    }

    const existingDialog = db
        .prepare(`
            SELECT d.id
            FROM dialogs d
            JOIN dialog_members dm1 ON dm1.dialog_id = d.id
            JOIN dialog_members dm2 ON dm2.dialog_id = d.id
            WHERE d.type = 'private'
              AND dm1.account_id = ?
              AND dm2.account_id = ?
            LIMIT 1
        `)
        .get(currentAccount.id, targetAccount.id);

    if (existingDialog) {
        return res.json({
            dialog_id: existingDialog.id,
            companion: {
                id: targetAccount.id,
                display_name: targetAccount.display_name
            }
        });
    }

    const transaction = db.transaction(() => {
        const dialogResult = db
            .prepare(`
                INSERT INTO dialogs (type)
                VALUES ('private')
            `)
            .run();

        const dialogId = dialogResult.lastInsertRowid;

        const insertMember = db.prepare(`
            INSERT INTO dialog_members (dialog_id, account_id)
            VALUES (?, ?)
        `);

        insertMember.run(dialogId, currentAccount.id);
        insertMember.run(dialogId, targetAccount.id);

        return dialogId;
    });

    const dialogId = transaction();

    res.status(201).json({
        dialog_id: dialogId,
        companion: {
            id: targetAccount.id,
            display_name: targetAccount.display_name
        }
    });
}

function getMyDialogs(req, res) {
    const dialogs = db
        .prepare(`
            SELECT
                d.id,
                d.type,
                companion.id AS companion_id,
                companion.display_name AS title,

                last_message.id AS last_message_id,
                last_message.type AS last_message_type,
                last_message.text AS last_message_text,
                last_message.created_at AS last_message_created_at,

                me.last_read_message_id,

                (
                    SELECT COUNT(*)
                    FROM messages unread
                    WHERE unread.dialog_id = d.id
                      AND unread.sender_account_id != ?
                      AND (
                          me.last_read_message_id IS NULL
                          OR unread.id > me.last_read_message_id
                      )
                ) AS unread_count

            FROM dialogs d

            JOIN dialog_members me
                ON me.dialog_id = d.id
                AND me.account_id = ?

            LEFT JOIN dialog_members other_member
                ON other_member.dialog_id = d.id
                AND other_member.account_id != ?

            LEFT JOIN accounts companion
                ON companion.id = other_member.account_id

            LEFT JOIN messages last_message
                ON last_message.id = (
                    SELECT m.id
                    FROM messages m
                    WHERE m.dialog_id = d.id
                    ORDER BY m.id DESC
                    LIMIT 1
                )

            ORDER BY
                last_message.id DESC,
                d.id DESC
        `)
        .all(req.account.id, req.account.id, req.account.id);

    res.json(dialogs);
}

module.exports = {
    openPrivateDialog,
    getMyDialogs
};