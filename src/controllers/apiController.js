const asyncHandler = require("express-async-handler");
const camelCase = require("camelcase");
const Project = require("../models/project");
const User = require("../models/user");
const { oauth2Client } = require("../services/google");
const {
  getWorksheetContent,
  appendWorksheet,
  deleteColumnWorksheet,
  updateColumnWorksheet,
} = require("../services/spreadsheet");

const error = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message,
  });
};

const quotaInfo = (user) => {
  const nextDate = new Date(user.lastReset);
  nextDate.setDate(user.lastReset.getDate() + 1);

  return {
    dailyRequests: user.dailyRequests,
    remainingRequests: user.remainingRequests,
    lastReset: user.lastReset,
    nextReset: nextDate,
  };
};

exports.verifyProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
  });

  if (!project) {
    return error(res, 404, "the project you requested does not exist");
  }

  const user = await User.findById(project.user);

  if (user) {
    oauth2Client.setCredentials({
      access_token: user.acessToken,
      refresh_token: user.refreshToken,
    });
  }

  if (user.remainingRequests === 0) {
    return error(res, 429, "you don't have any more requests available");
  }

  // Verify if project is protected
  if (project.isProtected) {
    if (!req.headers.authorization) {
      return error(res, 401, "this api is protected, you must provide a token");
    }

    const header = req.headers.authorization;
    const token = header.split(" ")[1] || "";

    if (token !== project.token) {
      return error(res, 401, "the token you gave is invalid");
    }
  }

  const endpoint = project.endpoints.find(
    (ep) => ep.endpointName === req.params.endpointName
  );

  if (!endpoint) {
    return error(res, 404, "the endpoint you requested does not exist");
  }

  req.project = project;
  req.user = user;
  req.endpoint = endpoint;

  return next();
});

exports.verifyMethod = (req, res, next) => {
  switch (req.method) {
    case "GET":
      if (!req.endpoint.methods.get)
        return error(res, 400, "the GET method is disabled");
      break;
    case "POST":
      if (!req.endpoint.methods.post)
        return error(res, 400, "the GET (one) method is disabled");
      break;
    case "PUT":
      if (!req.endpoint.methods.put)
        return error(res, 400, "the PUT method is disabled");
      break;
    case "DELETE":
      if (!req.endpoint.methods.delete)
        return error(res, 400, "the DELETE method is disabled");
      break;

    default:
      return error(res, 400, "the method is not supported");
  }

  return next();
};

/**
 * @api {get} /:projectId/:endpointName GetAll
 * @apiDescription Retreive all records from a worksheet
 * @apiName GetAll
 * @apiGroup Endpoint
 *
 * @apiParam {String} projectId Project's unique ID.
 * @apiParam {String} endpointName Endpoint's name.
 *
 * @apiSuccess {Boolean} success Request status.
 * @apiSuccess {Object[]} data All records from worksheet.
 * @apiSuccess {Object} info Remaining requests's info.
 *
 * @apiExample {js} Javascript
 *     fetch("https://flasheet.co/api/5f817d32f8154a22b06a0477/busStops")
 *       .then((response) => {
 *          return response.json();
 *       })
 *       .then((data) => {
 *        console.log(data);
 *       });
 */
exports.projectEndpointGetAll = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = req;

  user.remainingRequests -= 1;
  user.save();

  let worksheetData;
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.worksheetName
    );
  } catch (e) {
    console.log(e);
    return error(
      res,
      400,
      "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize"
    );
  }

  const items = [];
  let id = 2;

  for (let i = 0; i < worksheetData.length; i += 1) {
    let row = {};
    const rowData = worksheetData[i];

    if (rowData.length > 0) {
      endpoint.schema.forEach((label, index) => {
        row[camelCase(label)] = rowData[index] || "";
      });

      if (row.id) {
        row.id = id;
      } else {
        row = { id, ...row };
      }

      items.push(row);
    }
    id += 1;
  }

  const response = {
    success: true,
    data: items,
    info: quotaInfo(user),
  };

  return res.json(response);
});

/**
 * @api {get} /:projectId/:endpointName/:id GetOne
 * @apiDescription Retreive one record from a worksheet
 * @apiName GetOne
 * @apiGroup Endpoint
 *
 * @apiParam {String} projectId Project's unique ID.
 * @apiParam {String} endpointName Endpoint's name.
 * @apiParam {Number} id Record's ID.
 *
 * @apiSuccess {Boolean} success Request status.
 * @apiSuccess {Object} data Record from worksheet.
 * @apiSuccess {Object} info Remaining requests's info.
 *
 * @apiExample {js} Javascript
 *     fetch("https://flasheet.co/api/5f817d32f8154a22b06a0477/busStops/1")
 *       .then((response) => {
 *          return response.json();
 *       })
 *       .then((data) => {
 *        console.log(data);
 *       });
 */
