class MassScheduleManager {
  constructor() {
    this.currentSchedule = null;
    this.activeTab = "active"; // Track current tab
    this.isSubmitting = false; // Guard against double-submission
    this.allExpiredSchedules = []; // Cache for filtering
    this.expiredFilter = "today"; // Filter: 'all' | 'month' | 'today'
    console.log("MassScheduleManager initializing...");
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadSchedules();
    this.loadAdminStats();
  }

  initElements() {
    this.activeSchedulesList = document.getElementById("activeSchedulesList");
    this.expiredSchedulesList = document.getElementById("expiredSchedulesList");
    this.scheduleForm = document.getElementById("scheduleForm");
  }

  attachEventListeners() {
    const form = document.getElementById("massScheduleForm");
    const cancelBtn = document.getElementById("cancelBtn");
    const createScheduleBtn = document.getElementById("createScheduleBtn");
    const scheduleTypeSelect = document.getElementById("scheduleType");

    // Tab switching
    const activeTab = document.getElementById("activeTab");
    const expiredTab = document.getElementById("expiredTab");

    if (activeTab) {
      activeTab.addEventListener("click", () => {
        this.switchTab("active");
      });
    }

    if (expiredTab) {
      expiredTab.addEventListener("click", () => {
        this.switchTab("expired");
      });
    }

    // Expired schedule filter buttons
    ["expiredFilterAll", "expiredFilterMonth", "expiredFilterToday"].forEach(
      (id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener("click", () => {
            this.expiredFilter = btn.dataset.expiredFilter;
            document
              .querySelectorAll("[data-expired-filter]")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            this.filterAndDisplayExpired();
          });
        }
      },
    );

    console.log("Form found:", !!form);
    console.log("Cancel button found:", !!cancelBtn);
    console.log("Create schedule button found:", !!createScheduleBtn);
    console.log("Schedule type select found:", !!scheduleTypeSelect);

