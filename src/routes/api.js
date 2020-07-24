const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const api_controller = require("../controllers/apiController");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
});

// Parse JSON request
router.use(bodyParser.json());
// Rate limiting
router.use(limiter);

router.get("/:projectId/:endpoint", api_controller.project_endpoint_get_all);
router.get(
  "/:projectId/:endpoint/:itemId",
  api_controller.project_endpoint_get
);
router.post("/:projectId/:endpoint", api_controller.project_endpoint_post);

module.exports = router;
