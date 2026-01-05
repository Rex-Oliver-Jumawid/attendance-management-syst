// QR Code Generator for Users

class QRGenerator {
  constructor() {
    this.currentSession = null;
    this.countdownInterval = null;
    this.init();
  }

  async init() {
    // Protect page - only users can access
    if (!auth.protectPage("user")) return;

    // Initialize UI
    this.initElements();
    this.attachEventListeners();

    // Check for existing active QR code
    await this.checkExistingQR();
  }

  initElements() {
    this.generateBtn = document.getElementById("generateQRBtn");
    this.qrDisplay = document.getElementById("qrCodeDisplay");
    this.qrImage = document.getElementById("qrCodeImage");
    this.qrMassType = document.getElementById("qrMassType");
    this.qrStatus = document.getElementById("qrStatus");
    this.expiryTime = document.getElementById("expiryTime");
    this.countdown = document.getElementById("countdown");
  }

  attachEventListeners() {
    if (this.generateBtn) {
      this.generateBtn.addEventListener("click", () => this.generateQR());
    }
  }

  async checkExistingQR() {
    try {
      const response = await api.checkQRStatus();
      if (
        response.success &&
        response.data &&
        response.data.status === "active"
      ) {
        this.currentSession = response.data;
        this.displayQR(response.data);
        this.startCountdown(new Date(response.data.expiresAt));
      }
    } catch (error) {
      console.log("No active QR code found");
    }
  }

  async generateQR() {
    try {
      // Disable button and show loading
      this.generateBtn.disabled = true;
      this.generateBtn.textContent = "Generating...";

      // Call API to generate QR
      const response = await api.generateQR();

      if (response.success) {
        this.currentSession = response.session;
        this.displayQR(response.session);
        this.startCountdown(new Date(response.session.expiresAt));
        showSuccess("QR code generated successfully!");
      }
    } catch (error) {
      // Check if error has session data (existing active QR)
      if (error.session) {
        this.currentSession = error.session;
        this.displayQR(error.session);
        this.startCountdown(new Date(error.session.expiresAt));
        showSuccess("Displaying your active QR code!");
      } else {
        showError(error.message || "Failed to generate QR code");
        this.generateBtn.disabled = false;
        this.generateBtn.textContent = "Generate QR Code";
      }
    }
  }

  displayQR(session) {
    // Show QR code image
    if (this.qrImage) {
      this.qrImage.src = session.qrCodeImage || session.qrCode;
    }

    // Show mass type
    if (this.qrMassType) {
      this.qrMassType.textContent = session.massType || "Other";
      this.qrMassType.style.color = "#0c1014";
      this.qrMassType.style.fontWeight = "600";
    }

    // Show QR display section
    if (this.qrDisplay) {
      this.qrDisplay.style.display = "block";
    }

    // Update status
    if (this.qrStatus) {
      this.qrStatus.textContent = "Active";
      this.qrStatus.className = "status-active";
    }

    // Show expiry time
    if (this.expiryTime) {
      this.expiryTime.textContent = formatDate(session.expiresAt);
    }

    // Update button
    this.generateBtn.textContent = "QR Code Active";
    this.generateBtn.disabled = true;

    // Start countdown if not already started
    if (session.expiresAt) {
      this.startCountdown(new Date(session.expiresAt));
    }
  }

  startCountdown(expiryDate) {
    // Clear existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Update countdown every second
    this.countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiryDate).getTime() - now;

      if (distance < 0) {
        this.handleExpiry();
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (this.countdown) {
        this.countdown.textContent = `${minutes}m ${seconds}s`;
      }
    }, 1000);
  }

  handleExpiry() {
    // Clear countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Update status
    if (this.qrStatus) {
      this.qrStatus.textContent = "Expired";
      this.qrStatus.className = "status-expired";
    }

    if (this.countdown) {
      this.countdown.textContent = "Expired";
    }

    // Enable generate button
    this.generateBtn.disabled = false;
    this.generateBtn.textContent = "Generate New QR Code";

    showError("QR code has expired. Please generate a new one.");
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  new QRGenerator();
});
