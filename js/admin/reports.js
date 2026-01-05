// Reports Generation for Admin

class ReportsManager {
  constructor() {
    this.currentReport = null;
    this.init();
  }

  init() {
    // Protect page
    if (!auth.protectPage("admin")) return;

    // Initialize UI
    this.initElements();
    this.attachEventListeners();
    this.loadSystemStats();
    updateNavbarUserInfo();
    initLogoutButton();
  }

  initElements() {
    this.reportForm = document.getElementById("reportForm");
    this.startDateInput = document.getElementById("reportStartDate");
    this.endDateInput = document.getElementById("reportEndDate");
    this.generateBtn = document.getElementById("generateReportBtn");
    this.reportContainer = document.getElementById("reportContainer");
    this.statsContainer = document.getElementById("systemStats");
    this.exportBtn = document.getElementById("exportReportBtn");
  }

  attachEventListeners() {
    if (this.reportForm) {
      this.reportForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }

    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportReport();
      });
    }

    // Set default dates (last 30 days)
    if (this.startDateInput && this.endDateInput) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      this.endDateInput.value = today.toISOString().split("T")[0];
      this.startDateInput.value = thirtyDaysAgo.toISOString().split("T")[0];
    }
  }

  async generateReport() {
    try {
      showLoading(this.reportContainer);
      this.generateBtn.disabled = true;
      this.generateBtn.textContent = "Generating...";

      const params = {
        startDate: this.startDateInput.value,
        endDate: this.endDateInput.value,
      };

      const response = await api.generateReport(params);

      if (response.success) {
        this.currentReport = response.report;
        this.displayReport(response.report);
        showSuccess("Report generated successfully!");

        if (this.exportBtn) {
          this.exportBtn.style.display = "inline-block";
        }
      }
    } catch (error) {
      showError("Failed to generate report");
      console.error(error);
    } finally {
      this.generateBtn.disabled = false;
      this.generateBtn.textContent = "Generate Report";
    }
  }

  displayReport(report) {
    if (!this.reportContainer) return;

    const html = `
            <div class="report-section">
                <h2>Attendance Report</h2>
                <p class="report-period">
                    <strong>Period:</strong> ${formatDateShort(
                      report.period.startDate
                    )} - ${formatDateShort(report.period.endDate)}
                </p>

                <div class="report-summary">
                    <h3>Summary</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Total Attendance</h4>
                            <p class="stat-number">${
                              report.summary.totalAttendance
                            }</p>
                        </div>
                        <div class="stat-card">
                            <h4>Unique Attendees</h4>
                            <p class="stat-number">${
                              report.summary.uniqueAttendees
                            }</p>
                        </div>
                        <div class="stat-card">
                            <h4>Average per Day</h4>
                            <p class="stat-number">${
                              report.summary.averageAttendancePerDay
                            }</p>
                        </div>
                    </div>
                </div>

                <div class="report-breakdown">
                    <h3>Mass Type Breakdown</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Mass Type</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.massTypeBreakdown
                              .map(
                                (item) => `
                                <tr>
                                    <td>${item._id}</td>
                                    <td>${item.count}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <div class="report-top-attendees">
                    <h3>Top 10 Attendees</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Attendance Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.topAttendees
                              .map(
                                (item) => `
                                <tr>
                                    <td>${item._id.firstName} ${item._id.lastName}</td>
                                    <td>${item._id.username}</td>
                                    <td>${item.count}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <div class="report-moderators">
                    <h3>Moderator Performance</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Moderator</th>
                                <th>Scans Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.moderatorPerformance
                              .map(
                                (item) => `
                                <tr>
                                    <td>${item._id.firstName} ${item._id.lastName}</td>
                                    <td>${item.scansCount}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <div class="report-daily-trend">
                    <h3>Daily Attendance Trend</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.dailyTrend
                              .map(
                                (item) => `
                                <tr>
                                    <td>${item._id}</td>
                                    <td>${item.count}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    this.reportContainer.innerHTML = html;
  }

  async loadSystemStats() {
    try {
      const response = await api.getSystemStats();

      if (response.success) {
        this.displaySystemStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to load system stats:", error);
    }
  }

  displaySystemStats(stats) {
    if (!this.statsContainer) return;

    const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Users</h3>
                    <p class="stat-number">${stats.users.total}</p>
                </div>
                <div class="stat-card">
                    <h3>Moderators</h3>
                    <p class="stat-number">${stats.users.moderators}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Attendance</h3>
                    <p class="stat-number">${stats.attendance.total}</p>
                </div>
                <div class="stat-card">
                    <h3>Today's Attendance</h3>
                    <p class="stat-number">${stats.attendance.today}</p>
                </div>
                <div class="stat-card">
                    <h3>Active QR Sessions</h3>
                    <p class="stat-number">${stats.activeQRSessions}</p>
                </div>
            </div>
        `;

    this.statsContainer.innerHTML = html;
  }

  exportReport() {
    if (!this.currentReport) {
      showError("No report to export");
      return;
    }

    const filename = `attendance-report-${this.startDateInput.value}-to-${this.endDateInput.value}.json`;
    downloadJSON(this.currentReport, filename);
    showSuccess("Report exported successfully!");
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  new ReportsManager();
});
