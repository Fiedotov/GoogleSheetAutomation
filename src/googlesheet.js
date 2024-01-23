const { google } = require("googleapis");
const SERVICE_ACCOUNT_FILE = "../service-account-file.json";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const credentials = require(SERVICE_ACCOUNT_FILE);
const fs = require('fs');
const path = require('path');

const authClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);

const sheets = google.sheets({ version: "v4", auth: authClient });
const linkSheetID = "144w-saXXosuMoqMatUAnaWGzrNe4rfL7Z7mfFIZUsdc";
const analyticsSheetID = "1unqoavXeF6NDh_RxyVIA_E7FS7V5r74N1Tp3s65lAco";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeAnalyticsData2JSON(data) {
  await sleep(10000);
  // Define the path and filename for the JSON file
  const filePath = path.join(__dirname, 'analyticsData.json');
  
  // Convert the data to a JSON string with indentation for readability
  const jsonData = JSON.stringify(data, null, 2);
  
  // Use a Promise to handle the asynchronous file write operation
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, jsonData, 'utf8', (err) => {
      if (err) {
        console.error('An error occurred while writing JSON to file:', err);
        reject(err); // Reject the promise if an error occurs
      } else {
        console.log('Data successfully written to analyticsData.json');
        resolve(); // Resolve the promise on successful write
      }
    });
  });
}

async function writeAnalyticsData(result) {
  try {
    const range = "Sheet3!A2:L";
    // Clear the data in the specified range
    await sheets.spreadsheets.values.clear({
      spreadsheetId: analyticsSheetID,
      range: range,
    });
    const values = result.map((item) => Object.values(item));
    // Write data to the sheet
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: analyticsSheetID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: range,
            values: values,
          },
        ],
      },
    });

    console.log("Data has been written to the sheet successfully.");
  } catch (error) {
    console.error("Error writing to the sheet:", error);
    throw error;
  }
}

async function readGoogleSheetData() {
  let params = await extractGoogleSheetData(linkSheetID);
  let sheetIDs = params.links;
  let result = [];
  for (let i = 0; i < sheetIDs.length; i++) {
    try {
      let res = await readGoogleSheetDataByID(
        sheetIDs[i],
      );
      result = result.concat(res);
    } catch {}
  }
  result = await summarizeFeedback(result);
  console.log(result);
  await writeAnalyticsData2JSON(result);
}

async function summarizeFeedback(resultArray) {
  const summary = {};

  resultArray.forEach((row) => {
    const { sid, ssid, feedback, sheetName, date } = row;
    const key = `sid: ${sid}, ssid: ${ssid}, sheetName: ${sheetName}, date: ${date}`;

    // Initialize the summary object for the sid, ssid combination if it doesn't exist
    if (!summary[key]) {
      summary[key] = {
        sid,
        ssid,
        RDV: 0,
        "A Rappeler": 0,
        NRP: 0,
        "Pas interessé": 0,
        Locataire: 0,
        "Pas la bonne personne": 0,
        "Demande pour autre produit": 0,
        "Deja installé": 0,
        "Abandon de projet": 0,
        "Faux numéro": 0,
        sheetName,
        date,
      };
    }

    // Increment the count for the specific feedback
    if (feedback && summary[key].hasOwnProperty(feedback)) {
      summary[key][feedback]++;
    }
  });

  // Convert the summary object to an array of summary objects
  return Object.values(summary);
}

async function readGoogleSheetDataByID(spreadsheetId, startDate, endDate) {
  const headerRange = "Sheet1!1:1";
  const result = [];
  try {
    await sleep(2500);
    // Retrieve the sheet properties to get the sheet name
    const sheetPropertiesResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title',
    });
    // Assuming you are interested in the first sheet's name
    const spreadsheetTitle = sheetPropertiesResponse.data.properties.title;
    // Retrieve the header row
    await sleep(2500);
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const headers = headerResponse.data.values[0];
    const sidIndex = headers.indexOf("sid");
    const ssidIndex = headers.indexOf("ssid");
    const dateIndex = headers.indexOf("Date");
    const rightOfSsidIndex = ssidIndex + 1;

    // Check if columns were found
    if (sidIndex === -1 || ssidIndex === -1) {
      throw new Error("Required columns not found.");
    }

    // Read the data rows
    await sleep(2500);
    const dataRange = `Sheet1!A2:Z`; // Adjust as needed to cover all possible rows
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });

    const rows = dataResponse.data.values;
    if (rows.length) {
      // Process rows
      rows.forEach((row) => {
        if (row[sidIndex] && row[rightOfSsidIndex]) {
            result.push({
              sheetName: spreadsheetTitle,
              sid: row[sidIndex] - 0,
              ssid: row[ssidIndex] - 0,
              feedback: row[rightOfSsidIndex],
              date: row[dateIndex]
            });
        }
      });
    } else {
      console.log("No data found.");
    }
    console.log(result);
    return result;
  } catch (err) {
    console.error("The API returned an error: " + err);
    return [];
  }
}

async function extractGoogleSheetData(spreadsheetId) {
  try {
    // Define the ranges to be the entire column A, cell B2 for startDate, and cell C2 for endDate
    await sleep(2500);
    const ranges = ["A:A"];
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ranges,
    });

    // Extract the values from the response
    const linkValues = response.data.valueRanges[0].values;

    // Process the values to extract sheet IDs
    const sheetIds = linkValues
      .flat() // Flatten the array of arrays to a simple array
      .filter((value) => value) // Filter out empty strings
      .map((url) => {
        // Extract the sheet ID from the URL
        const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return matches ? matches[1] : null;
      })
      .filter((id) => id); // Filter out any null values

    return {
      links: sheetIds,
    };
  } catch (error) {
    console.error("The API returned an error: ", error);
    throw error;
  }
}

module.exports = { readGoogleSheetData };
