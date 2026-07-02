const express = require("express");
const accountsController = require("../controllers/accountsController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", accountsController.getAllAccounts);
router.get("/available", requireAuth, accountsController.getAvailableAccounts);

router.post("/", accountsController.createAccount);
router.post("/pair", accountsController.pairDevice);

router.patch("/:id", accountsController.updateAccount);
router.post("/:id/pair-link", accountsController.createPairLink);
router.post("/:id/unpair", accountsController.unpairAccount);
router.post("/:id/reset-certification", accountsController.resetCertification);
router.delete("/:id", accountsController.deleteAccount);

module.exports = router;