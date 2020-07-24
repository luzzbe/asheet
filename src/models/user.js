const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  remainingRequests: { type: Number, default: 500 },
  googleID: { type: String, required: true, unique: true },
  picture: { type: String },
  refreshToken: { type: String },
  accessToken: { type: String },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
