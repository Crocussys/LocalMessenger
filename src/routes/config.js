const express = require("express");
const configController = require("../controllers/configController");

const router = express.Router();

router.get("/", configController.getClientConfig);

module.exports = router;