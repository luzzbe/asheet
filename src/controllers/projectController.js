const asyncHandler = require("express-async-handler");
const Project = require("../models/project");
const {
  getSpreadsheetTabs,
  extractIdFromURI,
} = require("../services/spreadsheet");

const { flash } = require("../services/flash");

exports.project_list = asyncHandler(async (req, res) => {
  const projects = await Project.find({ user: req.session.user._id });
  res.render("projects/list", {
    title: "Project list",
    projects,
  });
});

exports.project_detail = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  res.render("projects/view", {
    title: "Project details",
    project,
  });
});

exports.project_sync = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  project.endpoints = await getSpreadsheetTabs(project.spreadsheet);
  project.save();

  flash(req, "Project synced", "green");

  res.redirect("/projects/" + project._id);
});

exports.project_delete = asyncHandler(async (req, res) => {
  await Project.findOneAndDelete({
    _id: req.params.id,
    user: req.session.user._id,
  });
  flash(req, "Project deleted", "green");
  res.redirect("/projects");
});

exports.project_create_get = (req, res) => {
  res.render("projects/create", {
    title: "Create a project",
  });
};

exports.project_create_post = asyncHandler(async (req, res) => {
  const sheetId = extractIdFromURI(req.body.url);

  if (!sheetId) {
    flash(req, "Invalid Google Sheet URI", "red");
    return res.redirect("/projects/create");
  }

  const projectData = {
    name: req.body.name,
    spreadsheet: sheetId,
    user: req.session.user._id,
  };

  const project = await Project.create(projectData);

  flash(req, "Project created", "green");
  res.redirect("/projects/" + project._id);
});
