const asyncHandler = require('express-async-handler');
const cache = require('memory-cache');
const camelCase = require('camelcase');
const Project = require('../models/project');
const User = require('../models/user');
const { oauth2Client } = require('../services/google');
const {
  getWorksheetContent,
  appendWorksheet,
} = require('../services/spreadsheet');

const error = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message,
  });
};

const validateInputData = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  if (!project) {
    return error(res, 404, 'the project you requested does not exist');
  }

  const user = await User.findById(project.user);

  if (user) {
    oauth2Client.setCredentials({
      access_token: user.acessToken,
      refresh_token: user.refreshToken,
    });
  }

  const endpoint = project.endpoints.find((ep) => ep.endpointName === req.params.endpointName);

  if (!endpoint) {
    return error(res, 404, 'the endpoint you requested does not exist');
  }

  return { user, project, endpoint };
};

// Retreive all items from a spreadsheet
exports.projectEndpointGetAll = asyncHandler(async (req, res) => {
  if (cache.get(req.path)) {
    return res.json(cache.get(req.path));
  }

  const { user, project, endpoint } = await validateInputData(req, res);

  user.remainingRequests -= 1;
  user.save();

  let worksheetData;
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.worksheetName,
    );
  } catch (e) {
    return error(
      res,
      400,
      'unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize',
    );
  }

  const items = [];

  for (let i = 0; i < worksheetData.length; i += 1) {
    const row = {};
    const rowData = worksheetData[i];

    row.id = i + 1;

    endpoint.schema.forEach((label, index) => {
      row[camelCase(label)] = rowData[index] || '';
    });

    items.push(row);
  }

  const response = {
    success: true,
    data: items,
    info: { remainingRequests: user.remainingRequests },
  };

  cache.put(req.path, response, 5000);

  return res.json(response);
});

// Retreive one item from a spreadsheet
exports.projectEndpointGet = asyncHandler(async (req, res) => {
  if (cache.get(req.path)) {
    return res.json(cache.get(req.path));
  }

  const { user, project, endpoint } = await validateInputData(req, res);

  user.remainingRequests -= 1;
  user.save();

  let worksheetData = [];
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.worksheetName,
    );
  } catch (e) {
    return error(
      res,
      500,
      'unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize',
    );
  }

  const item = {};
  const itemId = parseInt(req.params.itemId, 10);

  if (itemId <= 0) {
    return error(res, 400, 'invalid item id');
  }

  const rowData = worksheetData[itemId - 1] || null;

  if (!rowData) {
    return error(res, 404, 'record not found');
  }

  item.id = itemId;

  endpoint.schema.forEach((label, index) => {
    item[camelCase(label)] = rowData[index] || '';
  });

  const response = {
    success: true,
    data: item,
    info: { remainingRequests: user.remainingRequests },
  };

  cache.put(req.path, response, 5000);

  return res.json(response);
});

// Append data to a spreadsheet
exports.projectEndpointPost = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = await validateInputData(req, res);

  const reqData = req.body;
  const data = [];

  endpoint.schema.forEach((label) => {
    if (reqData[label]) {
      data.push(reqData[label]);
    } else {
      data.push('');
    }
  });

  try {
    // try to add new record to the table
    await appendWorksheet(project.spreadsheet, endpoint.worksheetName, data);
  } catch (e) {
    return error(
      res,
      500,
      'unable to update the table',
    );
  }

  user.remainingRequests -= 1;
  user.save();

  cache.del(req.path);

  return res.status(201).json({
    success: true,
    info: {
      remainingRequests: user.remainingRequests,
    },
  });
});
