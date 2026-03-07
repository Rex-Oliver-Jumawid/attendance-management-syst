// Contributions Manager for Moderators - Schedule Card View with Inline Declaration

class ContributionsManager {
  constructor() {
    this.currentRange = "day";
    this.scheduleData = [];
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadScheduleAttendance();
  }

  initElements() {
    this.scheduleAttendanceList = document.getElementById(
      "scheduleAttendanceList",
    );
  }

  attachEventListeners() {
    // Filter buttons
    document
      .querySelectorAll("#contributions-section .btn-filter[data-range]")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const range = e.target.dataset.range;
          this.currentRange = range;

          // Update active button
          document
            .querySelectorAll("#contributions-section .btn-filter[data-range]")
            .forEach((b) => {
              b.classList.remove("active");
            });
          e.target.classList.add("active");

          this.loadScheduleAttendance();
        });
      });
  }

  async loadScheduleAttendance() {
    try {
      // Fetch schedules and attendance records
      const [schedulesResp, attendanceResp, contributionsResp] =
        await Promise.all([
          api.getMassSchedules(),
          api.getModeratorRecentScans(1000, this.currentRange),
          api.getAllContributions(),
        ]);

      if (!schedulesResp.success || !attendanceResp.success) {
        throw new Error(
          schedulesResp.message ||
            attendanceResp.message ||
            "Failed to load data",
        );
      }

      const schedules = schedulesResp.schedules || schedulesResp.data || [];
      const attendanceRecords = attendanceResp.records || [];
      const contributions = contributionsResp.data || [];

      console.log("Schedules:", schedules.length);
      console.log("Attendance records:", attendanceRecords.length);

      // Helper to safely get string ID
      function getId(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (typeof val === "object") {
          if (val._id) return getId(val._id);
          if (val.$oid) return val.$oid;
        }
        return String(val);
      }

      // Group attendance by schedule ID (with fallback to massType for old records)
      const attendanceBySchedule = {};
      attendanceRecords.forEach((record) => {
        const scheduleId = getId(record.scheduleId);
        const userId = getId(record.userId);
        if (!userId) return;

        if (scheduleId) {
          // New records with scheduleId
          if (!attendanceBySchedule[scheduleId]) {
            attendanceBySchedule[scheduleId] = [];
          }
          attendanceBySchedule[scheduleId].push(record);
        }
      });

      console.log("Attendance by schedule:", attendanceBySchedule);
      console.log(
        "Schedule IDs:",
        schedules.map((s) => getId(s._id)),
      );

      // Filter schedules based on current range
      const now = new Date();
      const currentDay = now.getDay();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate date ranges
      let startDate, endDate;

      if (this.currentRange === "day") {
        // Today only
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
      } else if (this.currentRange === "week") {
        // This week (Sunday to Saturday)
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Go to Sunday
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Go to Saturday
        endDate.setHours(23, 59, 59, 999);
      } else if (this.currentRange === "month") {
        // This month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const filteredSchedules = schedules.filter((schedule) => {
        if (schedule.scheduleType === "specific") {
          const scheduleDate = new Date(schedule.specificDate);
          scheduleDate.setHours(0, 0, 0, 0);
          return scheduleDate >= startDate && scheduleDate <= endDate;
        } else {
          // For recurring schedules, check if any day in the range matches
          if (this.currentRange === "day") {
            return (
              schedule.dayOfWeek && schedule.dayOfWeek.includes(currentDay)
            );
          } else {
            // For week/month, include all recurring schedules
            return true;
          }
        }
      });

      // Build schedule data with attendees
      this.scheduleData = filteredSchedules.map((schedule) => {
        const scheduleId = getId(schedule._id);

        // Match attendance by scheduleId
        const attendees = (attendanceBySchedule[scheduleId] || []).map(
          (record) => {
            const userId = getId(record.userId);
            // Find contribution for this user and schedule
            const contrib = contributions.find(
              (c) =>
                getId(c.userId) === userId &&
                getId(c.scheduleId) === scheduleId,
            );

            return {
              userId: userId,
              userName: record.userId
                ? `${record.userId.firstName} ${record.userId.lastName}`
                : "Unknown",
              userEmail: record.userId ? record.userId.email : "N/A",
              scannedAt: record.scannedAt,
              contributionAmount: contrib ? contrib.amount : null,
              contributionId: contrib ? contrib._id : null,
            };
          },
        );

        return {
          scheduleId: schedule._id,
          scheduleName: schedule.name || `${schedule.massType}`,
          massType: schedule.massType,
          scheduleType: schedule.scheduleType || "recurring",
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          attendanceCount: attendees.length,
          attendees: attendees,
        };
      });

      this.displayStats();
      this.displayScheduleCards();
    } catch (error) {
      console.error("Failed to load schedule attendance:", error);
      if (this.scheduleAttendanceList) {
        this.scheduleAttendanceList.innerHTML = `<p style=\"color: #e74c3c;\">Failed to load schedules: ${error.message}</p>`;
      }
    }
  }

  displayStats() {
    const totalAttendance = this.scheduleData.reduce(
      (sum, s) => sum + s.attendanceCount,
      0,
    );

    // Count unique attendees
    const uniqueAttendees = new Set();
    this.scheduleData.forEach((schedule) => {
      schedule.attendees.forEach((attendee) => {
        uniqueAttendees.add(attendee.userId);
      });
    });

    const avgPerSchedule =
      this.scheduleData.length > 0
        ? Math.round(totalAttendance / this.scheduleData.length)
        : 0;

    document.getElementById("contribTotalAttendance").textContent =
      totalAttendance;
    document.getElementById("contribUniqueAttendees").textContent =
      uniqueAttendees.size;
    document.getElementById("contribScheduleCount").textContent =
      this.scheduleData.length;
    document.getElementById("contribAvgPerSchedule").textContent =
      avgPerSchedule;
  }

  displayScheduleCards() {
    if (!this.scheduleAttendanceList) return;

    if (!this.scheduleData || this.scheduleData.length === 0) {
      this.scheduleAttendanceList.innerHTML =
        "<p>No schedules found for this period</p>";
      return;
    }

    const html = this.scheduleData
      .map((schedule) => this.renderScheduleCard(schedule))
      .join("");
    this.scheduleAttendanceList.innerHTML = html;
  }

  renderScheduleCard(schedule) {
    const scheduleId = schedule.scheduleId || schedule._id;
    const hasAttendees = schedule.attendees && schedule.attendees.length > 0;

    const attendeesHtml = hasAttendees
      ? `
        <div style="margin-top: 15px;">
          <div style="max-height: 500px; overflow-y: auto;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <thead style="background: #f8f9fa; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Date</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Time</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Contribution</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${schedule.attendees
                  .map(
                    (a) => `
                  <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;">${a.userName || "N/A"}</td>
                    <td style="padding: 8px;">${formatDate(a.scannedAt)}</td>
                    <td style="padding: 8px;">${formatTime(a.scannedAt)}</td>
                    <td style="padding: 8px;">
                      <input 
                        type="number" 
                        id="contrib-${a.userId}-${scheduleId}"
                        class="contribution-input"
                        value="${a.contributionAmount != null ? a.contributionAmount : ""}"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style="width: 100px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;"
                        ${a.contributionAmount != null ? "readonly" : ""}
                      />
                    </td>
                    <td style="padding: 8px;">
                      <button 
                        class="btn-primary btn-small"
                        style="padding: 4px 12px; font-size: 12px; background: ${
                          a.contributionAmount != null
                            ? "rgb(108, 117, 125)"
                            : "#3d5a80"
                        };"
                        onclick="contributionsManager.handleContribution('${
                          a.userId
                        }', '${scheduleId}', '${a.contributionId || ""}')"
                      >
                        ${a.contributionAmount != null ? "Edit" : "Declare"}
                      </button>
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
      : '<p style="color: #999; margin-top: 10px;">No attendees for this period</p>';

    return `
      <div class="schedule-card">
        <div class="schedule-header">
          <div>
            <h3 style="margin-bottom: 5px;">${schedule.scheduleName}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">${
              schedule.massType
            }</p>
          </div>
          <span class="badge badge-active">
            ${schedule.attendees.length} Attendees
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

  async handleContribution(userId, scheduleId, existingContributionId) {
    const inputId = `contrib-${userId}-${scheduleId}`;
    const input = document.getElementById(inputId);
    const button = input
      .closest("tr")
      .querySelector('button[onclick*="handleContribution"]');

    if (button.textContent.trim() === "Edit") {
      // Enable editing
      input.removeAttribute("readonly");
      input.focus();
      button.textContent = "Save";
      button.style.background = "#28a745";
      return;
    }

    const amount = parseFloat(input.value);

    if (isNaN(amount) || amount < 0) {
      showError("Please enter a valid contribution amount");
      return;
    }

    try {
      let response;

      if (existingContributionId) {
        // Update existing contribution
        response = await api.updateContribution(existingContributionId, {
          amount: amount,
          notes: `Updated by moderator on ${new Date().toLocaleDateString()}`,
        });
      } else {
        // Create new contribution
        const data = {
          userId: userId,
          scheduleId: scheduleId,
          amount: amount,
          notes: `Declared by moderator on ${new Date().toLocaleDateString()}`,
        };
        response = await api.addContribution(data);
      }

      if (response.success) {
        showSuccess(
          existingContributionId
            ? "Contribution updated successfully"
            : "Contribution saved successfully",
        );
        this.loadScheduleAttendance();
      } else {
        throw new Error(response.message || "Failed to save contribution");
      }
    } catch (error) {
      console.error("Error saving contribution:", error);
      showError(error.message || "Failed to save contribution");
    }
  }
}

// Global instance
const contributionsManager = new ContributionsManager();
