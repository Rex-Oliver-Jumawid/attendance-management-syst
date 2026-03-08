class AttendanceContributionsManager {
  constructor() {
    this.currentRange = "day";
    this.attendanceData = [];
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadAttendance();
  }

  initElements() {
    this.scheduleAttendanceDisplay = document.getElementById(
      "scheduleAttendanceDisplay",
    );
    this.refreshBtn = document.getElementById("refreshAttendanceBtn");
  }

  attachEventListeners() {
    // Date range filter buttons
    document
      .querySelectorAll("#attendance-section .btn-filter[data-range]")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const range = e.target.dataset.range;
          this.currentRange = range;

          // Update active button
          document
            .querySelectorAll("#attendance-section .btn-filter[data-range]")
            .forEach((b) => {
              b.classList.remove("active");
            });
          e.target.classList.add("active");

          this.loadAttendance();
        });
      });

    // Refresh button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        this.loadAttendance();
      });
    }
  }

  async loadAttendance() {
    try {
      const params = { range: this.currentRange };

      const response = await api.getAdminAttendanceReports(params);

      if (response.success) {
        this.attendanceData = response.data;
        this.displayStats(response.stats, response.scheduleBreakdown);
        this.displayScheduleAttendance(response.scheduleBreakdown);
      } else {
        if (this.scheduleAttendanceDisplay) {
          this.scheduleAttendanceDisplay.innerHTML = `<p>Error: ${
            response.message || "Failed to load attendance"
          }</p>`;
        }
      }
    } catch (error) {
      console.error("Failed to load attendance:", error);
      if (this.scheduleAttendanceDisplay) {
        this.scheduleAttendanceDisplay.innerHTML = `<p>Failed to load attendance: ${error.message}</p>`;
      }
    }
  }

  async displayStats(stats, scheduleBreakdown) {
    document.getElementById("attendanceTotalCount").textContent =
      stats.totalAttendance || 0;
    document.getElementById("attendanceUniqueCount").textContent =
      stats.uniqueAttendees || 0;
    document.getElementById("attendanceScheduleCount").textContent =
      stats.schedulesUsed || 0;

    // Calculate total contributions
    let totalContributions = 0;
    if (scheduleBreakdown) {
      scheduleBreakdown.forEach((schedule) => {
        if (schedule.attendees) {
          schedule.attendees.forEach((attendee) => {
            if (attendee.contributionAmount) {
              totalContributions += attendee.contributionAmount;
            }
          });
        }
      });
    }

    document.getElementById("attendanceTotalContributions").textContent =
      `₱${totalContributions.toFixed(2)}`;
  }

  displayScheduleAttendance(scheduleBreakdown) {
    if (!this.scheduleAttendanceDisplay) return;

    if (!scheduleBreakdown || scheduleBreakdown.length === 0) {
      this.scheduleAttendanceDisplay.innerHTML =
        "<p>No schedules or attendance records found for this period</p>";
      return;
    }

    const html = scheduleBreakdown
      .map((schedule) => this.renderScheduleCard(schedule))
      .join("");
    this.scheduleAttendanceDisplay.innerHTML = html;
  }

  renderScheduleCard(schedule) {
    const attendeesHtml =
      schedule.attendees && schedule.attendees.length > 0
        ? `
        <div class="attendees-list" style="margin-top: 15px;">
          <strong style="display: block; margin-bottom: 10px;">Attendees (${
            schedule.attendees.length
          }):</strong>
          <div style="max-height: 500px; overflow-y: auto;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <thead style="background: #f8f9fa; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Email</th>
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
                    <td style="padding: 8px;">${a.userEmail || "N/A"}</td>
                    <td style="padding: 8px;">${formatTime(a.scannedAt)}</td>
                    <td style="padding: 8px;">
                      <input 
                        type="number" 
                        id="contrib-${a.userId}-${schedule.scheduleId}"
                        class="contribution-input"
                        value="${a.contributionAmount || ""}"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style="width: 100px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;"
                        ${a.contributionAmount ? "readonly" : ""}
                      />
                    </td>
                    <td style="padding: 8px;">
                      <button 
                        class="btn-primary btn-small"
                        style="padding: 4px 12px; font-size: 12px;"
                        onclick="attendanceContributionsManager.handleContribution('${
                          a.userId
                        }', '${schedule.scheduleId}', '${
                          a.contributionId || ""
                        }')"
                      >
                        ${a.contributionAmount ? "Edit" : "Declare"}
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
      <div class="schedule-card" style="margin-bottom: 20px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div class="schedule-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">
          <div>
            <h3 style="margin-bottom: 5px;">${schedule.scheduleName}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">${
              schedule.massType
            }</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="background: #3d5a80; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
              ${schedule.attendanceCount} Attendance${
                schedule.attendanceCount !== 1 ? "s" : ""
              }
            </span>
            <button 
              class="btn-primary" 
              onclick="attendanceContributionsManager.sendAbsenceFollowUp('${
                schedule.scheduleId
              }')"
              style="background: #ee6c4d; padding: 8px 12px; font-size: 13px; white-space: nowrap;"
              title="Send email to members who didn't attend">
              📧 Email Absent
            </button>
          </div>
        </div>
        <div class="schedule-body">
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

    if (!amount || amount <= 0) {
      showError("Please enter a valid contribution amount");
      return;
    }

    try {
      let response;

      if (existingContributionId) {
        // Pre-check: verify balance won't go negative
        try {
          const balanceResp = await api.getAvailableBalance();
          if (balanceResp.success) {
            const currentInput = document.getElementById(inputId);
            const oldAmount = parseFloat(currentInput.defaultValue) || 0;
            const diff = amount - oldAmount;
            const projectedBalance = balanceResp.data.availableBalance + diff;
            if (projectedBalance < 0) {
              showError(
                `Cannot update: this would result in a negative balance (₱${projectedBalance.toFixed(2)}).`,
              );
              return;
            }
          }
        } catch (balErr) {
          console.warn("Could not pre-check balance:", balErr);
        }

        // Update existing contribution — goes through balance check on the backend
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
            : "Contribution recorded successfully!",
        );
        input.setAttribute("readonly", true);
        button.textContent = "Edit";
        button.style.background = "#3d5a80";
        this.loadAttendance(); // Refresh to update stats
      } else {
        showError(response.message || "Failed to record contribution");
      }
    } catch (error) {
      console.error("Error recording contribution:", error);
      showError(error.message || "Failed to record contribution");
    }
  }

  async sendAbsenceFollowUp(scheduleId) {
    if (
      !confirm(
        "Send follow-up emails to members who didn't attend this schedule?",
      )
    ) {
      return;
    }

    try {
      showLoading("Sending emails to absent members...");
      const result = await fetch(
        `${API_CONFIG.BASE_URL}/moderator/schedules/${scheduleId}/send-absence-followup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            "Content-Type": "application/json",
          },
        },
      ).then((res) => res.json());

      hideLoading();

      if (result.success) {
        showSuccess(
          `Email sent to ${result.absentCount} absent member(s). ${result.attendedCount} member(s) attended.`,
        );
      } else {
        showError(result.message || "Failed to send emails");
      }
    } catch (error) {
      hideLoading();
      console.error("Error sending absence follow-up:", error);
      showError(error.message || "Failed to send absence follow-up emails");
    }
  }
}

// Initialize when on moderator page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const attendanceSection = document.getElementById("attendance-section");
    if (attendanceSection) {
      window.attendanceContributionsManager =
        new AttendanceContributionsManager();
    }
  });
} else {
  const attendanceSection = document.getElementById("attendance-section");
  if (attendanceSection) {
    window.attendanceContributionsManager =
      new AttendanceContributionsManager();
  }
}
