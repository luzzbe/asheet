const express = require("express");

const router = express.Router();
const projectController = require("../controllers/projectController");
const { verifyLogin } = require("../controllers/userController");

router.get("/", verifyLogin, projectController.projectList);
router.get("/create", verifyLogin, projectController.projectCreateGet);
router.post("/create", verifyLogin, projectController.projectCreatePost);
router.get("/:projectId", verifyLogin, projectController.projectDetail);
router.get("/:projectId/sync", verifyLogin, projectController.projectSync);
router.post(
  "/:projectId/:endpointName/update",
  verifyLogin,
  projectController.projectEndpointUpdatePost
);
router.get("/:projectId/delete", verifyLogin, projectController.projectDelete);
router.get(
  "/:projectId/toggleProtect",
  verifyLogin,
  projectController.projectToggleProtect
);

module.exports = router;
