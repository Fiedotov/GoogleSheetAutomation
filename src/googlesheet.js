const { google } = require("googleapis");
const SERVICE_ACCOUNT_FILE = "../service-account-file.json";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const credentials = require(SERVICE_ACCOUNT_FILE);

const authClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);

const sheets = google.sheets({ version: "v4", auth: authClient });
const linkSheetID = "144w-saXXosuMoqMatUAnaWGzrNe4rfL7Z7mfFIZUsdc";
const analyticsSheetID = "1unqoavXeF6NDh_RxyVIA_E7FS7V5r74N1Tp3s65lAco";

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
        params.startDate,
        params.endDate
      );
      result = result.concat(res);
    } catch {}
  }
  result = await summarizeFeedback(result);
  console.log(result);
  await writeAnalyticsData(result);
}

async function summarizeFeedback(resultArray) {
  const summary = {};

  resultArray.forEach((row) => {
    const { sid, ssid, feedback, sheetName } = row;
    const key = `sid: ${sid}, ssid: ${ssid}, sheetName: ${sheetName}`;

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
        sheetName,
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
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const headerRange = "Sheet1!1:1";
  const result = [];
  try {
    // Retrieve the sheet properties to get the sheet name
    const sheetPropertiesResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title',
    });
    // Assuming you are interested in the first sheet's name
    const spreadsheetTitle = sheetPropertiesResponse.data.properties.title;
    // Retrieve the header row
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
          rowDate = parseCustomDateString(row[dateIndex]);
          if (rowDate >= startDate && rowDate <= endDate)
            result.push({
              sheetName: spreadsheetTitle,
              sid: row[sidIndex] - 0,
              ssid: row[ssidIndex] - 0,
              feedback: row[rightOfSsidIndex],
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
    const ranges = ["A:A", "B2", "C2"];
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ranges,
    });

    // Extract the values from the response
    const linkValues = response.data.valueRanges[0].values;
    const startDateValue = response.data.valueRanges[1].values;
    const endDateValue = response.data.valueRanges[2].values;

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

    // Extract startDate and endDate
    const startDate = startDateValue
      ? startDateValue[0][0]
      : new Date("1/1/1970");
    const endDate = endDateValue ? endDateValue[0][0] : new Date("12/31/2050");

    return {
      links: sheetIds,
      startDate: startDate,
      endDate: endDate,
    };
  } catch (error) {
    console.error("The API returned an error: ", error);
    throw error;
  }
}

function parseCustomDateString(dateString) {
  // Extract the date part (DD/MM/YYYY) from the full string
  const datePart = dateString.split(" ")[0];

  // Split the date string by the '/' character to get an array [DD, MM, YYYY]
  const dateParts = datePart.split("/");

  // Subtract 1 from the month value (dateParts[1]) since months are 0-indexed in JavaScript
  // Note: The `Date` constructor accepts year, month index, and day as parameters
  const year = parseInt(dateParts[2], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Adjust for 0-indexed months
  const day = parseInt(dateParts[0], 10);

  // Create the Date object
  const date = new Date(year, month, day);

  return date;
}

module.exports = { readGoogleSheetData };
