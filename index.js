const { readGoogleSheetData } = require("./src/googlesheet");
const schedule = require("node-schedule");
let cors = require("cors");
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(cors());
// Define the path to the JSON file
const jsonFilePath = path.join(`${__dirname}/src`, 'analyticsData.json');

// Route to handle GET request for the analytics data
app.get('/analytics-data', (req, res) => {
  // Read the JSON file and send it as a response
  fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      // If there's an error reading the file, send a 500 server error
      console.error('Error reading JSON file:', err);
      res.status(500).send('An error occurred while retrieving the data.');
    } else {
      // If the file is read successfully, parse the JSON data and send it
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData); // Sends the JSON data as a response
      } catch (parseError) {
        // If there's an error parsing the JSON, send a 500 server error
        console.error('Error parsing JSON data:', parseError);
        res.status(500).send('An error occurred while processing the data.');
      }
    }
  });
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Schedule the function to run every 1 minute
const job = schedule.scheduleJob('*/1 * * * *', function () {
  console.log('Running readGoogleSheetData...');
  readGoogleSheetData();
});