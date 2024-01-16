const { readGoogleSheetData } = require("./src/googlesheet");
const schedule = require("node-schedule");

// Schedule the function to run every 1 minute
const job = schedule.scheduleJob('*/1 * * * *', function() {
  console.log('Running readGoogleSheetData...');
  readGoogleSheetData();
});