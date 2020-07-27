const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const apiController = require('../controllers/apiController');
const { verifyProject, verifyMethod } = require('../controllers/apiController');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
});

// Parse JSON request
router.use(bodyParser.json());
// Rate limiting
router.use(limiter);

router.get('/:projectId/:endpointName', verifyProject, verifyMethod, apiController.projectEndpointGetAll);
router.get('/:projectId/:endpointName/:itemId', verifyProject, verifyMethod, apiController.projectEndpointGet);
router.put('/:projectId/:endpointName/:itemId', verifyProject, verifyMethod, apiController.projectEndpointUpdate);
router.post('/:projectId/:endpointName', verifyProject, verifyMethod, apiController.projectEndpointPost);
router.delete('/:projectId/:endpointName/:itemId', verifyProject, verifyMethod, apiController.projectEndpointDelete);

module.exports = router;
