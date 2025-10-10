const express = require("express");
const multer = require("multer");
const cors = require("cors");
const Papa = require("papaparse");
require("dotenv").config();

const { calculateTipDistribution } = require("./tip-distributor.js");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
}).fields([
  { name: "ordersFile", maxCount: 1 },
  { name: "timesheetFile", maxCount: 1 },
]);

app.post("/api/process", upload, async (req, res) => {
  console.log("Received request to /api/process");

  if (!req.files.ordersFile || !req.files.timesheetFile) {
    return res
      .status(400)
      .json({ error: "Both orders and timesheet files are required." });
  }

  try {
    const mappings = JSON.parse(req.body.mappings);
    const filters = JSON.parse(req.body.filters);

    const ordersCsvString = req.files.ordersFile[0].buffer.toString("utf8");
    const timesheetCsvString =
      req.files.timesheetFile[0].buffer.toString("utf8");

    let ordersData = Papa.parse(ordersCsvString, {
      header: true,
      skipEmptyLines: true,
    }).data;
    let timesheetData = Papa.parse(timesheetCsvString, {
      header: true,
      skipEmptyLines: true,
    }).data;

    // --- Data Cleaning Step ---
    const requiredOrderCols = [mappings.orders.tipAmount, mappings.orders.date];
    const requiredTimesheetCols = [
      mappings.timesheet.employeeName,
      mappings.timesheet.clockInTime,
    ];

    const originalOrderCount = ordersData.length;
    const originalTimesheetCount = timesheetData.length;

    ordersData = ordersData.filter((row) =>
      requiredOrderCols.every((col) => row[col])
    );
    timesheetData = timesheetData.filter((row) =>
      requiredTimesheetCols.every((col) => row[col])
    );

    console.log(
      `Initial parse: ${originalOrderCount} orders, ${originalTimesheetCount} timesheets.`
    );
    console.log(
      `After cleaning: ${ordersData.length} valid orders, ${timesheetData.length} valid timesheets.`
    );
    // --- End of Data Cleaning Step ---

    const finalPayouts = calculateTipDistribution(
      ordersData,
      timesheetData,
      mappings,
      filters
    );

    console.log("Calculation complete. Sending results to client.");
    res.status(200).json(finalPayouts);
  } catch (error) {
    console.error("Error during processing:", error);
    res
      .status(500)
      .json({ error: `An error occurred on the server: ${error.message}` });
  }
});

module.exports = app;
