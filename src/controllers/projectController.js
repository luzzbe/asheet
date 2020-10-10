const asyncHandler = require("express-async-handler");
const camelCase = require("camelcase");
const jwt = require("jsonwebtoken");
const Project = require("../models/project");
const {
  getSpreadsheetTabs,
  extractIdFromURI,
  getWorksheetLabels,
} = require("../services/spreadsheet");

const { flash } = require("../services/flash");

exports.projectList = asyncHandler(async (req, res) => {
  const projects = await Project.find({ user: req.session.user._id });
  return res.render("projects/list", {
    title: "Project list",
    projects,
  });
});

exports.projectDetail = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  return res.render("projects/view", {
    title: "Project details",
    project,
  });
});

exports.projectSync = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  // retreive worksheets from spreadsheet
  let worksheets = await getSpreadsheetTabs(project.spreadsheet);

  // retreive labels from worksheets
  const workPool = [];
  for (let i = 0; i < worksheets.length; i += 1) {
    workPool.push(getWorksheetLabels(project.spreadsheet, worksheets[i]));
  }

  // wait all responses from google
  let worksheetsLabels = await Promise.all(workPool);

  // remove worksheet whithout schema
  worksheets = worksheets.filter(
    (_, i) => worksheetsLabels[i] && worksheetsLabels[i].length > 0
  );

  // remove corresponding labels
  worksheetsLabels = worksheetsLabels.filter(
    (_, i) => worksheetsLabels[i] && worksheetsLabels[i].length > 0
  );

  // camelCase all labels
  worksheetsLabels = worksheetsLabels.map((w) => w.map((l) => camelCase(l)));

  // default settings
  const defaultSettings = {
    get: true,
    one: true,
    post: false,
    put: false,
    delete: false,
  };

  // map and add schema name and schema detail to each endpoint
  project.endpoints = worksheets.map((w, i) => {
    const previousSettings = project.endpoints
      ? project.endpoints[i].methods
      : {};
    return {
      worksheetName: w,
      endpointName: camelCase(w),
      schema: worksheetsLabels[i],
      methods: { ...defaultSettings, ...previousSettings },
    };
  });

  // save the project
  project.save();

  flash(req, "Project synced", "green");

  return res.redirect(`/projects/${project._id}`);
});

exports.projectToggleProtect = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  await project.updateOne({ isProtected: !project.isProtected });

  flash(req, "Project updated", "green");
  return res.redirect(`/projects/${project._id}`);
});

exports.projectCreateGet = (req, res) => {
  res.render("projects/create", {
    title: "Create a project",
  });
};

exports.projectDelete = asyncHandler(async (req, res) => {
  await Project.findOneAndDelete({
    _id: req.params.projectId,
    user: req.session.user._id,
  });
  flash(req, "Project deleted", "green");
  return res.redirect("/projects");
});

exports.projectCreateGet = (req, res) => {
  res.render("projects/create", {
    title: "Create a project",
  });
};

exports.projectCreatePost = asyncHandler(async (req, res) => {
  const sheetId = extractIdFromURI(req.body.url);

  if (!sheetId) {
    flash(req, "Invalid Google Sheet URI", "red");
    return res.redirect("/projects/create");
  }

  const projectData = {
    name: req.body.name,
    spreadsheet: sheetId,
    user: req.session.user._id,
    token: jwt.sign(
      { email: req.session.user.email },
      process.env.SESSION_SECRET
    ),
  };

  const project = await Project.create(projectData);

  flash(req, "Project created", "green");
  return res.redirect(`/projects/${project._id}`);
});

exports.projectEndpointUpdatePost = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  const endpoint = project.endpoints.find(
    (ep) => ep.endpointName === req.params.endpointName
  );

  if (!endpoint) {
    flash(req, "Invalid endpoint", "red");
    return res.redirect(`/projects/${project._id}`);
  }

  endpoint.methods = {
    get: !!req.body.get,
    one: !!req.body.one,
    post: !!req.body.post,
    put: !!req.body.put,
    delete: !!req.body.delete,
  };

  project.markModified("endpoints");

  project.save();

  flash(req, "Project updated", "green");

  return res.redirect(`/projects/${project._id}`);
});
