// Attendance History for Users

class AttendanceHistory {
  constructor() {
    this.currentPage = 1;
    this.limit = 20;
    this.init();
  }

  init() {
    // Protect page
    if (!auth.protectPage("user")) return;

    // Initialize UI
    this.initElements();
    this.attachEventListeners();
    this.loadAttendanceHistory();
    this.loadAttendanceStats();
    updateNavbarUserInfo();
    initLogoutButton();
  }

  initElements() {
    this.historyTable = document.getElementById("attendanceHistoryTable");
    this.statsContainer = document.getElementById("attendanceStats");
    this.filterForm = document.getElementById("filterForm");
    this.startDateInput = document.getElementById("startDate");
    this.endDateInput = document.getElementById("endDate");
    this.prevPageBtn = document.getElementById("prevPage");
    this.nextPageBtn = document.getElementById("nextPage");
    this.currentPageSpan = document.getElementById("currentPage");
  }

  attachEventListeners() {
    if (this.filterForm) {
      this.filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.currentPage = 1;
        this.loadAttendanceHistory();
      });
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadAttendanceHistory();
        }
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        this.currentPage++;
        this.loadAttendanceHistory();
      });
    }
  }

  async loadAttendanceHistory() {
    try {
      showLoading(this.historyTable);

      const params = {
        page: this.currentPage,
        limit: this.limit,
      };

      if (this.startDateInput?.value) {
        params.startDate = this.startDateInput.value;
      }
      if (this.endDateInput?.value) {
        params.endDate = this.endDateInput.value;
      }

      const response = await api.getUserAttendanceHistory(params);

      if (response.success) {
        this.displayHistory(response.records);
        this.updatePagination(response.page, response.totalPages);
      }
    } catch (error) {
      showError("Failed to load attendance history");
      console.error(error);
    }
  }

  displayHistory(records) {
    if (!this.historyTable) return;

    if (records.length === 0) {
      this.historyTable.innerHTML =
        '<tr><td colspan="4">No attendance records found</td></tr>';
      return;
    }

    const html = records
      .map(
        (record) => `
            <tr>
                <td>${formatDate(record.scannedAt)}</td>
                <td>${record.massType}</td>
                <td>${
                  record.moderatorId
                    ? `${record.moderatorId.firstName} ${record.moderatorId.lastName}`
                    : "N/A"
                }</td>
                <td>${record.notes || "-"}</td>
            </tr>
        `
      )
      .join("");

    this.historyTable.innerHTML = html;
  }

  updatePagination(currentPage, totalPages) {
    if (this.currentPageSpan) {
      this.currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = currentPage <= 1;
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = currentPage >= totalPages;
    }
  }

  async loadAttendanceStats() {
    try {
      const params = {};

      if (this.startDateInput?.value) {
        params.startDate = this.startDateInput.value;
      }
      if (this.endDateInput?.value) {
        params.endDate = this.endDateInput.value;
      }

      const response = await api.getUserAttendanceStats(params);

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
                <h3>Total Attendance</h3>
                <p class="stat-number">${stats.total}</p>
            </div>
            <div class="stat-card">
                <h3>Period</h3>
                <p class="stat-text">${formatDateShort(
                  stats.period.startDate
                )} - ${formatDateShort(stats.period.endDate)}</p>
            </div>
        `;

    this.statsContainer.innerHTML = html;
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  new AttendanceHistory();
});
