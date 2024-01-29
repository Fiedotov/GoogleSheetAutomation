const { readGoogleSheetData } = require("./src/googlesheet");
const { dbOperator } = require("./src/database");
const schedule = require("node-schedule");
let cors = require("cors");
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const { dbOperator } = require("./src/database");

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

// Route to handle GET request for the sheet data
app.get('/api/v1/sheet', async (req, res) => {
  try {
    const sheets = await dbOperator(actions.SHEET_READ_DATA);
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to handle POST request for the new sheet data
app.post('/api/v1/sheet', async (req, res) => {
  try {
    const sheet = await dbOperator(actions.SHEET_INSERT_DATA, req.body);
    res.status(201).json(sheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to handle PUT request for updating the sheet data
app.put('/api/v1/sheet/:id', async (req, res) => {
  try {
    const payload = { ...req.body, id: parseInt(req.params.id) };
    const sheet = await dbOperator(actions.SHEET_UPDATE_DATA, payload);
    res.json(sheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to handle DELETE request for deleting the sheet data
app.delete('/api/v1/sheet/:id', async (req, res) => {
  try {
    const payload = { id: parseInt(req.params.id) };
    const sheet = await dbOperator(actions.SHEET_DELETE_DATA, payload);
    res.json({ message: 'Sheet successfully deleted', sheet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Start the server on port 3000
const PORT = 3909;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


async function doAsyncTask() {
  try {
    // Perform the asynchronous task here
    console.log('Async task is running...');
    await readGoogleSheetData(); // Replace with your actual asynchronous operation

    console.log('Async task completed. Restarting task...');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Use setImmediate to avoid a potential stack overflow with direct recursion
    setImmediate(doAsyncTask);
  }
}

doAsyncTask(); // Start the continuous execution