const camelCase = require("camelcase");
const asyncHandler = require("express-async-handler");
const Project = require("../models/project");
const {
  getSpreadsheetTabs,
  getWorksheetContent,
  extractIdFromURI,
} = require("../services/spreadsheet");
const User = require("../models/user");
const { oauth2Client } = require("../services/google");
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

exports.project_endpoint_get_all = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  const user = await User.findById(project.user);
  oauth2Client.setCredentials({
    access_token: user.acessToken,
    refresh_token: user.refreshToken,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  const endpoint = project.endpoints.find(
    (endpoint) => endpoint.slug === req.params.endpoint
  );

  if (!endpoint) {
    return res.json({
      error: "the endpoint you requested does not exist",
    });
  }

  let worksheetData;
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.name
    );
  } catch (e) {
    return res.json({
      error:
        "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize",
    });
  }

  if (!worksheetData || worksheetData.length < 2) {
    res.json({
      error: "the table must contain at least 2 lines (header and contents)",
    });
  }

  const items = [];
  const labels = worksheetData[0];

  for (let i = 1; i < worksheetData.length; i++) {
    const row = {};
    const rowData = worksheetData[i];

    row.id = i + 1;

    labels.forEach((label, index) => {
      row[camelCase(label)] = rowData[index] || "";
    });

    items.push(row);
  }

  res.json(items);
});

exports.project_endpoint_get = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  const user = await User.findById(project.user);
  oauth2Client.setCredentials({
    access_token: user.acessToken,
    refresh_token: user.refreshToken,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  const endpoint = project.endpoints.find(
    (endpoint) => endpoint.slug === req.params.endpoint
  );

  if (!endpoint) {
    return res.json({
      error: "the endpoint you requested does not exist",
    });
  }

  let worksheetData = [];
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.name
    );
  } catch (e) {
    return res.json({
      error:
        "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize",
    });
  }

  if (!worksheetData || worksheetData.length < 2) {
    res.json({
      error: "the table must contain at least 2 lines (header and contents)",
    });
  }

  const item = {};
  const labels = worksheetData[0];
  worksheetData.shift(); // Remove labels from table
  const itemId = parseInt(req.params.itemId);

  if (itemId < 2) {
    return res.status(404).json({
      error: "record not found",
    });
  }

  const rowData = worksheetData[itemId - 2] || null;

  if (!rowData) {
    return res.status(404).json({
      error: "record not found",
    });
  }

  item.id = itemId;

  labels.forEach((label, index) => {
    item[camelCase(label)] = rowData[index] || "";
  });

  res.json(item);
});
