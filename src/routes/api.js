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

router.get('/:projectId/:endpointName', apiController.projectEndpointGetAll);
router.get('/:projectId/:endpointName/:itemId', apiController.projectEndpointGet);
router.post('/:projectId/:endpointName', apiController.projectEndpointPost);
router.delete('/:projectId/:endpointName/:itemId', apiController.projectEndpointDelete);

module.exports = router;
