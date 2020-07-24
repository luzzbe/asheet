const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');

router.get('/google', userController.user_login);
router.get('/google/callback', userController.user_login_callback);
router.get('/logout', userController.user_logout);

module.exports = router;
