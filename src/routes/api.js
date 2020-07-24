const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const apiController = require('../controllers/apiController');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
});

// Parse JSON request
router.use(bodyParser.json());
// Rate limiting
router.use(limiter);

router.get('/:projectId/:endpoint', apiController.projectEndpointGetAll);
router.get('/:projectId/:endpoint/:itemId', apiController.projectEndpointGet);
router.post('/:projectId/:endpoint', apiController.projectEndpointPost);

module.exports = router;
