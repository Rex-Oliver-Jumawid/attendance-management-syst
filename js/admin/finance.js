// Finance Dashboard for Admin

let allContributions = [];
let allExpenses = [];
let currentTab = "contributions";

// Load data when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadFinanceData();
  setupFinanceFilters();
  setupFinanceTabs();
  populateYearFilter();
  populateMonthlyBreakdownYearFilter();
  setupMonthlyBreakdownYearFilter();
});

// Populate year filter
function populateYearFilter() {
  const yearSelect = document.getElementById("financeFilterYear");
  const currentYear = new Date().getFullYear();

  for (let year = 2020; year <= currentYear + 1; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

// Populate monthly breakdown year filter
function populateMonthlyBreakdownYearFilter() {
  const yearSelect = document.getElementById("monthlyBreakdownYear");
  const currentYear = new Date().getFullYear();

  // Set current year as default
  yearSelect.innerHTML = "";
  for (let year = 2020; year <= currentYear + 1; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }
}

// Setup monthly breakdown year filter
function setupMonthlyBreakdownYearFilter() {
  const yearSelect = document.getElementById("monthlyBreakdownYear");
  yearSelect.addEventListener("change", updateMonthlyBreakdown);
}

// Load all finance data
async function loadFinanceData() {
  try {
    const [contribData, expensesData] = await Promise.all([
      api.getAllContributions(),
      api.getAllExpenses(),
    ]);

    allContributions = contribData.data || [];
    allExpenses = expensesData.data || [];

    updateFinanceSummary();
    applyFinanceFilters();
  } catch (error) {
    console.error("Error loading finance data:", error);
    showError("Failed to load finance data");
  }
}

// Update finance summary cards
function updateFinanceSummary() {
  const month = document.getElementById("financeFilterMonth").value;
  const year = document.getElementById("financeFilterYear").value;

  // Filter by date if selected
  let filteredContribs = allContributions;
  let filteredExpenses = allExpenses;

  if (month || year) {
    if (month && year) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return (
          date.getMonth() + 1 === parseInt(month) &&
          date.getFullYear() === parseInt(year)
        );
      });
      filteredExpenses = allExpenses.filter(
        (e) => e.month === parseInt(month) && e.year === parseInt(year)
      );
    } else if (year) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return date.getFullYear() === parseInt(year);
      });
      filteredExpenses = allExpenses.filter((e) => e.year === parseInt(year));
    } else if (month) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return date.getMonth() + 1 === parseInt(month);
      });
      filteredExpenses = allExpenses.filter((e) => e.month === parseInt(month));
    }
  }

  const totalContribs = filteredContribs.reduce((sum, c) => sum + c.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalContribs - totalExpenses;

  document.getElementById(
    "totalContributions"
  ).textContent = `₱${totalContribs.toFixed(2)}`;
  document.getElementById(
    "totalExpenses"
  ).textContent = `₱${totalExpenses.toFixed(2)}`;
  document.getElementById("netBalance").textContent = `₱${netBalance.toFixed(
    2
  )}`;
  document.getElementById("netBalance").style.color =
    netBalance >= 0 ? "#3d5a80" : "#e74c3c";

  // Update monthly breakdown
  updateMonthlyBreakdown();
}

// Update monthly breakdown
function updateMonthlyBreakdown() {
  const yearSelect = document.getElementById("monthlyBreakdownYear");
  const year = yearSelect.value || new Date().getFullYear();
  const monthlyData = [];

  for (let month = 1; month <= 12; month++) {
    const contribs = allContributions.filter((c) => {
      const date = new Date(c.date);
      return (
        date.getMonth() + 1 === month && date.getFullYear() === parseInt(year)
      );
    });

    const expenses = allExpenses.filter(
      (e) => e.month === month && e.year === parseInt(year)
    );

    const totalContribs = contribs.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    monthlyData.push({
      month: getMonthName(month),
      contributions: totalContribs,
      expenses: totalExpenses,
      balance: totalContribs - totalExpenses,
    });
  }

  renderMonthlyBreakdown(monthlyData);
}

