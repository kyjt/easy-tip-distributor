// In public/js/main.js

import * as state from "./state.js";
import * as ui from "./ui.js";
import * as api from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Application initialized.");

  // Initial render of history on page load
  refreshHistoryView();

  const ordersDropZone = document.getElementById("orders-drop-zone"),
    ordersFileInput = document.getElementById("orders-file-input"),
    timesheetDropZone = document.getElementById("timesheet-drop-zone"),
    timesheetFileInput = document.getElementById("timesheet-file-input"),
    distributeBtn = document.getElementById("distribute-btn"),
    processButton = document.getElementById("process-button"),
    cancelModalBtn = document.getElementById("cancel-modal-btn"),
    resetMappingsBtn = document.getElementById("reset-mappings-btn"),
    addFilterBtn = document.getElementById("add-filter-btn"),
    filterRulesContainer = document.getElementById("filter-rules-container"),
    ordersFileList = document.getElementById("orders-file-list"),
    timesheetFileList = document.getElementById("timesheet-file-list");
  const closeResultsModalBtn = document.getElementById(
    "close-results-modal-btn"
  );
  const historyListContainer = document.getElementById(
    "history-list-container"
  );

  // --- Main Handler Functions ---

  async function handleProcess() {
    const mappings = ui.getMappingsFromForm();
    const filters = ui.getFiltersFromForm();
    state.saveSettingsToStorage({ mappings, filters });
    ui.hideMappingModal();
    ui.showLoadingModal();
    const result = await api.sendDataToServer(mappings, filters);
    ui.hideLoadingModal();
    if (result && result.length > 0) {
      state.addResultToHistory(result);
      refreshHistoryView();
      ui.renderResults(result);
      ui.showResultsModal();
    } else if (result) {
      alert(
        "Calculation complete, but no tips were found to distribute based on your files and filters."
      );
    }
  }

  function refreshHistoryView() {
    const history = state.loadHistory();
    ui.renderHistory(history);
  }

  function handleFileSelection(file, fileType) {
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid CSV file.");
      return;
    }
    const fileObject = { file: file, headers: [] };
    state.addFile(fileType, fileObject);
    ui.updateFileListUI(fileType, file);
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        fileObject.headers = results.meta.fields;
        onHeadersParsed();
      },
    });
  }
  function onHeadersParsed() {
    if (state.areFilesReady()) {
      ui.updateDistributeButtonState(true);
      const savedSettings = state.loadSettingsFromStorage();
      if (savedSettings) {
        console.log("Found saved settings, showing modal automatically.");
        ui.showMappingModal();
        ui.populateFilters(savedSettings.filters);
      } else {
        ui.populateFilters();
      }
    }
  }
  function handleRemoveFile(fileType) {
    state.removeFile(fileType);
    ui.updateFileListUI(fileType, null);
    ui.updateDistributeButtonState(false);
    if (fileType === "orders") ordersFileInput.value = "";
    else timesheetFileInput.value = "";
  }

  // --- Event Listeners ---
  ordersDropZone.addEventListener("click", () => ordersFileInput.click());
  ordersDropZone.addEventListener("dragover", (e) => e.preventDefault());
  ordersDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFileSelection(e.dataTransfer.files[0], "orders");
  });
  ordersFileInput.addEventListener("change", (e) =>
    handleFileSelection(e.target.files[0], "orders")
  );
  timesheetDropZone.addEventListener("click", () => timesheetFileInput.click());
  timesheetDropZone.addEventListener("dragover", (e) => e.preventDefault());
  timesheetDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFileSelection(e.dataTransfer.files[0], "timesheet");
  });
  timesheetFileInput.addEventListener("change", (e) =>
    handleFileSelection(e.target.files[0], "timesheet")
  );
  distributeBtn.addEventListener("click", () => {
    ui.showMappingModal();
    const savedSettings = state.loadSettingsFromStorage();
    ui.populateFilters(savedSettings ? savedSettings.filters : []);
  });
  cancelModalBtn.addEventListener("click", ui.hideMappingModal);
  processButton.addEventListener("click", handleProcess);
  addFilterBtn.addEventListener("click", ui.addFilterRule);
  resetMappingsBtn.addEventListener("click", () => {
    state.clearSettingsFromStorage();
    ui.populateDropdowns();
    ui.populateFilters();
  });
  filterRulesContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-filter-btn")) {
      e.target.closest(".filter-rule").remove();
    }
  });
  ordersFileList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-btn"))
      handleRemoveFile(e.target.dataset.fileType);
  });
  timesheetFileList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-btn"))
      handleRemoveFile(e.target.dataset.fileType);
  });
  closeResultsModalBtn.addEventListener("click", ui.hideResultsModal);

  historyListContainer.addEventListener("click", (e) => {
    const target = e.target;
    const id = parseInt(target.dataset.historyId, 10);
    if (isNaN(id)) return;

    if (target.classList.contains("view-history-btn")) {
      const history = state.loadHistory();
      const entry = history.find((item) => item.id === id);
      if (entry) {
        ui.renderResults(entry.data);
        ui.showResultsModal();
      }
    } else if (target.classList.contains("delete-history-btn")) {
      if (confirm("Are you sure you want to delete this entry?")) {
        state.deleteResultFromHistory(id);
        refreshHistoryView();
      }
    }
  });
});
