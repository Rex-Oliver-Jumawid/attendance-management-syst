class MassScheduleManager {
  constructor() {
    this.currentSchedule = null;
    console.log("MassScheduleManager initializing...");
    this.init();
  }

  init() {
    console.log("Loading schedules and attaching listeners...");
    this.attachEventListeners();
    this.loadSchedules();
  }

  attachEventListeners() {
    const form = document.getElementById("massScheduleForm");
    const cancelBtn = document.getElementById("cancelBtn");
    const createScheduleBtn = document.getElementById("createScheduleBtn");
    const scheduleTypeSelect = document.getElementById("scheduleType");

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

  async handleSubmit(e) {
    e.preventDefault();
    console.log("=== HANDLING FORM SUBMIT ===");

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
        document.querySelectorAll('input[name="dayOfWeek"]:checked')
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

    try {
      let response;
      if (this.currentSchedule) {
        console.log("Updating existing schedule:", this.currentSchedule._id);
        response = await api.updateMassSchedule(
          this.currentSchedule._id,
          scheduleData
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
      console.error("Error saving schedule:", error);
      showError(error.message || "Failed to save schedule");
    }
  }

  async loadSchedules() {
    console.log("Loading schedules...");
    try {
      const response = await api.getMassSchedules();
      console.log("Schedules loaded:", response);

      if (response.success) {
        this.renderSchedules(response.schedules);
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      showError("Failed to load schedules");
    }
  }

  renderSchedules(schedules) {
    const container = document.getElementById("schedulesList");
    console.log("Schedules container found:", !!container);
    console.log("Number of schedules:", schedules?.length);

    if (!container) return;

    if (!schedules || schedules.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">No mass schedules yet. Create one above!</p>';
      return;
    }

    container.innerHTML = schedules
      .map((schedule) => this.renderScheduleCard(schedule))
      .join("");

    // Attach event listeners to action buttons
    schedules.forEach((schedule) => {
      const editBtn = document.getElementById(`edit-${schedule._id}`);
      const toggleBtn = document.getElementById(`toggle-${schedule._id}`);
      const deleteBtn = document.getElementById(`delete-${schedule._id}`);

      if (editBtn) {
        editBtn.addEventListener("click", () => this.showForm(schedule));
      }
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () =>
          this.toggleStatus(schedule._id, !schedule.isActive)
        );
      }
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () =>
          this.deleteSchedule(schedule._id)
        );
      }
    });
  }

  renderScheduleCard(schedule) {
    const statusBadge = schedule.isActive
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>';

    let scheduleInfo = "";
    if (schedule.scheduleType === "specific") {
      const date = new Date(schedule.specificDate);
      scheduleInfo = `<p><strong>Date:</strong> ${date.toLocaleDateString()}</p>`;
    } else {
      const days = schedule.dayOfWeek
        .sort((a, b) => a - b)
        .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
        .join(", ");
      scheduleInfo = `<p><strong>Days:</strong> ${days}</p>`;
    }

    return `
      <div class="schedule-card ${!schedule.isActive ? "inactive" : ""}">
        <div class="schedule-header">
          <h3>${schedule.name}</h3>
          ${statusBadge}
        </div>
        <div class="schedule-body">
          <p><strong>Type:</strong> ${schedule.massType}</p>
          <p><strong>Schedule Type:</strong> ${
            schedule.scheduleType === "specific" ? "Specific Date" : "Recurring"
          }</p>
          ${scheduleInfo}
          <p><strong>Time:</strong> ${schedule.startTime} - ${
      schedule.endTime
    }</p>
        </div>
        <div class="schedule-actions">
          <button class="btn-edit" id="edit-${schedule._id}">Edit</button>
          <button class="btn-toggle" id="toggle-${schedule._id}">
            ${schedule.isActive ? "Deactivate" : "Activate"}
          </button>
          <button class="btn-delete" id="delete-${schedule._id}">Delete</button>
        </div>
      </div>
    `;
  }

  showForm(schedule = null) {
    this.currentSchedule = schedule;
    const formTitle = document.getElementById("formTitle");
    const scheduleTypeSelect = document.getElementById("scheduleType");
    const scheduleFormDiv = document.getElementById("scheduleForm");

    // Show the form
    if (scheduleFormDiv) {
      scheduleFormDiv.style.display = "block";
    }

    if (schedule) {
      formTitle.textContent = "Edit Mass Schedule";
      document.getElementById("scheduleId").value = schedule._id;
      document.getElementById("scheduleName").value = schedule.name;
      document.getElementById("massType").value = schedule.massType;
      document.getElementById("scheduleType").value = schedule.scheduleType;
      document.getElementById("startTime").value = schedule.startTime;
      document.getElementById("endTime").value = schedule.endTime;
      // Removed: isActive checkbox

      // Trigger schedule type change
      scheduleTypeSelect.dispatchEvent(new Event("change"));

      if (schedule.scheduleType === "specific") {
        const date = new Date(schedule.specificDate);
        document.getElementById("specificDate").value = date
          .toISOString()
          .split("T")[0];
      } else {
        schedule.dayOfWeek.forEach((day) => {
          const checkbox = document.querySelector(
            `input[name="dayOfWeek"][value="${day}"]`
          );
          if (checkbox) checkbox.checked = true;
        });
      }
    } else {
      formTitle.textContent = "Create New Mass Schedule";
      // Trigger to show recurring by default
      scheduleTypeSelect.dispatchEvent(new Event("change"));
    }

    document
      .getElementById("scheduleFormContainer")
      .scrollIntoView({ behavior: "smooth" });
  }

  resetForm() {
    this.currentSchedule = null;
    document.getElementById("formTitle").textContent =
      "Create New Mass Schedule";
    const form = document.getElementById("massScheduleForm");
    if (form) {
      form.reset();
    }
    const scheduleTypeSelect = document.getElementById("scheduleType");
    if (scheduleTypeSelect) {
      scheduleTypeSelect.value = "recurring";
      scheduleTypeSelect.dispatchEvent(new Event("change"));
    }
  }
  async toggleStatus(scheduleId, isActive) {
    try {
      await api.updateMassSchedule(scheduleId, { isActive });
      showSuccess(`Schedule ${isActive ? "activated" : "deactivated"}`);
      this.loadSchedules();
    } catch (error) {
      showError("Failed to update schedule status");
    }
  }

  async deleteSchedule(scheduleId) {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      await api.deleteMassSchedule(scheduleId);
      showSuccess("Schedule deleted successfully");
      this.loadSchedules();
    } catch (error) {
      showError("Failed to delete schedule");
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
