const camelCase = require("camelcase");
const Project = require("./project");
const {
  getSpreadsheetTabs,
  getWorksheetContent,
  extractIdFromURI,
  formatData,
} = require("../spreadsheet");
const User = require("../user/user");
const { oauth2Client } = require("../google");
const getProjectHandle = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  res.render("projects/view", { project });
};

const syncProjectHandle = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect("/projects");
  }

  project.endpoints = await getSpreadsheetTabs(project.spreadsheet);
  project.save();

  res.redirect("/project/" + project._id);
};

const getProjectsHandle = async (req, res) => {
  const projects = await Project.find({ user: req.session.user._id });
  res.render("projects/list", { projects });
};

const deleteProjectHandle = async (req, res) => {
  await Project.findOneAndDelete({
    _id: req.params.id,
    user: req.session.user._id,
  });
  res.redirect("/projects");
};

const createProjectHandle = async (req, res) => {
  const projectData = {
    name: req.body.name,
    spreadsheet: extractIdFromURI(req.body.url),
    user: req.session.user._id,
  };

  const project = await Project.create(projectData);
  res.redirect("/projects");
};

const getProjectEndpointHandle = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.project,
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

  const items = [];

  if (worksheetData && worksheetData.length >= 2) {
    const labels = worksheetData[0];

    // Loop on data (without labels)
    for (let i = 1; i < worksheetData.length; i++) {
      const row = {};
      const rowData = worksheetData[i];

      labels.forEach((label, index) => {
        row[camelCase(label)] = formatData(rowData[index]);
      });

      items.push(row);
    }

    res.json(items);
  } else {
    res.json({
      error: "the table must contain at least 2 lines (header and contents)",
    });
  }
};

module.exports = {
  createProjectHandle,
  getProjectsHandle,
  deleteProjectHandle,
  getProjectHandle,
  syncProjectHandle,
  getProjectEndpointHandle,
};
