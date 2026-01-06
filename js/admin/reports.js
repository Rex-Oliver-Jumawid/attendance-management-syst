class ReportsManager {
  constructor() {
    this.currentRange = "day";
    this.attendanceData = [];
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadReports();
  }

  initElements() {
    this.scheduleAttendanceList = document.getElementById(
      "scheduleAttendanceList"
    );
    this.refreshBtn = document.getElementById("refreshReportsBtn");
  }

  attachEventListeners() {
    // Date range filter buttons
    document.querySelectorAll(".btn-filter[data-range]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const range = e.target.dataset.range;
        this.currentRange = range;

        // Update active button
        document.querySelectorAll(".btn-filter[data-range]").forEach((b) => {
          b.classList.remove("active");
        });
        e.target.classList.add("active");

        this.loadReports();
      });
    });

    // Refresh button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        this.loadReports();
      });
    }
  }

  async loadReports() {
    try {
      const params = { range: this.currentRange };

      const response = await api.getAdminAttendanceReports(params);

      if (response.success) {
        this.attendanceData = response.data;
        this.displayStats(response.stats);
        this.displayScheduleAttendance(response.scheduleBreakdown);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
      if (this.scheduleAttendanceList) {
        this.scheduleAttendanceList.innerHTML = "<p>Failed to load reports</p>";
      }
    }
  }

  displayStats(stats) {
    document.getElementById("reportTotalAttendance").textContent =
      stats.totalAttendance || 0;
    document.getElementById("reportUniqueAttendees").textContent =
      stats.uniqueAttendees || 0;
    document.getElementById("reportScheduleCount").textContent =
      stats.schedulesUsed || 0;
    document.getElementById("reportAvgPerSchedule").textContent =
      stats.schedulesUsed > 0
        ? Math.round((stats.totalAttendance / stats.schedulesUsed) * 10) / 10
        : 0;
  }

  displayScheduleAttendance(scheduleBreakdown) {
    if (!this.scheduleAttendanceList) return;

    if (!scheduleBreakdown || scheduleBreakdown.length === 0) {
      this.scheduleAttendanceList.innerHTML =
        "<p>No attendance records found for selected period</p>";
      return;
    }

    const html = scheduleBreakdown
      .map((schedule) => this.renderScheduleCard(schedule))
      .join("");
    this.scheduleAttendanceList.innerHTML = html;
  }

  renderScheduleCard(schedule) {
    const attendeesHtml =
      schedule.attendees && schedule.attendees.length > 0
        ? `
        <div class="attendees-list" style="margin-top: 15px;">
          <strong style="display: block; margin-bottom: 10px;">Attendees (${
            schedule.attendees.length
          }):</strong>
          <div style="max-height: 300px; overflow-y: auto;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <thead style="background: #f8f9fa; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Username</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Date</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Time</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Scanned By</th>
                </tr>
              </thead>
              <tbody>
                ${schedule.attendees
                  .map(
                    (a) => `
                  <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;">${a.userName || "N/A"}</td>
                    <td style="padding: 8px;">${a.userUsername || "N/A"}</td>
                    <td style="padding: 8px;">${formatDate(a.scannedAt)}</td>
                    <td style="padding: 8px;">${formatTime(a.scannedAt)}</td>
                    <td style="padding: 8px;">${a.moderatorName || "N/A"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        <button 
          class="btn-secondary btn-small" 
          style="margin-top: 10px;"
          onclick="reportsManager.exportScheduleCSV('${
            schedule.scheduleId
          }', '${schedule.scheduleName}')"
        >
          📥 Export to CSV
        </button>
      `
        : '<p style="color: #999; margin-top: 10px;">No attendees for this period</p>';

    return `
      <div class="schedule-card" style="margin-bottom: 20px;">
        <div class="schedule-header">
          <div>
            <h3 style="margin-bottom: 5px;">${schedule.scheduleName}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">${
              schedule.massType
            }</p>
          </div>
          <span class="badge badge-active">
            ${schedule.attendanceCount} Attendance${
      schedule.attendanceCount !== 1 ? "s" : ""
    }
          </span>
        </div>
        <div class="schedule-body">
          <p><strong>Schedule Type:</strong> ${
            schedule.scheduleType === "recurring"
              ? "Weekly Recurring"
              : "Specific Date"
          }</p>
          <p><strong>Time:</strong> ${schedule.startTime} - ${
      schedule.endTime
    }</p>
          ${attendeesHtml}
        </div>
      </div>
    `;
  }

  exportScheduleCSV(scheduleId, scheduleName) {
    const schedule = this.attendanceData.find(
      (s) => s.scheduleId === scheduleId
    );
    if (!schedule || !schedule.attendees || schedule.attendees.length === 0) {
      showError("No attendance data to export");
      return;
    }

    // Create CSV content
    const headers = ["Name", "Username", "Date", "Time", "Scanned By"];
    const rows = schedule.attendees.map((a) => [
      a.userName || "N/A",
      a.userUsername || "N/A",
      formatDate(a.scannedAt),
      formatTime(a.scannedAt),
      a.moderatorName || "N/A",
    ]);

    let csvContent = headers.join(",") + "\n";
    csvContent += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${scheduleName.replace(/[^a-z0-9]/gi, "_")}_attendance_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess("CSV exported successfully!");
  }
}

// Initialize when on admin page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const reportsSection = document.getElementById("reports-section");
    if (reportsSection) {
      window.reportsManager = new ReportsManager();
    }
  });
} else {
  const reportsSection = document.getElementById("reports-section");
  if (reportsSection) {
    window.reportsManager = new ReportsManager();
  }
}
