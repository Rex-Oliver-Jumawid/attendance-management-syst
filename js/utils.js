// Utility Functions

// Global loading overlay
let loadingOverlay = null;

// Show loading spinner
function showLoading(messageOrElement) {
  // If it's a string, show global loading overlay with message
  if (typeof messageOrElement === "string") {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement("div");
      loadingOverlay.id = "globalLoadingOverlay";
      loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        color: white;
        font-size: 18px;
      `;
      document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3d5a80; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <div>${messageOrElement}</div>
      </div>
    `;
    loadingOverlay.style.display = "flex";
  }
  // If it's an element, use old behavior
  else if (messageOrElement) {
    messageOrElement.innerHTML = '<div class="spinner">Loading...</div>';
    messageOrElement.classList.add("loading");
  }
}

// Hide loading spinner
function hideLoading(element) {
  // If no parameter, hide global overlay
  if (!element) {
    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }
  }
  // Otherwise hide loading from specific element
  else if (element) {
    element.classList.remove("loading");
  }
}

// Show success message
function showSuccess(message, duration = 3000) {
  const toast = createToast(message, "success");
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

// Show error message
function showError(message, duration = 3000) {
  const toast = createToast(message, "error");
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

// Create toast notification
function createToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === "error" ? "#f44336" : "#0c1014"};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
  return toast;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format date to short format
function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format time only
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get time remaining until expiry
function getTimeRemaining(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;

  if (diff <= 0) {
    return "Expired";
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
}

// Validate email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validate password (min 6 characters)
function isValidPassword(password) {
  return password.length >= 6;
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Confirm dialog
function confirmAction(message) {
  return confirm(message);
}

// Download data as JSON file
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Export table to CSV
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");

  for (let row of rows) {
    let cols = row.querySelectorAll("td, th");
    let csvRow = [];
    for (let col of cols) {
      csvRow.push(col.innerText);
    }
    csv.push(csvRow.join(","));
  }

  const csvString = csv.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Get query parameter from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Update user info in navbar
function updateNavbarUserInfo() {
  const user = auth.getCurrentUser();
  if (user) {
    const userNameElement = document.getElementById("userName");
    const userRoleElement = document.getElementById("userRole");

    if (userNameElement) {
      userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    }
    if (userRoleElement) {
      userRoleElement.textContent = user.role.toUpperCase();
    }
  }
}

// Initialize logout button
function initLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth.logout();
    });
  }
}

// Add CSS animation
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading {
        opacity: 0.6;
        pointer-events: none;
    }
    
    .spinner {
        text-align: center;
        padding: 20px;
    }
`;
document.head.appendChild(style);
