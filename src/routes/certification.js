const express = require("express");
const certificationController = require("../controllers/certificationController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/confirm", certificationController.confirmCertification);
router.post("/link", requireAuth, certificationController.createCertificationLink);

module.exports = router;