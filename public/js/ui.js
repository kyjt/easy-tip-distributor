// In public/js/ui.js

import { getHeaders, loadSettingsFromStorage } from "./state.js";

// --- DOM Element References ---
const loadingModal = document.getElementById("loading-modal");
const resultsModal = document.getElementById("results-modal");
const resultsContentContainer = document.getElementById(
  "results-content-container"
);
const ordersFileList = document.getElementById("orders-file-list");
const timesheetFileList = document.getElementById("timesheet-file-list");
const distributeBtn = document.getElementById("distribute-btn");
const mappingModal = document.getElementById("mapping-modal");
const filterRulesContainer = document.getElementById("filter-rules-container");
const historySection = document.getElementById("section-results-history");
const historyListContainer = document.getElementById("history-list-container");

const mappingDropdowns = {
  orders: [
    document.getElementById("map-order-id"),
    document.getElementById("map-order-date"),
    document.getElementById("map-order-time"),
    document.getElementById("map-tip-amount"),
  ],
  timesheet: [
    document.getElementById("map-employee-name"),
    document.getElementById("map-clock-in-date"),
    document.getElementById("map-clock-in-time"),
    document.getElementById("map-clock-out-time"),
  ],
};

// --- Modal Visibility ---
export function showLoadingModal() {
  loadingModal.classList.remove("hidden");
}
export function hideLoadingModal() {
  loadingModal.classList.add("hidden");
}
export function showResultsModal() {
  resultsModal.classList.remove("hidden");
}
export function hideResultsModal() {
  resultsModal.classList.add("hidden");
}

// --- Results Rendering ---
export function renderResults(resultsData) {
  resultsContentContainer.innerHTML = "";
  const summaryTable = createSummaryTable(resultsData);
  resultsContentContainer.appendChild(summaryTable);
  summaryTable.querySelectorAll(".employee-name-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const employeeName = e.target.dataset.employeeName;
      const employeeData = resultsData.find(
        (emp) => emp.employeeName === employeeName
      );
      renderDetailView(employeeData, resultsData);
    });
  });
}