    // Show form when "Create New Schedule" button is clicked
    if (createScheduleBtn) {
      createScheduleBtn.addEventListener("click", () => {
        console.log("Create schedule button clicked");
        const scheduleFormDiv = document.getElementById("scheduleForm");
        if (scheduleFormDiv) {
          scheduleFormDiv.style.display = "block";
          this.resetForm();
          scheduleFormDiv.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        console.log("Form submitted!");
        this.handleSubmit(e);
      });
      console.log("Form submit listener attached");
    } else {
      console.error("Mass schedule form not found!");
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        console.log("Cancel button clicked");
        const scheduleFormDiv = document.getElementById("scheduleForm");
        if (scheduleFormDiv) {
          scheduleFormDiv.style.display = "none";
        }
        this.resetForm();
      });
    }

    // Toggle between recurring and specific date fields
    if (scheduleTypeSelect) {
      scheduleTypeSelect.addEventListener("change", (e) => {
        console.log("Schedule type changed to:", e.target.value);
        const dayOfWeekGroup = document.getElementById("dayOfWeekGroup");
        const specificDateGroup = document.getElementById("specificDateGroup");
        const specificDateInput = document.getElementById("specificDate");

        if (e.target.value === "specific") {
          dayOfWeekGroup.style.display = "none";
          specificDateGroup.style.display = "block";
          specificDateInput.required = true;
          // Clear day of week checkboxes
          document
            .querySelectorAll('input[name="dayOfWeek"]')
            .forEach((cb) => (cb.checked = false));
        } else {
          dayOfWeekGroup.style.display = "block";
          specificDateGroup.style.display = "none";
          specificDateInput.required = false;
          specificDateInput.value = "";
        }
      });
    }
  }

  switchTab(tab) {
    this.activeTab = tab;

    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .getElementById(tab === "active" ? "activeTab" : "expiredTab")
      .classList.add("active");

    // Update tab content
    const filterBar = document.getElementById("expiredFilterBar");
    if (tab === "active") {
      this.activeSchedulesList.style.display = "block";
      this.expiredSchedulesList.style.display = "none";
      if (filterBar) filterBar.style.display = "none";
    } else {
      this.activeSchedulesList.style.display = "none";
      this.expiredSchedulesList.style.display = "block";
      if (filterBar) filterBar.style.display = "flex";
    }
  }

  filterAndDisplayExpired() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDate = now.getDate();

    let filtered = this.allExpiredSchedules;

    if (this.expiredFilter === "today") {
      filtered = this.allExpiredSchedules.filter((s) => {
        if (!s.specificDate) return false;
        const d = new Date(s.specificDate);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() === currentDate
        );
      });
    } else if (this.expiredFilter === "month") {
      filtered = this.allExpiredSchedules.filter((s) => {
        if (!s.specificDate) return false;
        const d = new Date(s.specificDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    this.displaySchedules(filtered, this.expiredSchedulesList, true);
  }

  async handleSubmit(e) {
    e.preventDefault();
    console.log("=== HANDLING FORM SUBMIT ===");

    if (this.isSubmitting) {
      console.log("Submission already in progress, ignoring duplicate submit");
      return;
    }

    const scheduleType = document.getElementById("scheduleType").value;
    console.log("Schedule type:", scheduleType);

    const scheduleData = {
      name: document.getElementById("scheduleName").value,
      massType: document.getElementById("massType").value,
      scheduleType: scheduleType,
      startTime: document.getElementById("startTime").value,
      endTime: document.getElementById("endTime").value,
      isActive: true, // Always active by default
    };

    console.log("Base schedule data:", scheduleData);

    if (scheduleType === "recurring") {
      const checkedDays = Array.from(
        document.querySelectorAll('input[name="dayOfWeek"]:checked'),
      ).map((cb) => parseInt(cb.value));

      console.log("Checked days:", checkedDays);

      if (checkedDays.length === 0) {
        showError("Please select at least one day of the week");
        return;
      }
      scheduleData.dayOfWeek = checkedDays;
    } else {
      const specificDate = document.getElementById("specificDate").value;
      console.log("Specific date:", specificDate);

      if (!specificDate) {
        showError("Please select a specific date");
        return;
      }
      scheduleData.specificDate = specificDate;
      scheduleData.dayOfWeek = []; // Empty array for specific dates
    }

    console.log("Final schedule data:", scheduleData);

    const submitBtn = document.querySelector(
      "#massScheduleForm button[type='submit']",
    );
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
    }
    this.isSubmitting = true;

    try {
      let response;
      if (this.currentSchedule) {
        console.log("Updating existing schedule:", this.currentSchedule._id);
        response = await api.updateMassSchedule(
          this.currentSchedule._id,
          scheduleData,
        );
        showSuccess("Schedule updated successfully!");
      } else {
        console.log("Creating new schedule...");
        response = await api.createMassSchedule(scheduleData);
        console.log("Create response:", response);
        showSuccess("Schedule created successfully!");
      }

      this.resetForm();
      this.loadSchedules();

      // Hide form after success
      const scheduleFormDiv = document.getElementById("scheduleForm");
      if (scheduleFormDiv) {
        scheduleFormDiv.style.display = "none";
      }
    } catch (error) {
      console.error("Form submission error:", error);
      showError(error.message || "Failed to save schedule");
      // Re-enable button on error so user can fix and retry
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Schedule";
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async loadSchedules() {
    try {
      const response = await api.getMassSchedules();

      if (response.success) {
        // Separate active and expired schedules
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(
          2,
          "0",
        )}:${String(now.getMinutes()).padStart(2, "0")}`;
        const currentDay = now.getDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeSchedules = [];
        const expiredSchedules = [];

        response.schedules.forEach((schedule) => {
          let isExpired = false;

          if (schedule.scheduleType === "specific") {
            // For specific date schedules, check if date has passed
            const scheduleDate = new Date(schedule.specificDate);
            scheduleDate.setHours(0, 0, 0, 0);

            if (scheduleDate < today) {
              isExpired = true;
            } else if (scheduleDate.getTime() === today.getTime()) {
              // If it's today, check if time has passed
              if (currentTime > schedule.endTime) {
                isExpired = true;
              }
            }
          } else {
            // For recurring schedules, check if today's time has passed
            if (
              schedule.dayOfWeek.includes(currentDay) &&
              currentTime > schedule.endTime
            ) {
              // Only mark as "passed for today" but keep in active since it recurs
              // Don't move recurring schedules to expired
              isExpired = false;
            }
          }

          if (isExpired && schedule.isActive) {
            expiredSchedules.push(schedule);
          } else {
            activeSchedules.push(schedule);
          }
        });

        this.displaySchedules(activeSchedules, this.activeSchedulesList, false);
        this.allExpiredSchedules = expiredSchedules;
        this.filterAndDisplayExpired();
        this.loadAdminStats();
      }
    } catch (error) {
      console.error("Failed to load schedules:", error);
      if (this.activeSchedulesList) {
        this.activeSchedulesList.innerHTML = "<p>Failed to load schedules</p>";
      }
    }
  }

  displaySchedules(schedules, container, isExpired) {
    if (!container) return;

    if (schedules.length === 0) {
      container.innerHTML = `<p>No ${
        isExpired ? "expired" : "active"
      } schedules</p>`;
      return;
    }

    const html = schedules
      .map((schedule) => this.renderScheduleCard(schedule, isExpired))
      .join("");

    container.innerHTML = html;
  }

  renderScheduleCard(schedule, isExpired) {
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    let scheduleInfo = "";
    if (schedule.scheduleType === "specific") {
      scheduleInfo = `<strong>Date:</strong> ${formatDateShort(
        schedule.specificDate,
      )}`;
    } else {
      const dayNames = schedule.dayOfWeek
        .map((day) => daysOfWeek[day])
        .join(", ");
      scheduleInfo = `<strong>Days:</strong> ${dayNames}`;
    }

    return `
      <div class="schedule-card ${
        !schedule.isActive || isExpired ? "inactive" : ""
      }">
        <div class="schedule-header">
          <h3>${schedule.name}</h3>
          <span class="badge ${
            schedule.isActive && !isExpired ? "badge-active" : "badge-inactive"
          }">
            ${isExpired ? "EXPIRED" : schedule.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div class="schedule-body">
          <p><strong>Type:</strong> ${schedule.massType}</p>
          <p>${scheduleInfo}</p>
          <p><strong>Time:</strong> ${schedule.startTime} - ${
            schedule.endTime
          }</p>
          <p><strong>Schedule Type:</strong> ${
            schedule.scheduleType === "recurring"
              ? "Weekly Recurring"
              : "Specific Date"
          }</p>
        </div>
        <div class="schedule-actions">
          ${
            !isExpired
              ? `
            <button class="btn-edit" onclick="massScheduleManager.showForm(${JSON.stringify(
              schedule,
            ).replace(/"/g, "&quot;")})">
              Edit
            </button>
            <button class="btn-toggle" onclick="massScheduleManager.toggleStatus('${
              schedule._id
            }', ${schedule.isActive})">
              ${schedule.isActive ? "Deactivate" : "Activate"}
            </button>
          `
              : `
            <button class="btn-primary" onclick="massScheduleManager.sendAbsenceFollowUp('${schedule._id}')" 
              style="background: #ee6c4d; padding: 8px 12px; font-size: 0.9em;">
              Email Absent Members
            </button>
          `
          }
          <button class="btn-delete" onclick="massScheduleManager.deleteSchedule('${
            schedule._id
          }')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  showForm(schedule = null) {
    const scheduleFormDiv = document.getElementById("scheduleForm");
    const formTitle = document.getElementById("formTitle");
    const dayOfWeekGroup = document.getElementById("dayOfWeekGroup");
    const specificDateGroup = document.getElementById("specificDateGroup");

    if (schedule) {
      this.currentSchedule = schedule;
      formTitle.textContent = "Edit Mass Schedule";

      document.getElementById("scheduleName").value = schedule.name;
      document.getElementById("massType").value = schedule.massType;
      document.getElementById("scheduleType").value = schedule.scheduleType;
      document.getElementById("startTime").value = schedule.startTime;
      document.getElementById("endTime").value = schedule.endTime;

      if (schedule.scheduleType === "recurring") {
        dayOfWeekGroup.style.display = "block";
        specificDateGroup.style.display = "none";

        document
          .querySelectorAll('input[name="dayOfWeek"]')
          .forEach((checkbox) => {
            checkbox.checked = schedule.dayOfWeek.includes(
              parseInt(checkbox.value),
            );
          });
      } else {
        dayOfWeekGroup.style.display = "none";
        specificDateGroup.style.display = "block";
        document.getElementById("specificDate").value = schedule.specificDate
          ? schedule.specificDate.split("T")[0]
          : "";
      }
    } else {
      this.currentSchedule = null;
      formTitle.textContent = "Create New Mass Schedule";
      this.resetForm();
    }

    if (scheduleFormDiv) {
      scheduleFormDiv.style.display = "block";
      scheduleFormDiv.scrollIntoView({ behavior: "smooth" });
    }
  }

  resetForm() {
    const form = document.getElementById("massScheduleForm");
    if (form) {
      form.reset();
    }
    this.currentSchedule = null;
    this.isSubmitting = false;

    // Restore submit button in case it was disabled by a previous submission
    const submitBtn = document.querySelector(
      "#massScheduleForm button[type='submit']",
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save Schedule";
    }

    const dayOfWeekGroup = document.getElementById("dayOfWeekGroup");
    const specificDateGroup = document.getElementById("specificDateGroup");
    if (dayOfWeekGroup) dayOfWeekGroup.style.display = "block";
    if (specificDateGroup) specificDateGroup.style.display = "none";
  }

  async toggleStatus(scheduleId, isActive) {
    // Implementation remains the same
    try {
      await api.updateMassSchedule(scheduleId, { isActive: !isActive });
      showSuccess(
        `Schedule ${!isActive ? "activated" : "deactivated"} successfully!`,
      );
      this.loadSchedules();
    } catch (error) {
      showError(error.message || "Failed to update schedule status");
    }
  }

  async deleteSchedule(scheduleId) {
    if (
      !confirm(
        "Are you sure you want to delete this schedule? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await api.deleteMassSchedule(scheduleId);
      showSuccess("Schedule deleted successfully!");
      this.loadSchedules();
    } catch (error) {
      showError(error.message || "Failed to delete schedule");
    }
  }

  async loadAdminStats() {
    try {
      const statsResponse = await api.getSystemStats();
      const schedulesResponse = await api.getMassSchedules();

      if (statsResponse.success) {
        const stats = statsResponse.stats;

        document.getElementById("totalUsers").textContent =
          stats.totalUsers || 0;
        document.getElementById("totalModerators").textContent =
          stats.totalModerators || 0;

        // Calculate active and expired schedules
        if (schedulesResponse.schedules) {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(
            2,
            "0",
          )}:${String(now.getMinutes()).padStart(2, "0")}`;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let activeCount = 0;
          let expiredCount = 0;

          schedulesResponse.schedules.forEach((schedule) => {
            let isExpired = false;

            if (schedule.scheduleType === "specific") {
              const scheduleDate = new Date(schedule.specificDate);
              scheduleDate.setHours(0, 0, 0, 0);

              if (scheduleDate < today) {
                isExpired = true;
              } else if (scheduleDate.getTime() === today.getTime()) {
                if (currentTime > schedule.endTime) {
                  isExpired = true;
                }
              }
            }
            // Recurring schedules never expire

            if (isExpired && schedule.isActive) {
              expiredCount++;
            } else {
              activeCount++;
            }
          });

          document.getElementById("activeSchedules").textContent = activeCount;
          document.getElementById("expiredSchedules").textContent =
            expiredCount;
        } else {
          document.getElementById("activeSchedules").textContent = 0;
          document.getElementById("expiredSchedules").textContent = 0;
        }
      }
    } catch (error) {
      console.error("Failed to load admin stats:", error);
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
      const result = await api.sendAbsenceFollowUp(scheduleId);
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

// Initialize when DOM is ready AND we're on admin page
console.log("mass-schedule-manager.js loaded");
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, checking for admin page...");
    const scheduleForm = document.getElementById("massScheduleForm");
    if (scheduleForm) {
      console.log("Admin page detected, initializing MassScheduleManager");
      window.massScheduleManager = new MassScheduleManager();
    } else {
      console.log("Not on admin page, skipping initialization");
    }
  });
} else {
  console.log("DOM already loaded, checking for admin page...");
  const scheduleForm = document.getElementById("massScheduleForm");
  if (scheduleForm) {
    console.log("Admin page detected, initializing MassScheduleManager");
    window.massScheduleManager = new MassScheduleManager();
  }
}
