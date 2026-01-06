// User Registration and Management for Moderators

let allUsers = [];

// Load users when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  setupUserRegistrationForm();
  setupUserSearch();
});

// Setup user registration form
function setupUserRegistrationForm() {
  const form = document.getElementById("registerUserForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    try {
      const userData = {
        firstName: document.getElementById("regFirstName").value.trim(),
        lastName: document.getElementById("regLastName").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        phoneNumber:
          document.getElementById("regPhone").value.trim() || undefined,
      };

      await api.registerUser(userData);

      showSuccess(
        `Member ${userData.firstName} ${userData.lastName} registered successfully!`
      );
      form.reset();
      await loadUsers();
    } catch (error) {
      showError(error.message || "Failed to register user");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

// Load all users
async function loadUsers() {
  try {
    const data = await api.getAllUsersForModerator();

    allUsers = data.data || [];
    renderUsersTable(allUsers);
  } catch (error) {
    console.error("Error loading users:", error);
    document.getElementById("usersTableBody").innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #e74c3c;">
          ${error.message || "Failed to load users"}
        </td>
      </tr>
    `;
  }
}

// Render users table
function renderUsersTable(users) {
  const tbody = document.getElementById("usersTableBody");

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">No users found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
    <tr>
      <td>${user.firstName} ${user.lastName}</td>
      <td>${user.email}</td>
      <td>${user.phoneNumber || "N/A"}</td>
      <td style="text-align: center;">
        ${
          user.qrCodeImage
            ? `<img src="${user.qrCodeImage}" alt="QR Code" style="width: 50px; height: 50px; cursor: pointer;" onclick="showQRCodeModal('${user._id}')" />`
            : "No QR"
        }
      </td>
      <td>
        <span style="color: ${user.isActive ? "#3d5a80" : "#e74c3c"};">
          ${user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button 
          class="btn-small btn-primary" 
          onclick="downloadQRCode('${user._id}')"
          ${!user.qrCodeImage ? "disabled" : ""}
        >
          Download QR
        </button>
        <button 
          class="btn-small ${user.isActive ? "btn-secondary" : "btn-success"}" 
          onclick="toggleUserStatus('${user._id}', ${!user.isActive})"
        >
          ${user.isActive ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

// Setup user search
function setupUserSearch() {
  const searchInput = document.getElementById("userSearchInput");

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
      renderUsersTable(allUsers);
      return;
    }

    const filtered = allUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );

    renderUsersTable(filtered);
  });
}

// Show QR Code Modal
function showQRCodeModal(userId) {
  const user = allUsers.find((u) => u._id === userId);
  if (!user || !user.qrCodeImage) {
    showError("QR code not found");
    return;
  }

  // Create modal
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
      <h3 style="margin-bottom: 20px;">${user.firstName} ${user.lastName}</h3>
      <img src="${user.qrCodeImage}" alt="QR Code" style="width: 300px; height: 300px; margin-bottom: 20px;" />
      <p style="margin-bottom: 20px; color: #666;">${user.email}</p>
      <button class="btn-primary" onclick="this.closest('div').parentElement.remove()">Close</button>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

// Download QR Code
async function downloadQRCode(userId) {
  const user = allUsers.find((u) => u._id === userId);
  if (!user || !user.qrCodeImage) {
    showError("QR code not found");
    return;
  }

  try {
    // Convert base64 to blob
    const base64Data = user.qrCodeImage.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `${user.firstName}_${user.lastName}_QR.png`.replace(
      /\s+/g,
      "_"
    );
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess("QR code downloaded successfully!");
  } catch (error) {
    console.error("Error downloading QR code:", error);
    showError("Failed to download QR code");
  }
}

// Toggle user status
async function toggleUserStatus(userId, newStatus) {
  const user = allUsers.find((u) => u._id === userId);
  if (!user) return;

  const action = newStatus ? "activate" : "deactivate";
  const displayName = user.username || `${user.firstName} ${user.lastName}`;

  if (!confirm(`Are you sure you want to ${action} ${displayName}?`)) {
    return;
  }

  try {
    const data = await api.updateUserStatusAsModerator(userId, newStatus);

    showSuccess(`User ${action}d successfully!`);
    await loadUsers();
  } catch (error) {
    showError(error.message || `Failed to ${action} user`);
  }
}

// Helper functions
function showSuccess(message) {
  alert(message);
}

function showError(message) {
  alert("Error: " + message);
}
