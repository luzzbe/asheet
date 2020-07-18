const camelCase = require("camelcase");
const Project = require("../models/project");
const {
  getSpreadsheetTabs,
  getWorksheetContent,
  extractIdFromURI,
  formatData,
} = require("../spreadsheet");
const User = require("../models/user");
const { oauth2Client } = require("../google");

exports.project_list = async (req, res) => {
  const projects = await Project.find({ user: req.session.user._id });
  res.render("projects/list", { projects });
};

exports.project_detail = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  res.render("projects/view", { project });
};

exports.project_sync = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  project.endpoints = await getSpreadsheetTabs(project.spreadsheet);
  project.save();

  res.redirect("/projects/" + project._id);
};

exports.project_delete = async (req, res) => {
  await Project.findOneAndDelete({
    _id: req.params.id,
    user: req.session.user._id,
  });
  res.redirect("/projects");
};

exports.project_create_get = async (req, res) => {
  res.render("projects/create");
};

exports.project_create_post = async (req, res) => {
  const projectData = {
    name: req.body.name,
    spreadsheet: extractIdFromURI(req.body.url),
    user: req.session.user._id,
  };

  await Project.create(projectData);
  res.redirect("/projects");
};

exports.project_endpoint_get = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
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

    labels.forEach((label, index) => {
      row[camelCase(label)] = formatData(rowData[index]);
    });

    items.push(row);
  }

  res.json(items);
};
