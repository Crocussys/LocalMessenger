const express = require("express");
const messagesController = require("../controllers/messagesController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { uploadVoice } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/dialogs/:id/messages", requireAuth, messagesController.getDialogMessages);
router.post("/dialogs/:id/messages", requireAuth, messagesController.createDialogMessage);
router.post("/dialogs/:id/voice", requireAuth, uploadVoice.single("voice"), messagesController.createVoiceMessage);
router.post("/dialogs/:id/read", requireAuth, messagesController.markDialogAsRead);

module.exports = router;