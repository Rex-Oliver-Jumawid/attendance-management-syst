class ReportsManager {
  constructor() {
    this.currentRange = "day";
    this.attendanceData = [];
    this.refreshInterval = null;
    this.selectedMonth = new Date().getMonth();
    this.selectedYear = new Date().getFullYear();
    this.init();
  }

  init() {
    this.initElements();
    this.attachEventListeners();
    this.loadReports();
    this.startAutoRefresh();
  }

  initElements() {
    this.scheduleAttendanceList = document.getElementById(
      "scheduleAttendanceList"
    );
    this.refreshBtn = document.getElementById("refreshReportsBtn");
  }

  startAutoRefresh() {
    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadReports();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  attachEventListeners() {
    // Date range filter buttons
    document.querySelectorAll(".btn-filter[data-range]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const range = e.target.dataset.range;
        this.currentRange = range;

        // Update active button
        document.querySelectorAll(".btn-filter[data-range]").forEach((b) => {
          b.classList.remove("active");
        });
        e.target.classList.add("active");

        this.loadReports();
      });
    });

    // Refresh button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        this.loadReports();
      });
    }
  }

  async loadReports() {
    try {
      const params = { range: this.currentRange };

      console.log("Loading reports with range:", this.currentRange);
      const response = await api.getAdminAttendanceReports(params);
      console.log("Reports response:", response);

      if (response.success) {
        this.attendanceData = response.data;
        this.displayStats(response.stats);
        this.displayScheduleAttendance(response.scheduleBreakdown);
      } else {
        console.error("Response not successful:", response);
        if (this.scheduleAttendanceList) {
          this.scheduleAttendanceList.innerHTML = `<p>Error: ${
            response.message || "Failed to load reports"
          }</p>`;
        }
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
      if (this.scheduleAttendanceList) {
        this.scheduleAttendanceList.innerHTML = `<p>Failed to load reports: ${error.message}</p>`;
      }
    }
  }

  displayStats(stats) {
    document.getElementById("reportTotalAttendance").textContent =
      stats.totalAttendance || 0;
    document.getElementById("reportUniqueAttendees").textContent =
      stats.uniqueAttendees || 0;
    document.getElementById("reportScheduleCount").textContent =
      stats.schedulesUsed || 0;
    document.getElementById("reportAvgPerSchedule").textContent =
      stats.schedulesUsed > 0
        ? Math.round((stats.totalAttendance / stats.schedulesUsed) * 10) / 10
        : 0;
  }

  displayScheduleAttendance(scheduleBreakdown) {
    if (!this.scheduleAttendanceList) return;

    // For weekly/monthly/all, we want to show tabs even if empty
    if (this.currentRange === "week") {
      this.displayWeeklyTabs(scheduleBreakdown || []);
      return;
    }

    if (this.currentRange === "month") {
      this.displayMonthlyTabs(scheduleBreakdown || []);
      return;
    }

    if (this.currentRange === "all") {
      this.displayAllTimeView(scheduleBreakdown || []);
      return;
    }

    // For "Today", show schedule-based breakdown
    if (this.currentRange === "day") {
      if (!scheduleBreakdown || scheduleBreakdown.length === 0) {
        this.scheduleAttendanceList.innerHTML =
          "<p>No schedules or attendance records found for today</p>";
        return;
      }
      const html = scheduleBreakdown
        .map((schedule) => this.renderScheduleCard(schedule))
        .join("");
      this.scheduleAttendanceList.innerHTML = html;
    }
  }

  displayAllTimeView(scheduleBreakdown) {
    console.log("=== displayAllTimeView ===");
    console.log("scheduleBreakdown received:", scheduleBreakdown);
    console.log("Number of schedules:", scheduleBreakdown.length);

    // Flatten all attendees from all schedules
    const allAttendees = [];
    scheduleBreakdown.forEach((schedule) => {
      console.log(
        `Schedule: ${schedule.scheduleName}, Attendees: ${
          schedule.attendees?.length || 0
        }`
      );
      if (schedule.attendees && schedule.attendees.length > 0) {
        schedule.attendees.forEach((attendee) => {
          allAttendees.push({
            ...attendee,
            scheduleName: schedule.scheduleName,
            massType: schedule.massType,
          });
        });
      }
    });

    console.log("Total flattened attendees:", allAttendees.length);
    this.displayAllTimeSummary(allAttendees);
  }

  displayAllTimeSummary(allAttendees) {
    console.log("=== displayAllTimeSummary ===");
    console.log("Total attendees received:", allAttendees.length);
    console.log("Sample attendee:", allAttendees[0]);

    if (allAttendees.length === 0) {
      this.scheduleAttendanceList.innerHTML = `
        <div class="attendance-summary" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 20px 0; color: #0c1014;">Monthly Member Attendance</h3>
          <p style="color: #666;">No attendance records found yet.</p>
        </div>
      `;
      return;
    }

    // Group by month and member
    const monthMap = new Map();

    allAttendees.forEach((attendee) => {
      const date = new Date(attendee.scannedAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel,
          year: date.getFullYear(),
          month: date.getMonth(),
          members: new Map(),
        });
      }

      const month = monthMap.get(monthKey);
      const email = attendee.userEmail || "N/A";

      if (!month.members.has(email)) {
        month.members.set(email, {
          name: attendee.userName,
          email: email,
          attendances: [],
        });
      }

      month.members.get(email).attendances.push({
        date: attendee.scannedAt,
        schedule: attendee.scheduleName,
        massType: attendee.massType,
        moderator: attendee.moderatorName,
      });
    });

    // Convert to array and sort by month (newest first)
    const months = Array.from(monthMap.values()).sort(
      (a, b) => b.year - a.year || b.month - a.month
    );

    console.log("Months grouped:", months.length);
    months.forEach((month, idx) => {
      console.log(
        `Month ${idx + 1}: ${month.monthLabel} - ${month.members.size} members`
      );
      if (idx === 0) {
        // Log first month's members for debugging
        const membersList = Array.from(month.members.values());
        console.log(
          "First month members:",
          membersList.map((m) => ({
            name: m.name,
            email: m.email,
            attendanceCount: m.attendances.length,
          }))
        );
      }
    });

    const totalMembers = new Set(allAttendees.map((a) => a.userEmail)).size;

    const html = `
      <div class="attendance-summary" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; color: #0c1014;">Monthly Member Attendance</h3>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 16px;">
            <strong>${totalMembers}</strong> unique members with <strong>${
      allAttendees.length
    }</strong> total attendances across <strong>${
      months.length
    }</strong> month(s)
          </p>
        </div>

        <div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; flex-wrap: wrap;">
          ${months
            .map(
              (month, index) => `
            <button 
              class="month-tab-btn ${index === 0 ? "active" : ""}" 
              data-tab="month-${index}"
              style="padding: 10px 20px; border: none; background: ${
                index === 0 ? "#3d5a80" : "transparent"
              }; color: ${
                index === 0 ? "white" : "#666"
              }; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0; transition: all 0.3s;"
            >
              ${month.monthLabel}
            </button>
          `
            )
            .join("")}
        </div>
        
        ${months
          .map((month, index) => {
            const memberStats = Array.from(month.members.values()).sort(
              (a, b) => b.attendances.length - a.attendances.length
            );
            const totalAttendances = memberStats.reduce(
              (sum, m) => sum + m.attendances.length,
              0
            );

            return `
              <div id="month-${index}" class="tab-content" style="display: ${
              index === 0 ? "block" : "none"
            };">
                <p style="color: #666; margin-bottom: 15px;">
                  <strong>${
                    memberStats.length
                  }</strong> members with <strong>${totalAttendances}</strong> total attendances
                </p>
                <div style="overflow-x: auto;">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Member Name</th>
                        <th>Times Attended</th>
                        <th>Attendance Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${memberStats
                        .map(
                          (member, idx) => `
                        <tr>
                          <td><strong>#${idx + 1}</strong></td>
                          <td><strong>${member.name || "N/A"}</strong></td>
                          <td><span style="background: #3d5a80; color: white; padding: 6px 16px; border-radius: 12px; font-weight: 600;">${
                            member.attendances.length
                          }</span></td>
                          <td>
                            <details style="cursor: pointer;">
                              <summary style="font-weight: 600; color: #3d5a80;">View ${
                                member.attendances.length
                              } attendance(s)</summary>
                              <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; max-height: 300px; overflow-y: auto;">
                                ${member.attendances
                                  .sort(
                                    (a, b) =>
                                      new Date(a.date) - new Date(b.date)
                                  )
                                  .map(
                                    (att) => `
                                  <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                    <span style="color: #666; font-size: 0.95em;">${formatDate(
                                      att.date
                                    )} at ${formatTime(att.date)}</span><br>
                                    <strong>${
                                      att.schedule || att.massType
                                    }</strong><br>
                                    <span style="color: #888; font-size: 0.85em;">Scanned by: ${
                                      att.moderator
                                    }</span>
                                  </div>
                                `
                                  )
                                  .join("")}
                              </div>
                            </details>
                          </td>
                        </tr>
                      `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    this.scheduleAttendanceList.innerHTML = html;

    // Add tab switching for months
    document.querySelectorAll(".month-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabId = e.target.dataset.tab;

        // Update button styles
        document.querySelectorAll(".month-tab-btn").forEach((b) => {
          b.style.background = "transparent";
          b.style.color = "#666";
        });
        e.target.style.background = "#3d5a80";
        e.target.style.color = "white";

        // Show/hide content
        document.querySelectorAll(".tab-content").forEach((content) => {
          content.style.display = "none";
        });
        document.getElementById(tabId).style.display = "block";
      });
    });
  }

  displayTabbedPeriods(allAttendees) {
    if (this.currentRange === "week") {
      this.displayWeeklyTabs(allAttendees);
    }
  }

  displayWeeklyTabs(scheduleBreakdown) {
    // Flatten all attendees from all schedules
    const allAttendees = [];
    if (scheduleBreakdown) {
      scheduleBreakdown.forEach((schedule) => {
        if (schedule.attendees && schedule.attendees.length > 0) {
          schedule.attendees.forEach((attendee) => {
            allAttendees.push({
              ...attendee,
              scheduleName: schedule.scheduleName,
              massType: schedule.massType,
            });
          });
        }
      });
    }

    // Show simple last 7 days report grouped by day
    this.displayLast7DaysReport(allAttendees);
  }

  displayLast7DaysReport(allAttendees) {
    // Group attendees by date (day)
    const dayMap = new Map();
    const now = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();
      dayMap.set(dateKey, {
        date: new Date(date),
        dateKey: dateKey,
        attendances: [],
        memberSet: new Set(),
      });
    }

    // Fill in actual attendance data
    allAttendees.forEach((attendee) => {
      const date = new Date(attendee.scannedAt);
      const dateKey = date.toDateString();

      if (dayMap.has(dateKey)) {
        const day = dayMap.get(dateKey);
        day.attendances.push(attendee);
        if (attendee.userEmail) {
          day.memberSet.add(attendee.userEmail);
        }
      }
    });

    const days = Array.from(dayMap.values());
    const totalAttendances = allAttendees.length;
    const uniqueMembers = new Set(
      allAttendees.map((a) => a.userEmail).filter((e) => e && e !== "N/A")
    );

    const html = `
      <div class="weekly-report" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; color: #0c1014;">Last 7 Days Report</h3>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 16px;">
            <strong>${
              uniqueMembers.size
            }</strong> unique members with <strong>${totalAttendances}</strong> total attendances
          </p>
        </div>

        ${
          days.length === 0
            ? "<p>No attendance records for the last 7 days</p>"
            : ""
        }
        
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Total Scans</th>
                <th>Unique Members</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${days
                .map(
                  (day) => `
                <tr>
                  <td><strong>${formatDate(day.date)}</strong></td>
                  <td>${day.date.toLocaleDateString("en-US", {
                    weekday: "long",
                  })}</td>
                  <td><span style="background: #3d5a80; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${
                    day.attendances.length
                  }</span></td>
                  <td>${day.memberSet.size}</td>
                  <td>
                    ${
                      day.attendances.length > 0
                        ? `
                      <details style="cursor: pointer;">
                        <summary style="font-weight: 600; color: #3d5a80;">View ${
                          day.attendances.length
                        } scan(s)</summary>
                        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; max-height: 300px; overflow-y: auto;">
                          ${day.attendances
                            .sort(
                              (a, b) =>
                                new Date(a.scannedAt) - new Date(b.scannedAt)
                            )
                            .map(
                              (att) => `
                              <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                <strong>${att.userName}</strong><br>
                                <span style="color: #666; font-size: 0.9em;">${formatTime(
                                  att.scannedAt
                                )} - ${
                                att.scheduleName || att.massType
                              }</span><br>
                                <span style="color: #888; font-size: 0.85em;">Scanned by: ${
                                  att.moderatorName
                                }</span>
                              </div>
                            `
                            )
                            .join("")}
                        </div>
                      </details>
                    `
                        : '<span style="color: #999;">No scans</span>'
                    }
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.scheduleAttendanceList.innerHTML = html;
  }

  displayWeeklyTabsOLD_BACKUP(scheduleBreakdown) {
    // This is the old monthly/weekly breakdown code - kept for reference
    const allAttendees = [];

    const monthYearOptions = Array.from(monthYears)
      .map((key) => {
        const [year, month] = key.split("-");
        return { year: parseInt(year), month: parseInt(month), key };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);

    // Group attendees by week within the selected month
    const weeksMap = new Map();

    // Initialize all 4 weeks for the selected month
    for (let weekNum = 1; weekNum <= 4; weekNum++) {
      const weekKey = `Week ${weekNum}`;
      weeksMap.set(weekKey, {
        label: `Week ${weekNum}`,
        members: new Map(),
      });
    }

    allAttendees.forEach((attendee) => {
      const date = new Date(attendee.scannedAt);
      if (
        date.getMonth() !== this.selectedMonth ||
        date.getFullYear() !== this.selectedYear
      ) {
        return;
      }

      const dayOfMonth = date.getDate();
      const weekNum = Math.ceil(dayOfMonth / 7);
      const weekKey = `Week ${weekNum}`;

      const week = weeksMap.get(weekKey);
      if (!week) return; // Safety check

      const email = attendee.userEmail || "N/A";

      if (!week.members.has(email)) {
        week.members.set(email, {
          name: attendee.userName,
          email: email,
          attendances: [],
        });
      }

      week.members.get(email).attendances.push({
        date: attendee.scannedAt,
        schedule: attendee.scheduleName,
        massType: attendee.massType,
        moderator: attendee.moderatorName,
      });
    });

    const weeks = Array.from(weeksMap.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      members: Array.from(value.members.values()).sort(
        (a, b) => b.attendances.length - a.attendances.length
      ),
    }));

    const selectedMonthName = new Date(
      this.selectedYear,
      this.selectedMonth
    ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const html = `
      <div class="weekly-report" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">
          <label style="font-weight: 600; color: #0c1014;">Select Month:</label>
          <select id="monthSelector" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; cursor: pointer;">
            ${monthYearOptions
              .map((opt) => {
                const label = new Date(opt.year, opt.month).toLocaleDateString(
                  "en-US",
                  { month: "long", year: "numeric" }
                );
                const selected =
                  opt.month === this.selectedMonth &&
                  opt.year === this.selectedYear
                    ? "selected"
                    : "";
                return `<option value="${opt.key}" ${selected}>${label}</option>`;
              })
              .join("")}
          </select>
          <button 
            id="generateMonthlyReportBtn" 
            class="btn-primary btn-small"
            style="margin-left: auto; padding: 8px 16px; background: #3d5a80; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
          >
            Generate Monthly Report
          </button>
        </div>
        
        <h3 style="margin: 0 0 15px 0; color: #0c1014;">${selectedMonthName} - Weekly Breakdown</h3>
        
        ${
          weeks.length === 0
            ? "<p>No attendance records for this month</p>"
            : ""
        }
        
        <div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
          ${weeks
            .map(
              (week, index) => `
            <button 
              class="tab-btn ${index === 0 ? "active" : ""}" 
              data-tab="week-${index}"
              style="padding: 10px 20px; border: none; background: ${
                index === 0 ? "#3d5a80" : "transparent"
              }; color: ${
                index === 0 ? "white" : "#666"
              }; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0; transition: all 0.3s;"
            >
              ${week.label}
            </button>
          `
            )
            .join("")}
        </div>
        
        ${weeks
          .map((week, index) => this.renderWeekTabContent(week, index))
          .join("")}
      </div>
    `;

    this.scheduleAttendanceList.innerHTML = html;

    // Add month selector listener
    const monthSelector = document.getElementById("monthSelector");
    if (monthSelector) {
      monthSelector.addEventListener("change", (e) => {
        const [year, month] = e.target.value.split("-");
        this.selectedYear = parseInt(year);
        this.selectedMonth = parseInt(month);
        this.displayWeeklyTabs(allAttendees);
      });
    }

    // Add Generate Monthly Report button listener
    const generateBtn = document.getElementById("generateMonthlyReportBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        this.generateMonthlyReport(weeks, allAttendees);
      });
    }

    // Add tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabId = e.target.dataset.tab;

        // Update button styles
        document.querySelectorAll(".tab-btn").forEach((b) => {
          b.style.background = "transparent";
          b.style.color = "#666";
        });
        e.target.style.background = "#3d5a80";
        e.target.style.color = "white";

        // Show/hide content
        document.querySelectorAll(".tab-content").forEach((content) => {
          content.style.display = "none";
        });
        document.getElementById(tabId).style.display = "block";
      });
    });
  }

  renderWeekTabContent(week, index) {
    const totalAttendances = week.members.reduce(
      (sum, m) => sum + m.attendances.length,
      0
    );
    if (week.members.length === 0) {
      return `
        <div id="week-${index}" class="tab-content" style="display: ${
        index === 0 ? "block" : "none"
      };">
          <p style="color: #666; margin-bottom: 15px;">No attendance records for this week yet.</p>
        </div>
      `;
    }
    return `
      <div id="week-${index}" class="tab-content" style="display: ${
      index === 0 ? "block" : "none"
    };">
        <p style="color: #666; margin-bottom: 15px;">${
          week.members.length
        } members, ${totalAttendances} total attendances</p>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Times Attended</th>
                <th>Attendance Details</th>
              </tr>
            </thead>
            <tbody>
              ${week.members
                .map(
                  (member) => `
                <tr>
                  <td><strong>${member.name || "N/A"}</strong></td>
                  <td><span style="background: #3d5a80; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${
                    member.attendances.length
                  }</span></td>
                  <td>
                    <details style="cursor: pointer;">
                      <summary style="font-weight: 600; color: #3d5a80;">View ${
                        member.attendances.length
                      } attendance(s)</summary>
                      <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                        ${member.attendances
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map(
                            (att) => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                              <strong>${formatDateShort(
                                att.date
                              )}</strong> at ${formatTime(att.date)}<br>
                              <span style="color: #666;">Schedule: ${
                                att.schedule
                              } (${att.massType})</span><br>
                              <span style="color: #888; font-size: 0.9em;">Scanned by: ${
                                att.moderator
                              }</span>
                            </div>
                          `
                          )
                          .join("")}
                      </div>
                    </details>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  generateMonthlyReport(weeks, allAttendees) {
    // Combine all members from all weeks for the selected month
    const allMembers = new Map();

    weeks.forEach((week) => {
      week.members.forEach((member) => {
        const email = member.email;
        if (!allMembers.has(email)) {
          allMembers.set(email, {
            name: member.name,
            email: member.email,
            attendances: [],
          });
        }
        allMembers.get(email).attendances.push(...member.attendances);
      });
    });

    const membersList = Array.from(allMembers.values()).sort(
      (a, b) => b.attendances.length - a.attendances.length
    );

    const selectedMonthName = new Date(
      this.selectedYear,
      this.selectedMonth
    ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const totalAttendances = membersList.reduce(
      (sum, m) => sum + m.attendances.length,
      0
    );

    const html = `
      <div class="monthly-report" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">
          <h3 style="margin: 0; color: #0c1014;">${selectedMonthName} - Monthly Report</h3>
          <div style="display: flex; gap: 10px;">
            <button 
              id="exportMonthlyCSVBtn" 
              class="btn-primary btn-small"
              style="padding: 8px 16px; background: #3d5a80; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
            >
              Export to CSV
            </button>
            <button 
              id="backToWeeklyBtn" 
              class="btn-secondary btn-small"
              style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
            >
              Back to Weekly View
            </button>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 16px;">
            <strong>${
              membersList.length
            }</strong> members with <strong>${totalAttendances}</strong> total attendances
          </p>
        </div>

        ${
          membersList.length === 0
            ? "<p>No attendance records for this month</p>"
            : `
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Times Attended</th>
                <th>Attendance Details</th>
              </tr>
            </thead>
            <tbody>
              ${membersList
                .map(
                  (member, index) => `
                <tr>
                  <td><strong>${member.name}</strong></td>
                  <td><span style="background: #3d5a80; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${
                    member.attendances.length
                  }</span></td>
                  <td>
                    <details style="cursor: pointer;">
                      <summary style="font-weight: 600; color: #3d5a80;">View ${
                        member.attendances.length
                      } attendance(s)</summary>
                      <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                        ${member.attendances
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map(
                            (att) => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                              <strong>${formatDateShort(
                                att.date
                              )}</strong> at ${formatTime(att.date)}<br>
                              <span style="color: #666;">Schedule: ${
                                att.schedule
                              } (${att.massType})</span><br>
                              <span style="color: #888; font-size: 0.9em;">Scanned by: ${
                                att.moderator
                              }</span>
                            </div>
                          `
                          )
                          .join("")}
                      </div>
                    </details>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
        }
      </div>
    `;

    this.scheduleAttendanceList.innerHTML = html;

    // Add export button listener
    const exportBtn = document.getElementById("exportMonthlyCSVBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportMonthlyCSV(membersList, selectedMonthName);
      });
    }

    // Add back button listener
    const backBtn = document.getElementById("backToWeeklyBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        // Re-fetch and display weekly tabs
        this.loadReports();
      });
    }
  }

  displayMonthlyTabs(allAttendees) {
    // Group attendees by month
    const monthsMap = new Map();

    allAttendees.forEach((attendee) => {
      const date = new Date(attendee.scannedAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          label: monthLabel,
          year: date.getFullYear(),
          month: date.getMonth(),
          members: new Map(),
        });
      }

      const monthData = monthsMap.get(monthKey);
      const username = attendee.userUsername || "N/A";

      if (!monthData.members.has(username)) {
        monthData.members.set(username, {
          name: attendee.userName,
          username: username,
          attendances: [],
        });
      }

      monthData.members.get(username).attendances.push({
        date: attendee.scannedAt,
        schedule: attendee.scheduleName,
        massType: attendee.massType,
        moderator: attendee.moderatorName,
      });
    });

    const months = Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({
        key,
        label: value.label,
        members: Array.from(value.members.values()).sort(
          (a, b) => b.attendances.length - a.attendances.length
        ),
      }));

    const html = `
      <div class="monthly-report" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; color: #0c1014;">Monthly Attendance Reports</h3>
        
        ${months.length === 0 ? "<p>No attendance records found</p>" : ""}
        
        <div class="tabs" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
          ${months
            .map(
              (month, index) => `
            <button 
              class="tab-btn ${index === 0 ? "active" : ""}" 
              data-tab="month-${index}"
              style="padding: 10px 20px; border: none; background: ${
                index === 0 ? "#3d5a80" : "transparent"
              }; color: ${
                index === 0 ? "white" : "#666"
              }; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0; transition: all 0.3s;"
            >
              ${month.label}
            </button>
          `
            )
            .join("")}
        </div>
        
        ${months
          .map((month, index) => this.renderMonthTabContent(month, index))
          .join("")}
      </div>
    `;

    this.scheduleAttendanceList.innerHTML = html;

    // Add tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabId = e.target.dataset.tab;

        // Update button styles
        document.querySelectorAll(".tab-btn").forEach((b) => {
          b.style.background = "transparent";
          b.style.color = "#666";
        });
        e.target.style.background = "#3d5a80";
        e.target.style.color = "white";

        // Show/hide content
        document.querySelectorAll(".tab-content").forEach((content) => {
          content.style.display = "none";
        });
        document.getElementById(tabId).style.display = "block";
      });
    });
  }

  renderMonthTabContent(month, index) {
    const totalAttendances = month.members.reduce(
      (sum, m) => sum + m.attendances.length,
      0
    );
    if (month.members.length === 0) {
      return `
        <div id="month-${index}" class="tab-content" style="display: ${
        index === 0 ? "block" : "none"
      };">
          <p style="color: #666; margin-bottom: 15px;">No attendance records for this month yet.</p>
        </div>
      `;
    }
    return `
      <div id="month-${index}" class="tab-content" style="display: ${
      index === 0 ? "block" : "none"
    };">
        <p style="color: #666; margin-bottom: 15px;">${
          month.members.length
        } members, ${totalAttendances} total attendances</p>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Username</th>
                <th>Times Attended</th>
                <th>Attendance Details</th>
              </tr>
            </thead>
            <tbody>
              ${month.members
                .map(
                  (member) => `
                <tr>
                  <td><strong>${member.name || "N/A"}</strong></td>
                  <td>${member.username}</td>
                  <td><span style="background: #3d5a80; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${
                    member.attendances.length
                  }</span></td>
                  <td>
                    <details style="cursor: pointer;">
                      <summary style="font-weight: 600; color: #3d5a80;">View ${
                        member.attendances.length
                      } attendance(s)</summary>
                      <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                        ${member.attendances
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map(
                            (att) => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                              <strong>${formatDateShort(
                                att.date
                              )}</strong> at ${formatTime(att.date)}<br>
                              <span style="color: #666;">Schedule: ${
                                att.schedule
                              } (${att.massType})</span><br>
                              <span style="color: #888; font-size: 0.9em;">Scanned by: ${
                                att.moderator
                              }</span>
                            </div>
                          `
                          )
                          .join("")}
                      </div>
                    </details>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  displayGroupedByPeriod(allAttendees) {
    // Group attendees by time period (week or month)
    const periodMap = new Map();

    allAttendees.forEach((attendee) => {
      const date = new Date(attendee.scannedAt);
      let periodKey, periodLabel;

      if (this.currentRange === "week") {
        // Get week number and year
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor(
          (date - startOfYear) / (24 * 60 * 60 * 1000)
        );
        const weekNum = Math.ceil(
          (daysSinceStart + startOfYear.getDay() + 1) / 7
        );
        periodKey = `${date.getFullYear()}-W${weekNum}`;
        periodLabel = `Week ${weekNum} of ${date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}`;
      } else if (this.currentRange === "month") {
        periodKey = `${date.getFullYear()}-${date.getMonth()}`;
        periodLabel = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          label: periodLabel,
          members: new Map(),
        });
      }

      const period = periodMap.get(periodKey);
      const username = attendee.userUsername || "N/A";

      if (!period.members.has(username)) {
        period.members.set(username, {
          name: attendee.userName,
          username: username,
          attendances: [],
        });
      }

      period.members.get(username).attendances.push({
        date: attendee.scannedAt,
        schedule: attendee.scheduleName,
        massType: attendee.massType,
        moderator: attendee.moderatorName,
      });
    });

    // Convert to array and sort periods (most recent first)
    const periods = Array.from(periodMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({
        key,
        label: value.label,
        members: Array.from(value.members.values()).sort(
          (a, b) => b.attendances.length - a.attendances.length
        ),
      }));

    // Render HTML for each period
    const html = periods
      .map((period) => {
        const totalAttendances = period.members.reduce(
          (sum, m) => sum + m.attendances.length,
          0
        );

        return `
        <div class="period-group" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #0c1014; padding-bottom: 10px; border-bottom: 2px solid #3d5a80;">
            ${period.label}
            <span style="font-size: 0.9em; color: #666; font-weight: normal;"> - ${
              period.members.length
            } members, ${totalAttendances} attendances</span>
          </h3>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Username</th>
                  <th>Times Attended</th>
                  <th>Attendance Details</th>
                </tr>
              </thead>
              <tbody>
                ${period.members
                  .map(
                    (member) => `
                  <tr>
                    <td><strong>${member.name || "N/A"}</strong></td>
                    <td>${member.username}</td>
                    <td><span style="background: #3d5a80; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${
                      member.attendances.length
                    }</span></td>
                    <td>
                      <details style="cursor: pointer;">
                        <summary style="font-weight: 600; color: #3d5a80;">View ${
                          member.attendances.length
                        } attendance(s)</summary>
                        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                          ${member.attendances
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map(
                              (att) => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                              <strong>${formatDateShort(
                                att.date
                              )}</strong> at ${formatTime(att.date)}<br>
                              <span style="color: #666;">Schedule: ${
                                att.schedule
                              } (${att.massType})</span><br>
                              <span style="color: #888; font-size: 0.9em;">Scanned by: ${
                                att.moderator
                              }</span>
                            </div>
                          `
                            )
                            .join("")}
                        </div>
                      </details>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
      })
      .join("");

    this.scheduleAttendanceList.innerHTML = html;
  }

  renderScheduleCard(schedule) {
    const attendeesHtml =
      schedule.attendees && schedule.attendees.length > 0
        ? `
        <div class="attendees-list" style="margin-top: 15px;">
          <strong style="display: block; margin-bottom: 10px;">Attendees (${
            schedule.attendees.length
          }):</strong>
          <div style="max-height: 300px; overflow-y: auto;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <thead style="background: #f8f9fa; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Date</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Time</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Scanned By</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e0e0e0;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${schedule.attendees
                  .map(
                    (a) => `
                  <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;">${a.userName || "N/A"}</td>
                    <td style="padding: 8px;">${formatDate(a.scannedAt)}</td>
                    <td style="padding: 8px;">${formatTime(a.scannedAt)}</td>
                    <td style="padding: 8px;">${a.moderatorName || "N/A"}</td>
                    <td style="padding: 8px; text-align: center;">
                      <button 
                        class="btn-danger btn-small" 
                        style="padding: 4px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                        onclick="reportsManager.deleteAttendanceRecord('${
                          a.recordId
                        }', '${a.userName}')"
                        title="Delete this attendance record"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        <button 
          class="btn-secondary btn-small" 
          style="margin-top: 10px;"
          onclick="reportsManager.exportScheduleCSV('${
            schedule.scheduleId
          }', '${schedule.scheduleName}')"
        >
          Export to CSV
        </button>
      `
        : '<p style="color: #999; margin-top: 10px;">No attendees for this period</p>';

    return `
      <div class="schedule-card" style="margin-bottom: 20px;">
        <div class="schedule-header">
          <div>
            <h3 style="margin-bottom: 5px;">${schedule.scheduleName}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">${
              schedule.massType
            }</p>
          </div>
          <span class="badge badge-active">
            ${schedule.attendanceCount} Attendance${
      schedule.attendanceCount !== 1 ? "s" : ""
    }
          </span>
        </div>
        <div class="schedule-body">
          <p><strong>Schedule Type:</strong> ${
            schedule.scheduleType === "recurring"
              ? "Weekly Recurring"
              : "Specific Date"
          }</p>
          <p><strong>Time:</strong> ${schedule.startTime} - ${
      schedule.endTime
    }</p>
          ${attendeesHtml}
        </div>
      </div>
    `;
  }

  exportScheduleCSV(scheduleId, scheduleName) {
    const schedule = this.attendanceData.find(
      (s) => s.scheduleId === scheduleId
    );
    if (!schedule || !schedule.attendees || schedule.attendees.length === 0) {
      showError("No attendance data to export");
      return;
    }

    // Create CSV content
    const headers = ["Name", "Date", "Time", "Scanned By"];
    const rows = schedule.attendees.map((a) => [
      a.userName || "N/A",
      formatDate(a.scannedAt),
      formatTime(a.scannedAt),
      a.moderatorName || "N/A",
    ]);

    let csvContent = headers.join(",") + "\n";
    csvContent += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${scheduleName.replace(/[^a-z0-9]/gi, "_")}_attendance_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess("CSV exported successfully!");
  }

  exportMonthlyCSV(membersList, monthName) {
    if (!membersList || membersList.length === 0) {
      showError("No attendance data to export");
      return;
    }

    // Create CSV content with all attendance details
    const headers = [
      "Member Name",
      "Total Attendances",
      "Date",
      "Time",
      "Schedule",
      "Mass Type",
      "Scanned By",
    ];
    const rows = [];

    membersList.forEach((member) => {
      member.attendances.forEach((attendance, index) => {
        rows.push([
          index === 0 ? member.name : "", // Only show name on first row for each member
          index === 0 ? member.attendances.length : "", // Only show total on first row
          formatDate(attendance.date),
          formatTime(attendance.date),
          attendance.schedule,
          attendance.massType,
          attendance.moderator,
        ]);
      });
      // Add empty row between members for readability
      rows.push(["", "", "", "", "", "", ""]);
    });

    let csvContent = headers.join(",") + "\n";
    csvContent += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Monthly_Report_${monthName.replace(/[^a-z0-9]/gi, "_")}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess("Monthly report exported successfully!");
  }

  async deleteAttendanceRecord(recordId, userName) {
    if (
      !confirm(
        `Are you sure you want to delete the attendance record for ${userName}?`
      )
    ) {
      return;
    }

    try {
      const response = await api.deleteAttendanceRecord(recordId);

      if (response.success) {
        showSuccess("Attendance record deleted successfully");
        // Reload reports to reflect the change
        await this.loadReports();
      } else {
        showError(response.message || "Failed to delete attendance record");
      }
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      showError(error.message || "Failed to delete attendance record");
    }
  }
}

// Initialize when on admin page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const reportsSection = document.getElementById("reports-section");
    if (reportsSection) {
      window.reportsManager = new ReportsManager();
    }
  });
} else {
  const reportsSection = document.getElementById("reports-section");
  if (reportsSection) {
    window.reportsManager = new ReportsManager();
  }
}
