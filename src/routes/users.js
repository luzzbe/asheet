const express = require("express");

const router = express.Router();
const userController = require("../controllers/userController");

router.get("/google", userController.userLogin);
router.get("/google/callback", userController.userLoginCallback);
router.get("/logout", userController.userLogout);

module.exports = router;