function createSummaryTable(resultsData) {
  const container = document.createElement("div");

  // --- 1. CALCULATE TOTALS FIRST ---
  const totalTipsDistributed = resultsData.reduce(
    (sum, emp) => sum + emp.totalAmount,
    0
  );
  const totalHoursWorked = resultsData.reduce(
    (sum, emp) => sum + emp.totalHours,
    0
  );

  let tableHTML = `
    <h4 class="text-lg font-semibold text-gray-800 mb-4">Payout Summary</h4>
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tip Amount</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
  `;

  resultsData.forEach((employee) => {
    tableHTML += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="text-blue-600 hover:text-blue-800 font-semibold employee-name-btn" data-employee-name="${
            employee.employeeName
          }">
            ${employee.employeeName}
          </button>
        </td>
        <td class="px-6 py-4 whitespace-nowrap font-mono text-gray-700">$${employee.totalAmount.toFixed(
          2
        )}</td>
        <td class="px-6 py-4 whitespace-nowrap font-mono text-gray-700">${employee.totalHours.toFixed(
          2
        )}</td>
      </tr>
    `;
  });

  // --- 4. ADD THE TOTALS FOOTER ---
  tableHTML += `
      </tbody>
      <tfoot class="bg-gray-100 border-t-2 border-gray-300">
        <tr class="font-bold text-gray-900">
          <td class="px-6 py-4 whitespace-nowrap text-sm">Totals</td>
          <td class="px-6 py-4 whitespace-nowrap font-mono text-sm">$${totalTipsDistributed.toFixed(
            2
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap font-mono text-sm">${totalHoursWorked.toFixed(
            2
          )}</td>
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = tableHTML;
  return container;
}

function renderDetailView(employeeData, fullResultsData) {
  resultsContentContainer.innerHTML = "";
  let detailHTML = ` <div class="flex justify-between items-center mb-4"> <h4 class="text-lg font-semibold text-gray-800">Details for ${employeeData.employeeName}</h4> <button id="back-to-summary-btn" class="text-sm font-semibold text-blue-600 hover:text-blue-800">&larr; Back to Summary</button> </div> <table class="min-w-full divide-y divide-gray-200"> <thead class="bg-gray-50"> <tr> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Total Tip</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Share</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared With</th> </tr> </thead> <tbody class="bg-white divide-y divide-gray-200"> `;
  employeeData.tips.forEach((tip) => {
    detailHTML += ` <tr> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
      tip.orderId
    }</td> <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">$${tip.orderTotalTip.toFixed(
      2
    )}</td> <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-green-600 font-bold">$${tip.tipShare.toFixed(
      2
    )}</td> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tip.sharedWith.join(
      ", "
    )}</td> </tr> `;
  });
  detailHTML += `</tbody></table>`;
  resultsContentContainer.innerHTML = detailHTML;
  document
    .getElementById("back-to-summary-btn")
    .addEventListener("click", () => {
      renderResults(fullResultsData);
    });
}

// --- History Rendering ---
export function renderHistory(history) {
  historyListContainer.innerHTML = "";
  if (history.length > 0) {
    historySection.classList.remove("hidden");
    history.forEach((entry) => {
      const entryDiv = document.createElement("div");
      entryDiv.className =
        "bg-white p-4 rounded-lg shadow-md flex justify-between items-center";
      entryDiv.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">Calculation from ${entry.date}</p>
                    <p class="text-sm text-gray-500">${entry.summary}</p>
                </div>
                <div>
                    <button class="view-history-btn text-blue-600 hover:text-blue-800 font-semibold mr-4" data-history-id="${entry.id}">View</button>
                    <button class="delete-history-btn text-red-500 hover:text-red-700 font-semibold" data-history-id="${entry.id}">Delete</button>
                </div>
            `;
      historyListContainer.appendChild(entryDiv);
    });
  } else {
    historySection.classList.add("hidden");
  }
}

// --- Other UI Functions ---
export function updateFileListUI(fileType, file) {
  const listElement =
    fileType === "orders" ? ordersFileList : timesheetFileList;
  if (file) {
    listElement.innerHTML = `<div class="file-item"><span class="truncate max-w-xs">${file.name}</span><button class="remove-btn" data-file-type="${fileType}">&times;</button></div>`;
  } else {
    listElement.innerHTML = "";
  }
}
export function updateDistributeButtonState(isReady) {
  distributeBtn.disabled = !isReady;
  if (isReady) {
    distributeBtn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    distributeBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
}
export function showMappingModal() {
  if (distributeBtn.disabled) return;
  populateDropdowns();
  mappingModal.classList.remove("hidden");
}
export function hideMappingModal() {
  mappingModal.classList.add("hidden");
}
function createOptionsHTML(headers) {
  let optionsHTML = '<option value="">Choose a column...</option>';
  headers.forEach((header) => {
    optionsHTML += `<option value="${header}">${header}</option>`;
  });
  return optionsHTML;
}
export function populateDropdowns() {
  const orderOptions = createOptionsHTML(getHeaders("orders"));
  const timesheetOptions = createOptionsHTML(getHeaders("timesheet"));
  mappingDropdowns.orders.forEach(
    (select) => (select.innerHTML = orderOptions)
  );
  mappingDropdowns.timesheet.forEach(
    (select) => (select.innerHTML = timesheetOptions)
  );
  applySavedMappings();
}
export function applySavedMappings() {
  const savedSettings = loadSettingsFromStorage();
  if (savedSettings && savedSettings.mappings) {
    console.log("Applying saved mappings to dropdowns.");
    const { mappings } = savedSettings;
    document.getElementById("map-order-id").value =
      mappings.orders.orderId || "";
    document.getElementById("map-order-date").value =
      mappings.orders.date || "";
    document.getElementById("map-order-time").value =
      mappings.orders.time || "";
    document.getElementById("map-tip-amount").value =
      mappings.orders.tipAmount || "";
    document.getElementById("map-employee-name").value =
      mappings.timesheet.employeeName || "";
    document.getElementById("map-clock-in-date").value =
      mappings.timesheet.clockInDate || "";
    document.getElementById("map-clock-in-time").value =
      mappings.timesheet.clockInTime || "";
    document.getElementById("map-clock-out-time").value =
      mappings.timesheet.clockOutTime || "";
  }
}
export function populateFilters(filters = []) {
  filterRulesContainer.innerHTML = "";
  if (!filters || filters.length === 0) {
    addFilterRule();
  } else {
    filters.forEach((filter) => addFilterRule(filter));
  }
}
export function addFilterRule(rule = {}) {
  const ruleDiv = document.createElement("div");
  ruleDiv.className = "flex items-center space-x-2 filter-rule";
  const orderHeaders = getHeaders("orders");
  let optionsHTML = '<option value="">Choose column...</option>';
  orderHeaders.forEach((header) => {
    optionsHTML += `<option value="${header}">${header}</option>`;
  });
  const fieldVal = rule.field || "";
  const operatorVal = rule.operator || "contains";
  const valueVal = rule.value || "";
  ruleDiv.innerHTML = ` <select class="filter-field block w-full text-sm border-gray-300 rounded-md">${optionsHTML}</select> <select class="filter-operator block w-auto text-sm border-gray-300 rounded-md"> <option value="is">is</option> <option value="is_not">is not</option> <option value="contains">contains</option> <option value="does_not_contain">does not contain</option> </select> <input type="text" class="filter-value block w-full text-sm border-gray-300 rounded-md" placeholder="e.g., Relay"> <button type="button" class="remove-filter-btn text-red-500 font-bold text-xl">&times;</button> `;
  ruleDiv.querySelector(".filter-field").value = fieldVal;
  ruleDiv.querySelector(".filter-operator").value = operatorVal;
  ruleDiv.querySelector(".filter-value").value = valueVal;
  filterRulesContainer.appendChild(ruleDiv);
}
export function getMappingsFromForm() {
  return {
    orders: {
      orderId: document.getElementById("map-order-id").value,
      date: document.getElementById("map-order-date").value,
      time: document.getElementById("map-order-time").value,
      tipAmount: document.getElementById("map-tip-amount").value,
    },
    timesheet: {
      employeeName: document.getElementById("map-employee-name").value,
      clockInDate: document.getElementById("map-clock-in-date").value,
      clockInTime: document.getElementById("map-clock-in-time").value,
      clockOutTime: document.getElementById("map-clock-out-time").value,
    },
  };
}
export function getFiltersFromForm() {
  const filters = [];
  document.querySelectorAll(".filter-rule").forEach((row) => {
    const field = row.querySelector(".filter-field").value;
    const operator = row.querySelector(".filter-operator").value;
    const value = row.querySelector(".filter-value").value;
    if (field && value) {
      filters.push({ field, operator, value });
    }
  });
  return filters;
}
