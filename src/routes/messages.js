const express = require("express");
const messagesController = require("../controllers/messagesController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/dialogs/:id/messages", requireAuth, messagesController.getDialogMessages);
router.post("/dialogs/:id/messages", requireAuth, messagesController.createDialogMessage);

module.exports = router;