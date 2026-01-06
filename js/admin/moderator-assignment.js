// Moderator Assignment for Admin

class ModeratorAssignment {
  constructor() {
    this.moderators = [];
    this.availableUsers = [];
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadModerators();
    this.loadAvailableUsers();
  }

  initElements() {
    this.moderatorsList = document.getElementById("moderatorsList");
    this.assignForm = document.getElementById("assignModeratorForm");
    this.userSelect = document.getElementById("userToAssign");
  }

  attachEventListeners() {
    if (this.assignForm) {
      this.assignForm.addEventListener("submit", (e) => this.handleAssign(e));
    }
  }

  async loadModerators() {
    try {
      const response = await api.getAllModerators();

      if (response.success) {
        this.moderators = response.moderators;
        this.displayModerators();
        this.refreshAdminStats(); // Add this line
      }
    } catch (error) {
      console.error("Failed to load moderators:", error);
      if (this.moderatorsList) {
        this.moderatorsList.innerHTML = "<p>Error loading moderators</p>";
      }
    }
  }

  async loadAvailableUsers() {
    try {
      const response = await api.getAllUsers({ role: "user", isActive: true });

      if (response.success) {
        this.availableUsers = response.users;
        this.populateUserSelect();
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }

  populateUserSelect() {
    if (!this.userSelect) return;

    const options = this.availableUsers
      .map(
        (user) =>
          `<option value="${user._id}">
            ${user.firstName} ${user.lastName} (${user.username})
          </option>`
      )
      .join("");

    this.userSelect.innerHTML =
      '<option value="">-- Select a user --</option>' + options;
  }

  displayModerators() {
    if (!this.moderatorsList) return;

    if (this.moderators.length === 0) {
      this.moderatorsList.innerHTML = "<p>No moderators assigned yet</p>";
      return;
    }

    const html = this.moderators
      .map(
        (mod) => `
        <div class="moderator-card">
          <div class="moderator-header">
            <div>
              <h4>${mod.firstName} ${mod.lastName}</h4>
              <p style="color: #666; margin: 5px 0;">
                <strong>Email:</strong> ${mod.email}<br>
                <strong>Username:</strong> ${mod.username}
              </p>
        
            </div>
            <span class="badge badge-active">MODERATOR</span>
          </div>
          <div class="moderator-actions">
            <button 
              class="btn-delete" 
              onclick="moderatorAssignment.removeModerator('${mod._id}', '${mod.firstName} ${mod.lastName}')"
            >
              Remove Moderator Role
            </button>
          </div>
        </div>
      `
      )
      .join("");

    this.moderatorsList.innerHTML = html;
  }

  async handleAssign(e) {
    e.preventDefault();

    const userId = this.userSelect.value;
    const notes = this.notesInput.value.trim();

    if (!userId) {
      showError("Please select a user");
      return;
    }

    try {
      const response = await api.assignModerator(userId);

      if (response.success) {
        showSuccess("Moderator assigned successfully!");
        this.assignForm.reset();
        await this.loadModerators();
        await this.loadAvailableUsers();
      }
    } catch (error) {
      showError(error.message || "Failed to assign moderator");
    }
  }

  async removeModerator(userId, name) {
    if (
      !confirm(
        `Are you sure you want to remove moderator role from ${name}? They will be changed back to a regular user.`
      )
    ) {
      return;
    }

    try {
      const response = await api.removeModerator(userId);

      if (response.success) {
        showSuccess("Moderator role removed successfully!");
        await this.loadModerators();
        await this.loadAvailableUsers();
      }
    } catch (error) {
      showError(error.message || "Failed to remove moderator");
    }
  }

  async refreshAdminStats() {
    try {
      const statsResponse = await api.getSystemStats();

      if (statsResponse.success) {
        document.getElementById("totalModerators").textContent =
          statsResponse.stats.totalModerators || 0;
      }
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  }
}

// Initialize when moderators section is loaded
let moderatorAssignment;
document.addEventListener("DOMContentLoaded", () => {
  const moderatorsLink = document.querySelector(
    'a[href="#moderators-section"]'
  );
  if (moderatorsLink) {
    moderatorsLink.addEventListener("click", () => {
      if (!moderatorAssignment) {
        moderatorAssignment = new ModeratorAssignment();
      }
    });
  }
});
