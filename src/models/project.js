const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  spreadsheet: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endpoints: { type: Object },
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
