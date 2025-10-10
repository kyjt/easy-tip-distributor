// In public/js/state.js

const state = {
  files: {
    orders: null,
    timesheet: null,
  },
};

export function addFile(fileType, fileObject) {
  state.files[fileType] = fileObject;
}

export function removeFile(fileType) {
  state.files[fileType] = null;
}

export function getFile(fileType) {
  return state.files[fileType];
}

export function getFiles() {
  return state.files;
}

export function getHeaders(fileType) {
  return state.files[fileType]?.headers || [];
}

export function areFilesReady() {
  return getHeaders("orders").length > 0 && getHeaders("timesheet").length > 0;
}

// --- Settings Storage ---
export function saveSettingsToStorage(settings) {
  localStorage.setItem("savedSettings", JSON.stringify(settings));
  console.log("Settings saved to localStorage.");
}
export function loadSettingsFromStorage() {
  const saved = localStorage.getItem("savedSettings");
  try {
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Could not parse saved settings.", e);
    localStorage.removeItem("savedSettings");
    return null;
  }
}
export function clearSettingsFromStorage() {
  localStorage.removeItem("savedSettings");
  console.log("Saved settings have been reset.");
  alert("Your saved settings have been cleared.");
}

// --- History Storage ---

/**
 * Loads the calculation history from localStorage.
 * @returns {Array} The array of history items, or an empty array.
 */
export function loadHistory() {
  const history = localStorage.getItem("calculationHistory");
  return history ? JSON.parse(history) : [];
}

/**
 * Saves the entire history array to localStorage.
 * @param {Array} history - The history array to save.
 */
function saveHistory(history) {
  localStorage.setItem("calculationHistory", JSON.stringify(history));
}

/**
 * Adds a new result to the history.
 * @param {object} resultData - The full result object from the server.
 */
export function addResultToHistory(resultData) {
  const history = loadHistory();
  const newEntry = {
    id: Date.now(), // Use timestamp as a simple unique ID
    date: new Date().toLocaleString(),
    summary: `${resultData.length} employees`,
    data: resultData,
  };
  history.unshift(newEntry); // Add to the beginning of the list
  saveHistory(history);
}

/**
 * Deletes a single entry from the history by its ID.
 * @param {number} id - The ID of the history entry to delete.
 */
export function deleteResultFromHistory(id) {
  let history = loadHistory();
  history = history.filter((entry) => entry.id !== id);
  saveHistory(history);
}
