const express = require("express");
const router = express.Router();
const user_controller = require("../controllers/userController");

router.get("/google", user_controller.user_login);
router.get("/google/callback", user_controller.user_login_callback);
router.get("/logout", user_controller.user_logout);

module.exports = router;
