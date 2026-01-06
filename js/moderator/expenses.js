// Expense Management for Moderators

let allExpenses = [];

// Load data when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadExpenses();
  setupExpenseForm();
  setupExpenseFilters();
  populateYearFilters();
});

// Load all expenses
async function loadExpenses() {
  try {
    const data = await api.getAllExpenses();
    allExpenses = data.data || [];
    renderExpensesTable(allExpenses);
  } catch (error) {
    console.error("Error loading expenses:", error);
    document.getElementById("expensesTableBody").innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #e74c3c;">
          ${error.message || "Failed to load expenses"}
        </td>
      </tr>
    `;
  }
}

// Setup expense form
function setupExpenseForm() {
  const form = document.getElementById("addExpenseForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording...";

    try {
      const expenseData = {
        description: document.getElementById("expenseDescription").value.trim(),
        amount: parseFloat(document.getElementById("expenseAmount").value),
        category: document.getElementById("expenseCategory").value,
        month: parseInt(document.getElementById("expenseMonth").value),
        year: parseInt(document.getElementById("expenseYear").value),
        notes:
          document.getElementById("expenseNotes").value.trim() || undefined,
      };

      await api.addExpense(expenseData);

      showSuccess("Expense recorded successfully!");
      form.reset();

      // Reset year to current year
      const currentYear = new Date().getFullYear();
      document.getElementById("expenseYear").value = currentYear;

      await loadExpenses();
    } catch (error) {
      showError(error.message || "Failed to record expense");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

// Setup expense filters
function setupExpenseFilters() {
  const monthFilter = document.getElementById("expenseFilterMonth");
  const yearFilter = document.getElementById("expenseFilterYear");
  const categoryFilter = document.getElementById("expenseFilterCategory");

  monthFilter.addEventListener("change", filterExpenses);
  yearFilter.addEventListener("change", filterExpenses);
  categoryFilter.addEventListener("change", filterExpenses);
}

// Populate year filters
function populateYearFilters() {
  const yearSelect = document.getElementById("expenseFilterYear");
  const currentYear = new Date().getFullYear();

  // Add years from 2020 to current year + 1
  for (let year = 2020; year <= currentYear + 1; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

// Filter expenses
function filterExpenses() {
  const month = document.getElementById("expenseFilterMonth").value;
  const year = document.getElementById("expenseFilterYear").value;
  const category = document.getElementById("expenseFilterCategory").value;

  let filtered = allExpenses;

  if (month) {
    filtered = filtered.filter((e) => e.month === parseInt(month));
  }

  if (year) {
    filtered = filtered.filter((e) => e.year === parseInt(year));
  }

  if (category) {
    filtered = filtered.filter((e) => e.category === category);
  }

  renderExpensesTable(filtered);
}

// Render expenses table
function renderExpensesTable(expenses) {
  const tbody = document.getElementById("expensesTableBody");

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
function showSuccess(message) {
  alert(message);
}

function showError(message) {
  alert("Error: " + message);
}
