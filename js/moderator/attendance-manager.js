// Attendance Manager for Moderators

class AttendanceManager {
  constructor() {
    this.currentFilter = "day"; // default filter
    this.init();
  }

  init() {
    // Protect page
    if (!auth.protectPage("moderator")) return;

    // Initialize UI
    this.initElements();
    this.initFilterButtons();
    this.loadRecentScans();
    this.loadModeratorStats();
    updateNavbarUserInfo();
    initLogoutButton();

    // Refresh every 30 seconds
    setInterval(() => this.loadRecentScans(), 30000);
  }

  initElements() {
    this.recentScansTable = document.getElementById("recentScansTable");
    this.statsContainer = document.getElementById("moderatorStats");
  }

  initFilterButtons() {
    const filterButtons = document.querySelectorAll(".btn-filter");

    filterButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Remove active class from all buttons
        filterButtons.forEach((btn) => btn.classList.remove("active"));

        // Add active class to clicked button
        e.target.classList.add("active");

        // Update current filter
        this.currentFilter = e.target.dataset.filter;

        // Reload scans with new filter
        this.loadRecentScans();
      });
    });
  }

  async loadRecentScans() {
    try {
      const response = await api.getModeratorRecentScans(
        100,
        this.currentFilter
      );

      if (response.success) {
        this.displayRecentScans(response.records);
      }
    } catch (error) {
      console.error("Failed to load recent scans:", error);
      if (this.recentScansTable) {
        this.recentScansTable.innerHTML =
          '<tr><td colspan="6">Error loading scans</td></tr>';
      }
    }
  }

  displayRecentScans(records) {
    if (!this.recentScansTable) return;

    if (records.length === 0) {
      this.recentScansTable.innerHTML =
        '<tr><td colspan="6">No scans found for this period</td></tr>';
      return;
    }

    const html = records
      .map(
        (record) => `
            <tr>
                <td>${formatDate(record.scannedAt)}</td>
                <td>${formatTime(record.scannedAt)}</td>
                <td>${
                  record.userId
                    ? `${record.userId.firstName} ${record.userId.lastName}`
                    : "N/A"
                }</td>
                <td>${record.userId?.username || "N/A"}</td>
                <td>${record.massType}</td>
                <td>${record.notes || "-"}</td>
            </tr>
        `
      )
      .join("");

    this.recentScansTable.innerHTML = html;
  }

  async loadModeratorStats() {
    try {
      const response = await api.getModeratorStats();

      if (response.success) {
        this.displayStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }

  displayStats(stats) {
    if (!this.statsContainer) return;

    const html = `
            <div class="stat-card">
                <h3>Total Scans Today</h3>
                <p class="stat-number">${stats.totalScans}</p>
            </div>
        `;

    this.statsContainer.innerHTML = html;
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  new AttendanceManager();
});
