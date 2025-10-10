// In public/js/api.js

import { getFile } from "./state.js";

const API_URL = "/api/process";

export async function sendDataToServer(mappings, filters) {
  const formData = new FormData();
  formData.append("ordersFile", getFile("orders").file);
  formData.append("timesheetFile", getFile("timesheet").file);
  formData.append("mappings", JSON.stringify(mappings));
  formData.append("filters", JSON.stringify(filters));

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "An unknown error occurred on the server."
      );
    }

    console.log("Server response:", result);
    return result;
  } catch (error) {
    console.error("Error sending data to server:", error);
    alert(`An error occurred: ${error.message}`);
    return null;
  }
}
