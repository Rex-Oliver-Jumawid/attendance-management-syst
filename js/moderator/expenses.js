// Expense Management for Moderators

let allExpenses = [];
let availableBalance = 0;

// Load data when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadAvailableBalance();
  loadExpenses();
  setupExpenseForm();
  setupExpenseFilters();
  populateYearFilters();

  // Auto-refresh balance every 30 seconds
  setInterval(loadAvailableBalance, 30000);
});

// Load available balance
async function loadAvailableBalance() {
  try {
    const data = await api.getAvailableBalance();
    availableBalance = data.data.availableBalance;

    // Update balance display
    const balanceElement = document.getElementById("availableBalance");
    if (balanceElement) {
      balanceElement.textContent = `₱${availableBalance.toFixed(2)}`;
      balanceElement.style.color = availableBalance >= 0 ? "#000" : "#e74c3c";
    }
  } catch (error) {
    console.error("Error loading balance:", error);
  }
}

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
        <td colspan="6" style="text-align: center; color: #e74c3c;">
          ${error.message || "Failed to load expenses"}
        </td>
      </tr>
    `;
  }
}

// Setup expense form
function setupExpenseForm() {
  const form = document.getElementById("addExpenseForm");

  // Real-time validation on the amount input
  const amountInput = document.getElementById("expenseAmount");
  if (amountInput) {
    amountInput.addEventListener("input", () => {
      const val = parseFloat(amountInput.value);
      if (!isNaN(val) && val > availableBalance) {
        amountInput.setCustomValidity(
          `Amount exceeds available balance (₱${availableBalance.toFixed(2)})`,
        );
        amountInput.style.borderColor = "#e74c3c";
      } else {
        amountInput.setCustomValidity("");
        amountInput.style.borderColor = "";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording...";

    try {
      const amount = parseFloat(document.getElementById("expenseAmount").value);

      // Validate amount against available balance
      if (amount > availableBalance) {
        showError(
          `Expense amount (₱${amount.toFixed(
            2,
          )}) exceeds available balance (₱${availableBalance.toFixed(2)})`,
        );
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }

      const expenseData = {
        amount: amount,
        category: document.getElementById("expenseCategory").value,
      };

      await api.addExpense(expenseData);

      showSuccess("Expense recorded successfully!");
      form.reset();

      // Reload data
      await loadAvailableBalance();
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

  // Add years from 2026 to current year
  for (let year = 2026; year <= currentYear; year++) {
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
        <td colspan="6" style="text-align: center;">No expenses found</td>
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
      <td>${expense.recordedBy ? `${expense.recordedBy.firstName} ${expense.recordedBy.lastName}` : "Deleted User"}</td>
      <td>
        <button onclick="deleteExpense('${expense._id}')" style="background:#e74c3c;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// Delete an expense
async function deleteExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) return;

  try {
    await api.deleteExpense(id);
    showSuccess("Expense deleted successfully!");
    await loadAvailableBalance();
    await loadExpenses();
  } catch (error) {
    showError(error.message || "Failed to delete expense");
  }
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
