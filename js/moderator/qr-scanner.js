// QR Scanner for Moderators - With Mass Schedule Selection

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isProcessing = false;
    this.lastScannedCode = null;
    this.isScanning = false;
    this.schedules = [];

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    console.log("QRScanner initializing...");

    if (!auth.protectPage("moderator")) {
      console.log("Auth failed");
      return;
    }

    const scanLink = document.querySelector('a[href="#scan-section"]');
    if (scanLink) {
      console.log("Scan link found, adding listener");
      scanLink.addEventListener("click", () => {
        console.log("Scan section clicked");
        setTimeout(() => this.setupScanner(), 200);
      });
    } else {
      console.error("Scan link not found!");
    }
  }

  async setupScanner() {
    console.log("Setting up scanner...");

    this.scanForm = document.getElementById("scanForm");
    this.qrCodeInput = document.getElementById("qrCodeInput");
    this.massScheduleSelect = document.getElementById("massScheduleSelect");
    this.notes = document.getElementById("notes");
    this.scanBtn = document.getElementById("scanBtn");
    this.scanResult = document.getElementById("scanResult");
    this.startCameraBtn = document.getElementById("startCameraBtn");
    this.stopCameraBtn = document.getElementById("stopCameraBtn");
    this.stopCameraContainer = document.getElementById("stopCameraContainer");
    this.qrReader = document.getElementById("qr-reader");

    console.log("Elements found:", {
      startBtn: !!this.startCameraBtn,
      stopBtn: !!this.stopCameraBtn,
      stopContainer: !!this.stopCameraContainer,
      qrReader: !!this.qrReader,
      form: !!this.scanForm,
      scheduleSelect: !!this.massScheduleSelect,
    });

    if (!this.startCameraBtn || !this.qrReader || !this.massScheduleSelect) {
      console.error("Required elements not found!");
      return;
    }

    // Load mass schedules
    await this.loadMassSchedules();

    // Remove old listeners and add new ones
    const newStartBtn = this.startCameraBtn.cloneNode(true);
    this.startCameraBtn.parentNode.replaceChild(
      newStartBtn,
      this.startCameraBtn
    );
    this.startCameraBtn = newStartBtn;

    const newStopBtn = this.stopCameraBtn.cloneNode(true);
    this.stopCameraBtn.parentNode.replaceChild(newStopBtn, this.stopCameraBtn);
    this.stopCameraBtn = newStopBtn;

    this.startCameraBtn.addEventListener("click", () => {
      console.log("START BUTTON CLICKED!");
      this.startCamera();
    });

    this.stopCameraBtn.addEventListener("click", () => {
      console.log("STOP BUTTON CLICKED!");
      this.stopCamera();
    });

    if (this.scanForm) {
      this.scanForm.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    console.log("Scanner setup complete");
  }

  async loadMassSchedules() {
    try {
      console.log("=== LOADING MASS SCHEDULES ===");
      console.log("API endpoint:", API_CONFIG.ENDPOINTS.MASS_SCHEDULES);
      console.log(
        "Full URL:",
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MASS_SCHEDULES}?active=true`
      );

      const response = await api.getMassSchedules(true); // Only active schedules

      console.log("API Response:", response);

      if (response.success && response.schedules) {
        console.log("Schedules received:", response.schedules.length);
        this.schedules = response.schedules;
        console.log("Stored schedules:", this.schedules);
        this.updateScheduleDropdown();
      } else {
        console.error("Invalid response format:", response);
        this.massScheduleSelect.innerHTML =
          '<option value="">No schedules available</option>';
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      console.error("Error details:", error.message, error.stack);
      this.massScheduleSelect.innerHTML =
        '<option value="">Error loading schedules</option>';
    }
  }

  updateScheduleDropdown() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    console.log("Current day:", currentDay, "Current time:", currentTime);
    console.log("Today's date:", today.toDateString());

    // Filter schedules for today that haven't ended yet
    const availableSchedules = this.schedules.filter((schedule) => {
      console.log(
        "Checking schedule:",
        schedule.name,
        "Type:",
        schedule.scheduleType
      );

      // Check based on schedule type
      if (schedule.scheduleType === "specific") {
        // For specific dates, check if it matches today's date
        const scheduleDate = new Date(schedule.specificDate);
        scheduleDate.setHours(0, 0, 0, 0);

        console.log("Specific date schedule:", scheduleDate.toDateString());

        if (scheduleDate.getTime() !== today.getTime()) {
          console.log("Not today's date");
          return false;
        }
      } else {
        // For recurring schedules, check day of week
        if (!schedule.dayOfWeek || !schedule.dayOfWeek.includes(currentDay)) {
          console.log("Not today's day of week");
          return false;
        }
      }

      // Check if schedule hasn't ended yet
      if (currentTime > schedule.endTime) {
        console.log(
          `Schedule ${schedule.name} has ended (${schedule.endTime})`
        );
        return false;
      }

      console.log("✓ Schedule available:", schedule.name);
      return true;
    });

    console.log("Available schedules:", availableSchedules);

    // Update dropdown
    if (availableSchedules.length === 0) {
      this.massScheduleSelect.innerHTML =
        '<option value="">No active mass schedules for today</option>';
      this.massScheduleSelect.disabled = true;
      this.scanBtn.disabled = true;
      this.showResult(
        "⚠️ No active mass schedules available. Attendance cannot be recorded.",
        "error"
      );
    } else {
      this.massScheduleSelect.innerHTML =
        '<option value="">-- Select Mass Schedule --</option>';
      availableSchedules.forEach((schedule) => {
        const option = document.createElement("option");
        option.value = schedule._id;
        option.textContent = `${schedule.name} (${schedule.startTime} - ${schedule.endTime})`;
        option.dataset.massType = schedule.massType;
        this.massScheduleSelect.appendChild(option);
      });
      this.massScheduleSelect.disabled = false;
      this.scanBtn.disabled = false;
    }
  }

  async startCamera() {
    console.log("=== START CAMERA ===");

    if (this.isScanning) {
      console.log("Already scanning");
      return;
    }

    try {
      this.qrReader.style.display = "block";

      this.html5QrCode = new Html5Qrcode("qr-reader");

      await this.html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: 250,
          aspectRatio: 1.0,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        },
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => {
          // Silent
        }
      );

      console.log("✓✓✓ CAMERA STARTED SUCCESSFULLY ✓✓✓");
      this.isScanning = true;
      this.startCameraBtn.style.display = "none";

      if (this.stopCameraContainer) {
        this.stopCameraContainer.style.display = "block";
      }
    } catch (err) {
      console.error("❌ CAMERA ERROR:", err);
      this.qrReader.style.display = "none";
      alert("Camera Error: " + err.message);
      this.isScanning = false;
    }
  }

  async stopCamera() {
    console.log("=== STOP CAMERA ===");

    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        console.log("Camera stopped");
      } catch (err) {
        console.error("Error stopping:", err);
      }
    }

    this.html5QrCode = null;
    this.isScanning = false;
    this.qrReader.style.display = "none";
    this.startCameraBtn.style.display = "inline-block";

    if (this.stopCameraContainer) {
      this.stopCameraContainer.style.display = "none";
    }
  }

  onScanSuccess(decodedText) {
    console.log("🎉 QR SCANNED:", decodedText);

    if (this.isProcessing || this.lastScannedCode === decodedText) {
      console.log("Duplicate scan, ignoring");
      return;
    }

    // Play beep
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS67OihUBELTKXh8bllHAU2jdXzxnkqBSh+zPLaizsKFGCx6OyrWBQLSKHf87tnHgU0iNPzw3csBS1+zPDYijkHFmm98OWoVBIIRp/h8bxnHwUqgM/z2IwwBxZpu+LqrFoSCkSf4fG7aB4FKoDQ89eNMggVabzx5qlWEgpDnt/zuGgdBSh/zPDWizUIF2q77+esWRIIRZ/h8blnHgUpgdDz2IwwBxZpvPDlqFQSCEaf4fG8Zx8FKoDQ89eNMggVabzh6qxaEgpFn+Hxu2geBSqAz/PYjDAHFWi98OWpVRIKQ5/f87lpHAUof8zw1os1CBdqu+/nrFkSCEWf4PG5Zx4FKoHQ89eMMQcWabzx5qlWEgpDnuDzu2geBSl/0PPYjDAIFWi78OapVBIKRp/h8bxnHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG7Zx4FKYHO89iNMQcVabzw5alVEgpDnt/ztWgeBSl/zPDWizUIF2q77+esWRIIRZ7g8bxoHwUpgdDz14wwBxVpvOHqrFoSCkWf4PG7aB4FKYHO89iNMQcVabzx5qlWEgpDnuDztWgdBSh/zPDWizUIF2q77+esWRIIRZ7g8bxoHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG7aB4FKYHO89iMMQcVabzx5qlWEgpDnuDztWgdBSh+zPDXizYIF2q77+esWRIIRZ/g8bpoHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG6aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkWf4PG6aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCg=="
      );
      audio.play();
    } catch (e) {}

    this.isProcessing = true;
    this.lastScannedCode = decodedText;
    this.qrCodeInput.value = decodedText;

    this.showResult(
      "✅ QR Code scanned! Select mass schedule and submit.",
      "success"
    );

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Auto-stop camera after scanning
    setTimeout(() => {
      this.stopCamera();
    }, 500);
  }

  async handleSubmit(e) {
    e.preventDefault();

    const qrCode = this.qrCodeInput.value.trim();
    const scheduleId = this.massScheduleSelect.value;
    const notes = this.notes.value.trim();

    if (!qrCode) {
      this.showResult("Please scan QR code first", "error");
      return;
    }

    if (!scheduleId) {
      this.showResult("Please select a mass schedule", "error");
      return;
    }

    // Get mass type from selected option
    const selectedOption =
      this.massScheduleSelect.options[this.massScheduleSelect.selectedIndex];
    const massType = selectedOption.dataset.massType;

    this.scanBtn.disabled = true;
    this.scanBtn.textContent = "Recording...";

    try {
      const response = await api.scanQR({
        qrCode,
        notes,
        scheduleId,
        massType,
      });

      if (response.success) {
        this.showResult(
          `✓ Attendance recorded for ${response.record.user.name}! (${response.record.massType})`,
          "success"
        );
        this.resetForm();
        showSuccess("Attendance recorded successfully!");

        // Reload schedules in case time has changed
        await this.loadMassSchedules();
      }
    } catch (error) {
      this.showResult(error.message || "Failed to record attendance", "error");
      showError(error.message || "Failed to record attendance");
    } finally {
      this.scanBtn.disabled = false;
      this.scanBtn.textContent = "Record Attendance";
    }
  }

  resetForm() {
    this.qrCodeInput.value = "";
    this.massScheduleSelect.value = "";
    this.notes.value = "";
    this.isProcessing = false;
    this.lastScannedCode = null;
  }

  showResult(message, type) {
    if (!this.scanResult) return;
    this.scanResult.textContent = message;
    this.scanResult.className = `scan-result ${type}`;
    this.scanResult.style.display = "block";
  }
}

new QRScanner();
