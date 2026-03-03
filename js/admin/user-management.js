// User Management for Admin

class UserManagement {
  constructor() {
    this.users = [];
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadUsers();
  }

  initElements() {
    this.usersTableBody = document.getElementById("usersTableBody");
    this.searchInput = document.getElementById("userSearchInput");
    this.roleFilter = document.getElementById("userRoleFilter");
    this.statusFilter = document.getElementById("userStatusFilter");
  }

  attachEventListeners() {
    // Search and filter
    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => this.filterUsers());
    }

    if (this.roleFilter) {
      this.roleFilter.addEventListener("change", () => this.filterUsers());
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", () => this.filterUsers());
    }
  }

  async loadUsers() {
    try {
      const response = await api.getAllUsers();

      if (response.success) {
        this.users = response.users;
        this.displayUsers(this.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      if (this.usersTableBody) {
        this.usersTableBody.innerHTML =
          '<tr><td colspan="7">Error loading users</td></tr>';
      }
    }
  }

  filterUsers() {
    const searchTerm = this.searchInput?.value.toLowerCase() || "";
    const roleFilter = this.roleFilter?.value || "";
    const statusFilter = this.statusFilter?.value || "";

    const filtered = this.users.filter((user) => {
      // Search filter
      const matchesSearch =
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.username?.toLowerCase().includes(searchTerm);

      // Role filter
      const matchesRole = !roleFilter || user.role === roleFilter;

      // Status filter
      const matchesStatus =
        !statusFilter || user.isActive.toString() === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

    this.displayUsers(filtered);
  }

  displayUsers(users) {
    if (!this.usersTableBody) return;

    if (users.length === 0) {
      this.usersTableBody.innerHTML =
        '<tr><td colspan="7">No user found</td></tr>';
      return;
    }

    const html = users
      .map(
        (user) => `
      <tr>
        <td>${user.firstName} ${user.lastName}</td>
        <td>${user.email}</td>
        <td>${user.username || "N/A"}</td>
        <td>
          <span class="badge badge-${user.role}">
            ${user.role.toUpperCase()}
          </span>
        </td>
        <td>
          <span class="badge ${
            user.isActive ? "badge-active" : "badge-inactive"
          }">
            ${user.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
          ${
            user.role === "admin"
              ? '<span style="color: #666; font-size: 13px;">Protected</span>'
              : user.role === "moderator"
                ? `<button 
                  class="btn-toggle btn-small" 
                  style="background-color: #FEC260; border: 2px solid black; width: 80px; border-radius: 6px;"
                  onclick="userManagement.demoteToMember('${user._id}')"
                >
                  Demote
                </button>`
                : `<button 
                  class="btn-toggle btn-small" 
                  style="background-color: #FF9898; border: 2px solid black; width: 80px; border-radius: 6px;"
                  onclick="userManagement.deleteUser('${user._id}')"
                >
                  Delete
                </button>`
          }
        </td>
      </tr>
    `,
      )
      .join("");

    this.usersTableBody.innerHTML = html;
  }

  async toggleUserStatus(userId, currentStatus) {
    try {
      const newStatus = !currentStatus;
      const action = newStatus ? "activate" : "deactivate";

      if (
        !confirm(
          `Are you sure you want to ${action} this user? ${
            !newStatus
              ? "They will not be able to log in or generate QR codes."
              : ""
          }`,
        )
      ) {
        return;
      }

      const response = await api.updateUserStatus(userId, newStatus);

      if (response.success) {
        showSuccess(
          `User ${newStatus ? "activated" : "deactivated"} successfully!`,
        );
        await this.loadUsers();
      }
    } catch (error) {
      showError(error.message || "Failed to update user status");
    }
  }

  async demoteToMember(userId) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) return;

    if (
      !confirm(
        `Are you sure you want to demote ${user.firstName} ${user.lastName} from Moderator to Member? Their moderator credentials will be removed.`,
      )
    ) {
      return;
    }

    try {
      const response = await api.removeModerator(userId);
      if (response.success) {
        showSuccess(
          `${user.firstName} ${user.lastName} has been demoted to Member.`,
        );
        await this.loadUsers();
        this.refreshAdminStats();
      }
    } catch (error) {
      showError(error.message || "Failed to demote user");
    }
  }

  async deleteUser(userId) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) return;

    if (
      !confirm(
        `Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This action cannot be undone and will remove all their records.`,
      )
    ) {
      return;
    }

    try {
      const response = await api.deleteUser(userId);
      if (response.success) {
        showSuccess(`${user.firstName} ${user.lastName} has been deleted.`);
        await this.loadUsers();
        this.refreshAdminStats();
      }
    } catch (error) {
      showError(error.message || "Failed to delete user");
    }
  }

  async refreshAdminStats() {
    try {
      const statsResponse = await api.getSystemStats();

      if (statsResponse.success) {
        document.getElementById("totalUsers").textContent =
          statsResponse.stats.totalUsers || 0;
        document.getElementById("totalModerators").textContent =
          statsResponse.stats.totalModerators || 0;
      }
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  }
}

// Initialize when users section is loaded
let userManagement;
document.addEventListener("DOMContentLoaded", () => {
  const usersLink = document.querySelector('a[href="#users-section"]');
  if (usersLink) {
    usersLink.addEventListener("click", () => {
      if (!userManagement) {
        userManagement = new UserManagement();
        window.userManagement = userManagement;
      } else {
        userManagement.loadUsers();
      }
    });
  }
});
