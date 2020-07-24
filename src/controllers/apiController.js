const asyncHandler = require("express-async-handler");
const cache = require("memory-cache");
const camelCase = require("camelcase");
const Project = require("../models/project");
const User = require("../models/user");
const { oauth2Client } = require("../services/google");
const {
  getWorksheetContent,
  appendWorksheet,
} = require("../services/spreadsheet");

exports.project_endpoint_get_all = asyncHandler(async (req, res) => {
  if (cache.get(req.path)) {
    return res.json(cache.get(req.path));
  }

  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  const user = await User.findById(project.user);

  user.remainingRequests--;
  user.save();

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
    return res.status(404).json({
      success: false,
      message: "the endpoint you requested does not exist",
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
      success: false,
      message:
        "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize",
    });
  }

  if (!worksheetData || worksheetData.length < 2) {
    res.json({
      success: false,
      message: "the table must contain at least 2 lines (header and contents)",
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

  const response = {
    success: true,
    data: items,
    info: { remainingRequests: user.remainingRequests },
  };

  cache.put(req.path, response, 5000);

  res.json(response);
});

exports.project_endpoint_get = asyncHandler(async (req, res) => {
  if (cache.get(req.path)) {
    return res.json(ache.get(req.path));
  }

  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  const user = await User.findById(project.user);

  user.remainingRequests--;
  user.save();

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
      success: false,
      message: "the endpoint you requested does not exist",
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
      success: false,
      message:
        "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize",
    });
  }

  if (!worksheetData || worksheetData.length < 2) {
    res.json({
      success: false,
      message: "the table must contain at least 2 lines (header and contents)",
    });
  }

  const item = {};
  const labels = worksheetData[0];
  worksheetData.shift(); // Remove labels from table
  const itemId = parseInt(req.params.itemId);

  if (itemId < 2) {
    return res.status(404).json({
      success: false,
      message: "record not found",
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

  const response = {
    success: true,
    data: item,
    info: { remainingRequests: user.remainingRequests },
  };

  cache.put(req.path, response, 5000);

  res.json(response);
});

exports.project_endpoint_post = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  const user = await User.findById(project.user);

  user.remainingRequests--;
  user.save();

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
      success: false,
      message: "the endpoint you requested does not exist",
    });
  }

  let data = [];

  await appendWorksheet(project.spreadsheet, endpoint.name, data);
  res.json(req.body);
});
