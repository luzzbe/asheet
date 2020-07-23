const express = require("express");
const router = express.Router();
const project_controller = require("../controllers/projectController");
const { verify_login } = require("../controllers/userController");

// Website
router.get("/", verify_login, project_controller.project_list);
router.get("/create", verify_login, project_controller.project_create_get);
router.post("/create", verify_login, project_controller.project_create_post);
router.get("/:id", verify_login, project_controller.project_detail);
router.get("/:id/sync", verify_login, project_controller.project_sync);
router.get("/:id/delete", verify_login, project_controller.project_delete);

module.exports = router;
