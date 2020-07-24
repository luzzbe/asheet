const { google } = require('googleapis');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

module.exports = { oauth2Client };
