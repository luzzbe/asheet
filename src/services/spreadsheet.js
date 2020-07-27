const { google } = require('googleapis');
const { oauth2Client } = require('./google');

const sheets = new google.sheets({ version: 'v4', auth: oauth2Client });

exports.extractIdFromURI = (uri) => {
  const regex = new RegExp('https://docs.google.com/spreadsheets/d/(.*)/edit.*');

  const match = regex.exec(uri);

  if (!match || match.length < 2) {
    return null;
  }

  return match[1];
};

exports.getWorksheetLabels = async (spreadsheet, worksheet) => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet,
    range: `${worksheet}!A1:ZZZ1`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  if (!res.data.values) {
    return false;
  }

  return res.data.values[0];
};

exports.getWorksheetContent = async (spreadsheet, worksheet) => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet,
    range: `${worksheet}!A2:ZZZ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.values;
};

exports.getSpreadsheetTabs = async (spreadsheet) => {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheet,
  });
  const tabs = response.data.sheets;
  const tabsList = tabs.map(({ properties }) => properties.title);

  return tabsList;
};

exports.appendWorksheet = async (spreadsheet, worksheet, data) => {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheet,
    range: `${worksheet}!A1:ZZZ`,
    valueInputOption: 'RAW',
    resource: {
      values: [data],
    },
  });
  return res;
};

exports.deleteColumnWorksheet = async (spreadsheet, worksheet, colNum) => {
  const res = await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheet,
    range: `${worksheet}!A${colNum}:ZZZ${colNum}`,
  });
  return res;
};
