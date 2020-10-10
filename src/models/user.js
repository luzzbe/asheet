const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  dailyRequests: { type: Number, default: 50 },
  remainingRequests: { type: Number, default: 50 },
  googleID: { type: String, required: true, unique: true },
  picture: { type: String },
  refreshToken: { type: String },
  accessToken: { type: String },
  lastConnection: { type: Date },
  lastReset: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
