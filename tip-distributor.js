const { parse, isValid, differenceInMinutes } = require("date-fns");

function normalizeTimeStr(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return timeStr;
  }
  let normalizedStr = timeStr.trim().toLowerCase();
  if (normalizedStr.endsWith("p")) {
    return normalizedStr.slice(0, -1) + " PM";
  }
  if (normalizedStr.endsWith("a")) {
    return normalizedStr.slice(0, -1) + " AM";
  }
  return timeStr;
}

function parseDateTime(dateStr, timeStr = "") {
  if (!dateStr) {
    return null;
  }
  const combinedStr = `${dateStr} ${timeStr}`.trim();
  const formats = [
    "yyyy-MM-dd HH:mm:ss",
    "MM/dd/yyyy h:mm:ss a",
    "MM/dd/yy h:mm a",
    "MM/dd/yyyy h:mm a",
    "M/d/yy h:m a",
    "MM/dd/yyyy HH:mm",
    "M/d/yyyy",
  ];
  for (const format of formats) {
    const parsedDate = parse(combinedStr, format, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }
  return null;
}

function isOrderFilteredOut(order, filters) {
  for (const filter of filters) {
    const orderValue = order[filter.field];
    if (orderValue === undefined) continue;
    const filterValue = filter.value.toLowerCase();
    const cleanOrderValue = String(orderValue).toLowerCase();
    switch (filter.operator) {
      case "contains":
        if (cleanOrderValue.includes(filterValue)) return true;
        break;
      case "does_not_contain":
        if (!cleanOrderValue.includes(filterValue)) return true;
        break;
      case "is":
        if (cleanOrderValue === filterValue) return true;
        break;
      case "is_not":
        if (cleanOrderValue !== filterValue) return true;
        break;
    }
  }
  return false;
}

function calculateTipDistribution(
  ordersData,
  timesheetData,
  mappings,
  filters
) {
  const employeeTotals = {};
  const employeeHours = {}; // Object to track hours
  const { orders: orderMappings, timesheet: timesheetMappings } = mappings;
  let unparsedOrderCount = 0;
  let unparsedShiftCount = 0;

  // --- NEW LOGIC: PRE-CALCULATE TOTAL HOURS ---
  for (const shift of timesheetData) {
    const employeeName = shift[timesheetMappings.employeeName];
    if (!employeeName) continue;

    const shiftDateStr = shift[timesheetMappings.clockInDate];
    const clockInStr = shift[timesheetMappings.clockInTime];
    const clockOutStr = shift[timesheetMappings.clockOutTime];

    const clockInDateTime = parseDateTime(
      shiftDateStr,
      normalizeTimeStr(clockInStr)
    );
    const clockOutDateTime = parseDateTime(
      shiftDateStr,
      normalizeTimeStr(clockOutStr)
    );

    if (
      clockInDateTime &&
      clockOutDateTime &&
      clockOutDateTime > clockInDateTime
    ) {
      const durationMinutes = differenceInMinutes(
        clockOutDateTime,
        clockInDateTime
      );
      if (!employeeHours[employeeName]) {
        employeeHours[employeeName] = 0;
      }
      employeeHours[employeeName] += durationMinutes / 60; // Convert minutes to hours
    }
  }
  // --- END OF NEW LOGIC ---

  for (const order of ordersData) {
    if (isOrderFilteredOut(order, filters)) continue;
    const tipAmount = parseFloat(order[orderMappings.tipAmount]);
    if (isNaN(tipAmount) || tipAmount <= 0) continue;
    const dateStr = order[orderMappings.date];
    const timeStr =
      orderMappings.date === orderMappings.time
        ? ""
        : order[orderMappings.time];
    const orderDateTime = parseDateTime(dateStr, timeStr);
    if (!orderDateTime) {
      unparsedOrderCount++;
      continue;
    }
    const workingEmployees = [];
    for (const shift of timesheetData) {
      const shiftDateStr = shift[timesheetMappings.clockInDate];
      const clockInStr = shift[timesheetMappings.clockInTime];
      const clockOutStr = shift[timesheetMappings.clockOutTime];
      const normalizedClockInStr = normalizeTimeStr(clockInStr);
      const normalizedClockOutStr = normalizeTimeStr(clockOutStr);
      let clockInDateTime =
        parseDateTime(normalizedClockInStr) ||
        parseDateTime(shiftDateStr, normalizedClockInStr);
      let clockOutDateTime =
        parseDateTime(normalizedClockOutStr) ||
        parseDateTime(shiftDateStr, normalizedClockOutStr);
      if (!clockInDateTime || !clockOutDateTime) {
        unparsedShiftCount++;
        continue;
      }
      if (
        orderDateTime >= clockInDateTime &&
        orderDateTime <= clockOutDateTime
      ) {
        workingEmployees.push(shift[timesheetMappings.employeeName]);
      }
    }
    if (workingEmployees.length > 0) {
      const tipPerEmployee = tipAmount / workingEmployees.length;

      const tipDetail = {
        orderId: order[orderMappings.orderId] || "N/A",
        orderTotalTip: tipAmount,
        tipShare: parseFloat(tipPerEmployee.toFixed(2)),
        sharedWith: workingEmployees,
      };

      for (const employeeName of workingEmployees) {
        if (employeeName) {
          if (!employeeTotals[employeeName]) {
            employeeTotals[employeeName] = {
              totalAmount: 0,
              tips: [],
            };
          }
          employeeTotals[employeeName].totalAmount += tipPerEmployee;
          employeeTotals[employeeName].tips.push(tipDetail);
        }
      }
    }
  }

  if (unparsedOrderCount > 0)
    console.warn(
      `[Warning] Skipped ${unparsedOrderCount} orders due to unrecognized date/time format.`
    );
  if (unparsedShiftCount > 0)
    console.warn(
      `[Warning] Skipped ${unparsedShiftCount} total shift checks due to unrecognized date/time format.`
    );

  return Object.entries(employeeTotals)
    .map(([name, data]) => ({
      employeeName: name,
      totalAmount: parseFloat(data.totalAmount.toFixed(2)),
      totalHours: parseFloat((employeeHours[name] || 0).toFixed(2)), // Add totalHours here
      tips: data.tips,
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

module.exports = {
  calculateTipDistribution,
};