exports.projectEndpointGet = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = req;

  user.remainingRequests -= 1;
  user.save();

  let worksheetData = [];
  try {
    worksheetData = await getWorksheetContent(
      project.spreadsheet,
      endpoint.worksheetName
    );
  } catch (e) {
    return error(
      res,
      500,
      "unable to retrieve the contents of the table. If you have renamed the tab, please resynchronize"
    );
  }

  let item = {};
  const itemId = parseInt(req.params.itemId, 10);

  if (itemId <= 0) {
    return error(res, 400, "invalid item id");
  }

  const rowData = worksheetData[itemId - 2] || null;

  if (!rowData || rowData.length <= 0) {
    return error(res, 404, "record not found");
  }

  endpoint.schema.forEach((label, index) => {
    item[camelCase(label)] = rowData[index] || "";
  });

  if (item.id) {
    item.id = itemId;
  } else {
    item = { id: itemId, ...item };
  }

  const response = {
    success: true,
    data: item,
    info: quotaInfo(user),
  };

  return res.json(response);
});

/**
 * @api {post} /:projectId/:endpointName/ Create
 * @apiDescription Add a record to a worksheet.
 * @apiName Create
 * @apiGroup Endpoint
 *
 * @apiParam {String} projectId Project's unique ID.
 * @apiParam {String} endpointName Endpoint's name.
 *
 * @apiExample {js} Javascript
 *     fetch("https://flasheet.co/api/5f817d32f8154a22b06a0477/busStops", {
 *      method: "POST"
 *     })
 *       .then((response) => {
 *          return response.json();
 *       })
 *       .then((data) => {
 *        console.log(data);
 *       });
 *
 * @apiSuccess {Boolean} success Request status.
 * @apiSuccess {Object} info Remaining requests's info.
 */
exports.projectEndpointPost = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = req;

  const reqData = req.body;
  const data = [];

  endpoint.schema.forEach((label) => {
    if (reqData[label]) {
      data.push(reqData[label]);
    } else {
      data.push("");
    }
  });

  try {
    // try to add new record to the table
    await appendWorksheet(project.spreadsheet, endpoint.worksheetName, data);
  } catch (e) {
    return error(res, 500, "unable to update the table");
  }

  user.remainingRequests -= 1;
  user.save();

  return res.status(201).json({
    success: true,
    info: quotaInfo(user),
  });
});

/**
 * @api {put} /:projectId/:endpointName/:id Update
 * @apiDescription Update a record in a worksheet.
 * @apiName Update
 * @apiGroup Endpoint
 *
 * @apiParam {String} projectId Project's unique ID.
 * @apiParam {String} endpointName Endpoint's name.
 * @apiParam {Number} id Record's ID.
 *
 * @apiExample {js} Javascript
 *     fetch("https://flasheet.co/api/5f817d32f8154a22b06a0477/busStops/1", {
 *      method: "PUT"
 *     })
 *       .then((response) => {
 *          return response.json();
 *       })
 *       .then((data) => {
 *        console.log(data);
 *       });
 *
 * @apiSuccess {Boolean} success Request status.
 * @apiSuccess {Object} info Remaining requests's info.
 */
exports.projectEndpointUpdate = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = req;
  const itemId = parseInt(req.params.itemId, 10);

  if (itemId <= 0) {
    return error(res, 400, "invalid item id");
  }

  const reqData = req.body;
  const data = [];

  endpoint.schema.forEach((label) => {
    if (reqData[label]) {
      data.push(reqData[label]);
    } else {
      data.push(undefined); // this prevent from clearing not present cell
    }
  });

  try {
    // try to update record on the table
    updateColumnWorksheet(
      project.spreadsheet,
      endpoint.worksheetName,
      itemId,
      data
    );
  } catch (e) {
    return error(res, 500, "unable to update the table");
  }

  user.remainingRequests -= 1;
  user.save();

  return res.status(200).json({
    success: true,
    info: quotaInfo(user),
  });
});

/**
 * @api {delete} /:projectId/:endpointName/:id Delete
 * @apiDescription Delete a record from a worksheet.
 * @apiName Delete
 * @apiGroup Endpoint
 *
 * @apiParam {String} projectId Project's unique ID.
 * @apiParam {String} endpointName Endpoint's name.
 * @apiParam {Number} id Record's ID.
 *
 * @apiExample {js} Javascript
 *     fetch("https://flasheet.co/api/5f817d32f8154a22b06a0477/busStops/1", {
 *      method: "DELETE"
 *     })
 *       .then((response) => {
 *          return response.json();
 *       })
 *       .then((data) => {
 *        console.log(data);
 *       });
 *
 * @apiSuccess {Boolean} success Request status.
 * @apiSuccess {Object} info Remaining requests's info.
 */
exports.projectEndpointDelete = asyncHandler(async (req, res) => {
  const { user, project, endpoint } = req;
  const itemId = parseInt(req.params.itemId, 10);

  if (itemId <= 0) {
    return error(res, 400, "invalid item id");
  }

  deleteColumnWorksheet(project.spreadsheet, endpoint.worksheetName, itemId);

  user.remainingRequests -= 1;
  user.save();

  return res.status(200).json({
    success: true,
    info: quotaInfo(user),
  });
});
