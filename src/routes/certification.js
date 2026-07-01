const express = require("express");
const certificationController = require("../controllers/certificationController");

const router = express.Router();

router.post("/confirm", certificationController.confirmCertification);

module.exports = router;