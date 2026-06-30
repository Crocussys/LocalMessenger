const express = require("express");
const accountsController = require("../controllers/accountsController");

const router = express.Router();

router.get("/", accountsController.getAllAccounts);
router.post("/", accountsController.createAccount);
router.post("/:id/pair-link", accountsController.createPairLink);
router.post("/pair", accountsController.pairDevice);

module.exports = router;