// Render monthly breakdown
function renderMonthlyBreakdown(data) {
  const container = document.getElementById("monthlyBreakdown");

  const html = `
    <table class="data-table" style="margin-top: 20px;">
      <thead>
        <tr>
          <th>Month</th>
          <th>Contributions</th>
          <th>Expenses</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (item) => `
          <tr>
            <td>${item.month}</td>
            <td style="color: #3d5a80;">₱${item.contributions.toFixed(2)}</td>
            <td style="color: #e74c3c;">₱${item.expenses.toFixed(2)}</td>
            <td style="color: ${item.balance >= 0 ? "#3d5a80" : "#e74c3c"};">
              ₱${item.balance.toFixed(2)}
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Setup finance filters
function setupFinanceFilters() {
  const monthFilter = document.getElementById("financeFilterMonth");
  const yearFilter = document.getElementById("financeFilterYear");
  const refreshBtn = document.getElementById("financeRefresh");

  monthFilter.addEventListener("change", () => {
    updateFinanceSummary();
    applyFinanceFilters();
  });

  yearFilter.addEventListener("change", () => {
    updateFinanceSummary();
    applyFinanceFilters();
  });

  refreshBtn.addEventListener("click", loadFinanceData);
}

// Apply finance filters
function applyFinanceFilters() {
  const month = document.getElementById("financeFilterMonth").value;
  const year = document.getElementById("financeFilterYear").value;

  let filteredContribs = allContributions;
  let filteredExpenses = allExpenses;

  if (month || year) {
    if (month && year) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return (
          date.getMonth() + 1 === parseInt(month) &&
          date.getFullYear() === parseInt(year)
        );
      });
      filteredExpenses = allExpenses.filter(
        (e) => e.month === parseInt(month) && e.year === parseInt(year)
      );
    } else if (year) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return date.getFullYear() === parseInt(year);
      });
      filteredExpenses = allExpenses.filter((e) => e.year === parseInt(year));
    } else if (month) {
      filteredContribs = allContributions.filter((c) => {
        const date = new Date(c.date);
        return date.getMonth() + 1 === parseInt(month);
      });
      filteredExpenses = allExpenses.filter((e) => e.month === parseInt(month));
    }
  }

  if (currentTab === "contributions") {
    renderContributionsTable(filteredContribs);
  } else {
    renderExpensesTable(filteredExpenses);
  }
}

// Setup finance tabs
function setupFinanceTabs() {
  const contribTab = document.getElementById("financeContribTab");
  const expensesTab = document.getElementById("financeExpensesTab");
  const contribSection = document.getElementById("financeContribSection");
  const expensesSection = document.getElementById("financeExpensesSection");

  contribTab.addEventListener("click", () => {
    currentTab = "contributions";
    contribTab.classList.add("active");
    expensesTab.classList.remove("active");
    contribSection.style.display = "block";
    expensesSection.style.display = "none";
    applyFinanceFilters();
  });

  expensesTab.addEventListener("click", () => {
    currentTab = "expenses";
    expensesTab.classList.add("active");
    contribTab.classList.remove("active");
    expensesSection.style.display = "block";
    contribSection.style.display = "none";
    applyFinanceFilters();
  });
}

// Render contributions table
function renderContributionsTable(contributions) {
  const tbody = document.getElementById("financeContribTableBody");

  if (!contributions || contributions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">No contributions found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = contributions
    .map((contrib) => {
      const scheduleName = contrib.scheduleId
        ? contrib.scheduleId.scheduleType === "recurring"
          ? `${
              contrib.scheduleId.massType
            } - ${contrib.scheduleId.dayOfWeek.join(", ")}`
          : `${contrib.scheduleId.massType} - ${formatDate(
              contrib.scheduleId.specificDate
            )}`
        : "N/A";

      return `
      <tr>
        <td>${formatDate(contrib.date)}</td>
        <td>${contrib.userId.firstName} ${contrib.userId.lastName}</td>
        <td>${scheduleName}</td>
        <td>₱${contrib.amount.toFixed(2)}</td>
        <td>${contrib.recordedBy.firstName} ${contrib.recordedBy.lastName}</td>
        <td>${contrib.notes || "-"}</td>
      </tr>
    `;
    })
    .join("");
}

// Render expenses table
function renderExpensesTable(expenses) {
  const tbody = document.getElementById("financeExpensesTableBody");

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">No expenses found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = expenses
    .map(
      (expense) => `
    <tr>
      <td>${formatDate(expense.date)}</td>
      <td>${expense.description}</td>
      <td>${expense.category}</td>
      <td>₱${expense.amount.toFixed(2)}</td>
      <td>${getMonthName(expense.month)} ${expense.year}</td>
      <td>${expense.recordedBy.firstName} ${expense.recordedBy.lastName}</td>
      <td>${expense.notes || "-"}</td>
    </tr>
  `
    )
    .join("");
}

// Get month name
function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}

// Helper functions
function showError(message) {
  alert("Error: " + message);
}
