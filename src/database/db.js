const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const databaseDir = path.join(__dirname, "..", "database");

if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir);
}

const dbPath = path.join(__dirname, "app.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        display_name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        device_token TEXT UNIQUE,
        is_certified INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dialogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('private', 'group'))
    );

    CREATE TABLE IF NOT EXISTS dialog_members (
        dialog_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        last_read_message_id INTEGER,

        PRIMARY KEY (dialog_id, account_id),

        FOREIGN KEY (dialog_id) REFERENCES dialogs(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dialog_id INTEGER NOT NULL,
        sender_account_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'file')),
        text TEXT,
        file_path TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (dialog_id) REFERENCES dialogs(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_dialog_id ON messages(dialog_id);
    CREATE INDEX IF NOT EXISTS idx_dialog_members_account_id ON dialog_members(account_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_device_token ON accounts(device_token);
`);

module.exports = db;