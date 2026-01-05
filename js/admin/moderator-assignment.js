// User Management for Admin

class UserManagement {
  constructor() {
    this.users = [];
    this.currentPage = 1;
    this.init();
  }

  init() {
    // Protect page
    if (!auth.protectPage("admin")) return;

    // Initialize UI
    this.initElements();
    this.attachEventListeners();
    this.loadUsers();
    updateNavbarUserInfo();
    initLogoutButton();
  }

  initElements() {
    this.usersTable = document.getElementById("usersTable");
    this.searchInput = document.getElementById("searchUsers");
    this.roleFilter = document.getElementById("roleFilter");
    this.refreshBtn = document.getElementById("refreshUsers");
  }

  attachEventListeners() {
    if (this.searchInput) {
      this.searchInput.addEventListener(
        "input",
        debounce(() => {
          this.loadUsers();
        }, 500)
      );
    }

    if (this.roleFilter) {
      this.roleFilter.addEventListener("change", () => {
        this.loadUsers();
      });
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        this.loadUsers();
      });
    }
  }

  async loadUsers() {
    try {
      showLoading(this.usersTable);

      const params = {};

      if (this.searchInput?.value) {
        params.search = this.searchInput.value;
      }

      if (this.roleFilter?.value) {
        params.role = this.roleFilter.value;
      }

      const response = await api.getAllUsers(params);

      if (response.success) {
        this.users = response.users;
        this.displayUsers(response.users);
      }
    } catch (error) {
      showError("Failed to load users");
      console.error(error);
    }
  }

  displayUsers(users) {
    if (!this.usersTable) return;

    if (users.length === 0) {
      this.usersTable.innerHTML =
        '<tr><td colspan="6">No users found</td></tr>';
      return;
    }

    const html = users
      .map(
        (user) => `
            <tr>
                <td>${user.username}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="badge badge-${user.role}">${
          user.role
        }</span></td>
                <td><span class="status-${
                  user.isActive ? "active" : "inactive"
                }">${user.isActive ? "Active" : "Inactive"}</span></td>
                <td>
                    <button onclick="userManagement.toggleUserStatus('${
                      user._id
                    }', ${!user.isActive})" class="btn-small">
                        ${user.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button onclick="userManagement.viewUser('${
                      user._id
                    }')" class="btn-small">View</button>
                </td>
            </tr>
        `
      )
      .join("");

    this.usersTable.innerHTML = html;
  }

  async toggleUserStatus(userId, isActive) {
    const action = isActive ? "activate" : "deactivate";

    if (!confirmAction(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const response = await api.updateUserStatus(userId, isActive);

      if (response.success) {
        showSuccess(`User ${action}d successfully`);
        this.loadUsers();
      }
    } catch (error) {
      showError(error.message || `Failed to ${action} user`);
    }
  }

  async viewUser(userId) {
    try {
      const response = await api.getUserById(userId);

      if (response.success) {
        this.showUserModal(response.user);
      }
    } catch (error) {
      showError("Failed to load user details");
    }
  }

  showUserModal(user) {
    alert(`
User Details:
--------------
Name: ${user.firstName} ${user.lastName}
Username: ${user.username}
Email: ${user.email}
Role: ${user.role}
Status: ${user.isActive ? "Active" : "Inactive"}
Attendance Count: ${user.attendanceCount || 0}
Joined: ${formatDate(user.createdAt)}
        `);
  }
}

// Initialize when page loads
let userManagement;
document.addEventListener("DOMContentLoaded", () => {
  userManagement = new UserManagement();
});
