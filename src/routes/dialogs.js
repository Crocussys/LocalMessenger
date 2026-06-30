const express = require("express");
const dialogsController = require("../controllers/dialogsController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, dialogsController.getMyDialogs);
router.post("/private", requireAuth, dialogsController.openPrivateDialog);

module.exports = router;