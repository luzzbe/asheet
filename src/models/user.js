const mongoose = require('mongoose');
const { CronJob } = require('cron');

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

// Reset free quota each month
const job = new CronJob('0 0 1 * *', () => {
  User.updateMany({}, { remainingRequests: 500 });
}, null, true, 'America/Los_Angeles');
job.start();

module.exports = User;
