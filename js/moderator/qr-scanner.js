// QR Scanner for Moderators - With Mass Schedule Selection

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isProcessing = false;
    this.lastScannedCode = null;
    this.isScanning = false;
    this.schedules = [];
    this.selectedSchedule = null;
    this.sessionScans = [];
    this.scannedCodes = new Set(); // Track scanned codes in this session
    this.resultTimeout = null; // For auto-hiding messages

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

    // Get all elements
    this.scheduleSelectionView = document.getElementById(
      "scheduleSelectionView",
    );
    this.scanningView = document.getElementById("scanningView");
    this.scheduleCardsContainer = document.getElementById(
      "scheduleCardsContainer",
    );
    this.backToSchedulesBtn = document.getElementById("backToSchedulesBtn");
    this.selectedScheduleName = document.getElementById("selectedScheduleName");
    this.scannedCount = document.getElementById("scannedCount");
    this.lastScannedName = document.getElementById("lastScannedName");
    this.attendanceRecordsBody = document.getElementById(
      "attendanceRecordsBody",
    );

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
      scheduleSelectionView: !!this.scheduleSelectionView,
      scanningView: !!this.scanningView,
      startBtn: !!this.startCameraBtn,
      stopBtn: !!this.stopCameraBtn,
      qrReader: !!this.qrReader,
      scheduleCardsContainer: !!this.scheduleCardsContainer,
    });

    if (!this.scheduleSelectionView || !this.scanningView) {
      console.error("Required elements not found!");
      return;
    }

    if (!this.qrReader) {
      console.error("QR Reader element not found!");
      return;
    }

    // Show schedule selection view
    this.showScheduleSelection();

    // Load mass schedules
    await this.loadMassSchedules();

    // Setup event listeners
    if (this.backToSchedulesBtn) {
      this.backToSchedulesBtn.addEventListener("click", () => {
        this.stopCamera();
        this.showScheduleSelection();
      });
    }

    // Remove old listeners and add new ones
    const newStartBtn = this.startCameraBtn.cloneNode(true);
    this.startCameraBtn.parentNode.replaceChild(
      newStartBtn,
      this.startCameraBtn,
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

  showScheduleSelection() {
    this.scheduleSelectionView.style.display = "block";
    this.scanningView.style.display = "none";
    this.selectedSchedule = null;
    // Don't clear sessionScans and scannedCodes - keep the count
  }

  showScanningView(schedule) {
    console.log("showScanningView called for schedule:", schedule.name);
    console.log("Current sessionScans.length:", this.sessionScans.length);

    // Only clear if switching to a different schedule
    if (!this.selectedSchedule || this.selectedSchedule._id !== schedule._id) {
      console.log("New schedule selected, clearing scans");
      this.sessionScans = [];
      this.scannedCodes.clear();
    } else {
      console.log("Same schedule, keeping scans");
    }

    this.selectedSchedule = schedule;
    this.scheduleSelectionView.style.display = "none";
    this.scanningView.style.display = "block";

    // Update schedule name
    if (this.selectedScheduleName) {
      this.selectedScheduleName.textContent = `${schedule.name} (${schedule.startTime} - ${schedule.endTime})`;
    }

    // Reset counters
    this.updateScanStats();
    console.log("Updated stats, current count:", this.sessionScans.length);

    // Load attendance records for this schedule
    this.loadAttendanceRecords();
  }

  updateScanStats() {
    console.log(
      "updateScanStats called. sessionScans.length:",
      this.sessionScans.length,
    );
    console.log("scannedCount element:", this.scannedCount);

    if (this.scannedCount) {
      this.scannedCount.textContent = this.sessionScans.length;
      console.log("Updated scannedCount to:", this.sessionScans.length);
    } else {
      console.error("scannedCount element not found!");
    }

    if (this.lastScannedName && this.sessionScans.length > 0) {
      const lastScan = this.sessionScans[this.sessionScans.length - 1];
      this.lastScannedName.textContent = lastScan.user.name;
      console.log("Updated lastScannedName to:", lastScan.user.name);
    }
  }

  addToRecentScans(scanData) {
    console.log("addToRecentScans called with:", scanData);
    this.sessionScans.push(scanData);
    console.log("sessionScans after push:", this.sessionScans.length);
    this.updateScanStats();

    // Reload attendance records to show the new scan
    this.loadAttendanceRecords();
  }

  async loadMassSchedules() {
    try {
      console.log("=== LOADING MASS SCHEDULES ===");
      console.log("API endpoint:", API_CONFIG.ENDPOINTS.MASS_SCHEDULES);
      console.log(
        "Full URL:",
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MASS_SCHEDULES}?active=true`,
      );

      const response = await api.getMassSchedules(true); // Only active schedules

      console.log("API Response:", response);

      if (response.success && response.schedules) {
        console.log("Schedules received:", response.schedules.length);
        this.schedules = response.schedules;
        console.log("Stored schedules:", this.schedules);
        this.renderScheduleCards();
      } else {
        console.error("Invalid response format:", response);
        if (this.scheduleCardsContainer) {
          this.scheduleCardsContainer.innerHTML =
            '<p style="text-align: center; padding: 40px; color: #666;">No schedules available</p>';
        }
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      console.error("Error details:", error.message, error.stack);
      if (this.scheduleCardsContainer) {
        this.scheduleCardsContainer.innerHTML =
          '<p style="text-align: center; padding: 40px; color: #d32f2f;">Error loading schedules</p>';
      }
    }
  }

  renderScheduleCards() {
    if (!this.scheduleCardsContainer) return;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
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
        schedule.scheduleType,
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
          `Schedule ${schedule.name} has ended (${schedule.endTime})`,
        );
        return false;
      }

      console.log("✓ Schedule available:", schedule.name);
      return true;
    });

    console.log("Available schedules:", availableSchedules);

    // Render schedule cards
    if (availableSchedules.length === 0) {
      this.scheduleCardsContainer.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #666; grid-column: 1/-1;">
          <h3 style="margin-bottom: 10px;">⚠️ No Active Schedules</h3>
          <p>No mass schedules are currently available for scanning.</p>
          <p style="margin-top: 10px; font-size: 14px;">Schedules may have ended or are not scheduled for today.</p>
        </div>
      `;
    } else {
      this.scheduleCardsContainer.innerHTML = availableSchedules
        .map(
          (schedule) => `
        <div class="schedule-card" data-schedule-id="${schedule._id}">
          <div class="schedule-card-header">
            <h3 class="schedule-card-title">${schedule.name}</h3>
            <span class="schedule-card-badge">${schedule.massType}</span>
          </div>
          <div class="schedule-card-time">${schedule.startTime} - ${
            schedule.endTime
          }</div>
          <div class="schedule-card-type">${
            schedule.scheduleType === "specific"
              ? `Specific: ${new Date(
                  schedule.specificDate,
                ).toLocaleDateString()}`
              : `Recurring: ${this.getDayName(schedule.dayOfWeek)}`
          }</div>
          <div class="schedule-card-footer">Click to start scanning</div>
        </div>
      `,
        )
        .join("");

      // Add click listeners to cards
      const cards =
        this.scheduleCardsContainer.querySelectorAll(".schedule-card");
      cards.forEach((card) => {
        card.addEventListener("click", () => {
          const scheduleId = card.dataset.scheduleId;
          const schedule = availableSchedules.find((s) => s._id === scheduleId);
          if (schedule) {
            this.showScanningView(schedule);
          }
        });
      });
    }
  }

  getDayName(dayOfWeek) {
    if (!Array.isArray(dayOfWeek)) return "";
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayOfWeek.map((d) => days[d]).join(", ");
  }

  async loadAttendanceRecords() {
    if (!this.selectedSchedule || !this.attendanceRecordsBody) {
      console.log("Cannot load records - missing schedule or tbody element");
      return;
    }

    try {
      this.attendanceRecordsBody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Loading...</td></tr>';

      console.log(
        "Fetching attendees for schedule:",
        this.selectedSchedule._id,
      );
      const response = await api.getScheduleAttendees(
        this.selectedSchedule._id,
      );

      console.log("API response:", response);

      if (
        response.success &&
        response.attendees &&
        response.attendees.length > 0
      ) {
        console.log("Found", response.attendees.length, "attendance records");

        // Sync scannedCodes with actual database records
        // This ensures the in-memory Set matches what's actually recorded
        this.scannedCodes.clear();
        response.attendees.forEach((record) => {
          if (record.qrCode) {
            this.scannedCodes.add(record.qrCode);
          }
        });
        console.log(
          "Synced scannedCodes with",
          this.scannedCodes.size,
          "records from database",
        );

        this.attendanceRecordsBody.innerHTML = response.attendees
          .map(
            (record) => `
            <tr>
              <td>${record.userName}</td>
              <td>${record.userEmail}</td>
              <td>${new Date(record.scannedAt).toLocaleString()}</td>
              <td><span class="status-badge status-present">Present</span></td>
            </tr>
          `,
          )
          .join("");
      } else {
        console.log("No attendance records found");
        // Clear scannedCodes if no records exist
        this.scannedCodes.clear();
        this.attendanceRecordsBody.innerHTML =
          '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">No attendance records yet.</td></tr>';
      }
    } catch (error) {
      console.error("Error loading attendance records:", error);
      this.attendanceRecordsBody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: #d32f2f; padding: 20px;">Error loading records</td></tr>';
    }
  }

  updateScheduleDropdown() {
    // This is no longer needed as we're using cards, but keep for compatibility
    if (!this.massScheduleSelect) return;

    if (this.selectedSchedule) {
      this.massScheduleSelect.innerHTML = `<option value="${this.selectedSchedule._id}" selected>${this.selectedSchedule.name}</option>`;
      this.massScheduleSelect.disabled = true;
    }
  }

  async startCamera() {
    console.log("=== START CAMERA ===");

    if (this.isScanning) {
      console.log("Already scanning");
      return;
    }

    if (!this.selectedSchedule) {
      this.showResult("Please select a schedule first", "error");
      return;
    }

    try {
      console.log("Setting qr-reader display to block");
      this.qrReader.style.display = "block";

      console.log("Creating Html5Qrcode instance");
      this.html5QrCode = new Html5Qrcode("qr-reader");

      console.log("Starting camera...");
      await this.html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => {
          // Silent - ignore scan errors
        },
      );

      console.log("✓✓✓ CAMERA STARTED SUCCESSFULLY ✓✓✓");
      this.isScanning = true;
      this.startCameraBtn.style.display = "none";

      if (this.stopCameraContainer) {
        this.stopCameraContainer.style.display = "block";
      }
    } catch (err) {
      console.error("❌ CAMERA ERROR:", err);
      console.error("Error stack:", err.stack);
      this.qrReader.style.display = "none";
      this.showResult(`Camera Error: ${err.message}`, "error");
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

    // Prevent rapid repeated scans - check processing flag FIRST
    if (this.isProcessing) {
      console.log("Already processing a scan, please wait");
      return;
    }

    // Check if this code was already scanned in this session
    if (this.scannedCodes.has(decodedText)) {
      console.log("Already scanned in this session, ignoring");
      this.showResult(
        "⚠️ Already scanned this person in this session!",
        "error",
        true, // Auto-hide after timeout
      );

      // Play different sound for duplicate
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAB/f39/f39/f39/f39/f38=",
        );
        audio.play();
      } catch (e) {}

      return;
    }

    // Play beep for successful scan
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS67OihUBELTKXh8bllHAU2jdXzxnkqBSh+zPLaizsKFGCx6OyrWBQLSKHf87tnHgU0iNPzw3csBS1+zPDYijkHFmm98OWoVBIIRp/h8bxnHwUqgM/z2IwwBxZpu+LqrFoSCkSf4fG7aB4FKoDQ89eNMggVabzx5qlWEgpDnt/zuGgdBSh/zPDWizUIF2q77+esWRIIRZ/h8blnHgUpgdDz2IwwBxZpvPDlqFQSCEaf4fG8Zx8FKoDQ89eNMggVabzh6qxaEgpFn+Hxu2geBSqAz/PYjDAHFWi98OWpVRIKQ5/f87lpHAUof8zw1os1CBdqu+/nrFkSCEWf4PG5Zx4FKoHQ89eMMQcWabzx5qlWEgpDnuDzu2geBSl/0PPYjDAIFWi78OapVBIKRp/h8bxnHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG7Zx4FKYHO89iNMQcVabzw5alVEgpDnt/ztWgeBSl/zPDWizUIF2q77+esWRIIRZ7g8bxoHwUpgdDz14wwBxVpvOHqrFoSCkWf4PG7aB4FKYHO89iNMQcVabzx5qlWEgpDnuDztWgdBSh/zPDWizUIF2q77+esWRIIRZ7g8bxoHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG7aB4FKYHO89iMMQcVabzx5qlWEgpDnuDztWgdBSh+zPDXizYIF2q77+esWRIIRZ/g8bpoHwUpgM/z2IwwBxVpvOHqrFoSCkWf4PG6aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkWf4PG6aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCkSf4PG7aB4FKYHO89iMMQcVabzw5KlVEgpEn+Hxu2geBSh/zPDXizYIF2q77+esWRIIRZ/g8bpoHwUqgM/z2IwwBxVpvOHqrFoSCg==",
      );
      audio.play();
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Process the scan (will mark as scanned after successful API call)
    this.processQRCode(decodedText);
  }

  async processQRCode(qrCode) {
    this.isProcessing = true;

    if (!this.selectedSchedule) {
      this.showResult("No schedule selected", "error");
      this.isProcessing = false;
      return;
    }

    const scheduleId = this.selectedSchedule._id;
    const massType = this.selectedSchedule.massType;
    const notes = ""; // No notes in continuous mode

    this.showResult("⏳ Recording attendance...", "success");

    try {
      const response = await api.scanQR({
        qrCode,
        notes,
        scheduleId,
        massType,
      });

      if (response.success) {
        // Mark as successfully scanned ONLY after API confirms success
        this.scannedCodes.add(qrCode);

        this.showResult(
          ` ${response.record.user.name} - Attendance recorded!`,
          "success",
          true, // Auto-hide after 5 seconds
        );

        // Add to recent scans
        this.addToRecentScans({
          user: {
            name: response.record.user.name,
            email: response.record.user.email,
          },
          time: new Date(),
        });

        // Keep scanning - don't stop the camera
        console.log("Continuing to scan...");
      }
    } catch (error) {
      this.showResult(
        `❌ ${error.message || "Failed to record attendance"}`,
        "error",
        true, // Auto-hide after timeout
      );
      console.error("Scan error:", error);
    } finally {
      // Add small delay before allowing next scan to prevent rapid repeated scans
      setTimeout(() => {
        this.isProcessing = false;
        console.log("Ready for next scan");
      }, 1000); // 1 second cooldown
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    // This form is now hidden and not used in continuous mode
    // Kept for backward compatibility
  }

  resetForm() {
    if (this.qrCodeInput) this.qrCodeInput.value = "";
    if (this.massScheduleSelect) this.massScheduleSelect.value = "";
    if (this.notes) this.notes.value = "";
    this.isProcessing = false;
    this.lastScannedCode = null;
  }

  showResult(message, type, autoHide = false) {
    console.log("showResult called:", {
      message,
      type,
      autoHide,
      hasElement: !!this.scanResult,
    });

    if (!this.scanResult) {
      console.error("scanResult element not found!");
      return;
    }

    // Clear any existing timeout
    if (this.resultTimeout) {
      console.log("Clearing existing timeout");
      clearTimeout(this.resultTimeout);
      this.resultTimeout = null;
    }

    this.scanResult.textContent = message;
    this.scanResult.className = `scan-result ${type}`;
    this.scanResult.style.display = "block";
    this.scanResult.style.opacity = "1";

    console.log("Message displayed, autoHide:", autoHide);

    // Auto-hide after 5 seconds if requested
    if (autoHide) {
      console.log("Setting timeout to hide in 5 seconds");
      this.resultTimeout = setTimeout(() => {
        console.log("Timeout fired! Hiding message:", message);
        // Fade out
        if (this.scanResult) {
          this.scanResult.style.opacity = "0";
          // Hide after fade
          setTimeout(() => {
            if (this.scanResult) {
              this.scanResult.style.display = "none";
              console.log("Message hidden");
            }
          }, 300);
        }
      }, 5000); // 5 seconds
      console.log("Timeout ID:", this.resultTimeout);
    }
  }
}

new QRScanner();
