const express = require('express');

const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyLogin } = require('../controllers/userController');

router.get('/', verifyLogin, projectController.projectList);
router.get('/create', verifyLogin, projectController.projectCreateGet);
router.post('/create', verifyLogin, projectController.projectCreatePost);
router.get('/:id', verifyLogin, projectController.projectDetail);
router.get('/:id/sync', verifyLogin, projectController.projectSync);
router.get('/:id/delete', verifyLogin, projectController.projectDelete);

module.exports = router;
