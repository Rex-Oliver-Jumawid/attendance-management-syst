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
    this.createForm = document.getElementById("createModeratorForm");
    this.createContainer = document.getElementById("createModeratorContainer");
    this.assignContainer = document.getElementById("assignModeratorContainer");
    this.showCreateBtn = document.getElementById("showCreateModeratorBtn");
    this.showAssignBtn = document.getElementById("showAssignModeratorBtn");
  }

  attachEventListeners() {
    if (this.assignForm) {
      this.assignForm.addEventListener("submit", (e) => this.handleAssign(e));
    }

    if (this.createForm) {
      this.createForm.addEventListener("submit", (e) => this.handleCreate(e));
    }

    if (this.showCreateBtn) {
      this.showCreateBtn.addEventListener("click", () => this.showCreateForm());
    }

    if (this.showAssignBtn) {
      this.showAssignBtn.addEventListener("click", () => this.showAssignForm());
    }
  }

  showCreateForm() {
    this.createContainer.style.display = "block";
    this.assignContainer.style.display = "none";
    this.showCreateBtn.classList.add("active");
    this.showAssignBtn.classList.remove("active");
  }

  showAssignForm() {
    this.createContainer.style.display = "none";
    this.assignContainer.style.display = "block";
    this.showCreateBtn.classList.remove("active");
    this.showAssignBtn.classList.add("active");
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
      const response = await api.getAllUsers({
        role: "member",
        isActive: true,
      });

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
              onclick="if(window.moderatorAssignment) { window.moderatorAssignment.removeModerator('${mod._id}', '${mod.firstName} ${mod.lastName}'); }"
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
    const username = document.getElementById("assignUsername").value.trim();
    const password = document.getElementById("assignPassword").value;
    const confirmPassword = document.getElementById(
      "assignConfirmPassword"
    ).value;

    if (!userId) {
      showError("Please select a member");
      return;
    }

    if (!username) {
      showError("Username is required");
      return;
    }

    if (!password || !confirmPassword) {
      showError("Password is required");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await api.assignModerator(userId, username, password);

      if (response.success) {
        showSuccess("Member assigned as moderator successfully!");
        this.assignForm.reset();
        await this.loadModerators();
        await this.loadAvailableUsers();
      }
    } catch (error) {
      showError(error.message || "Failed to assign moderator");
    }
  }

  async handleCreate(e) {
    e.preventDefault();

    const firstName = document.getElementById("modFirstName").value.trim();
    const lastName = document.getElementById("modLastName").value.trim();
    const email = document.getElementById("modEmail").value.trim();
    const username = document.getElementById("modUsername").value.trim();
    const password = document.getElementById("modPassword").value;
    const confirmPassword = document.getElementById("modConfirmPassword").value;

    // Validation
    if (!firstName || !lastName || !email || !username || !password) {
      showError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await api.createModerator({
        firstName,
        lastName,
        email,
        username,
        password,
      });

      if (response.success) {
        showSuccess("Moderator account created successfully!");
        this.createForm.reset();
        await this.loadModerators();
      }
    } catch (error) {
      showError(error.message || "Failed to create moderator");
    }
  }

  async removeModerator(userId, name) {
    console.log("removeModerator called with:", { userId, name });

    if (!userId) {
      showError("Invalid user ID");
      console.error("Remove moderator called with invalid userId:", userId);
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove moderator role from ${name}? They will be changed back to a regular member.`
      )
    ) {
      console.log("User cancelled removal");
      return;
    }

    try {
      console.log("Calling api.removeModerator with userId:", userId);
      const response = await api.removeModerator(userId);
      console.log("API response:", response);

      if (response.success) {
        showSuccess("Moderator role removed successfully!");
        await this.loadModerators();
        await this.loadAvailableUsers();
        this.refreshAdminStats();
      } else {
        console.error("Remove failed with response:", response);
        showError(response.message || "Failed to remove moderator");
      }
    } catch (error) {
      console.error("Remove moderator error:", error);
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
window.moderatorAssignment = null; // Make it globally accessible

document.addEventListener("DOMContentLoaded", () => {
  const moderatorsLink = document.querySelector(
    'a[href="#moderators-section"]'
  );
  if (moderatorsLink) {
    moderatorsLink.addEventListener("click", () => {
      if (!moderatorAssignment) {
        moderatorAssignment = new ModeratorAssignment();
        window.moderatorAssignment = moderatorAssignment; // Assign to window
      } else {
        // Reload data when navigating back to the section
        moderatorAssignment.loadModerators();
        moderatorAssignment.loadAvailableUsers();
      }
    });
  }
});
