const multer = require("multer");
const path = require("path");
const fs = require("fs");

const voiceDir = path.join(__dirname, "..", "uploads", "voice");

if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, voiceDir);
    },

    filename(req, file, callback) {
        const ext = path.extname(file.originalname) || ".webm";
        const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
        callback(null, filename);
    }
});

const uploadVoice = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

module.exports = {
    uploadVoice
};