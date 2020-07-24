const asyncHandler = require('express-async-handler');
const Project = require('../models/project');
const {
  getSpreadsheetTabs,
  extractIdFromURI,
} = require('../services/spreadsheet');

const { flash } = require('../services/flash');

exports.projectList = asyncHandler(async (req, res) => {
  const projects = await Project.find({ user: req.session.user._id });
  return res.render('projects/list', {
    title: 'Project list',
    projects,
  });
});

exports.projectDetail = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect('/projects');
  }

  return res.render('projects/view', {
    title: 'Project details',
    project,
  });
});

exports.projectSync = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.session.user._id,
  });

  if (!project) {
    return res.redirect('/projects');
  }

  project.endpoints = await getSpreadsheetTabs(project.spreadsheet);
  project.save();

  flash(req, 'Project synced', 'green');

  return res.redirect(`/projects/${project._id}`);
});

exports.projectDelete = asyncHandler(async (req, res) => {
  await Project.findOneAndDelete({
    _id: req.params.id,
    user: req.session.user._id,
  });
  flash(req, 'Project deleted', 'green');
  return res.redirect('/projects');
});

exports.projectCreateGet = (req, res) => {
  res.render('projects/create', {
    title: 'Create a project',
  });
};

exports.projectCreatePost = asyncHandler(async (req, res) => {
  const sheetId = extractIdFromURI(req.body.url);

  if (!sheetId) {
    flash(req, 'Invalid Google Sheet URI', 'red');
    return res.redirect('/projects/create');
  }

  const projectData = {
    name: req.body.name,
    spreadsheet: sheetId,
    user: req.session.user._id,
  };

  const project = await Project.create(projectData);

  flash(req, 'Project created', 'green');
  return res.redirect(`/projects/${project._id}`);
});
