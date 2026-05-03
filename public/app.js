import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbK97QU1v2D2Nnp4lCGaVQcSZKOFdngqg",
  authDomain: "my-life-helpers.firebaseapp.com",
  databaseURL: "https://my-life-helpers-default-rtdb.firebaseio.com",
  projectId: "my-life-helpers",
  storageBucket: "my-life-helpers.firebasestorage.app",
  messagingSenderId: "942135098337",
  appId: "1:942135098337:web:99c197d265d6667182f0a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const addBtn = document.getElementById('add-btn');
const addModal = document.getElementById('add-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const addForm = document.getElementById('add-form');

const debtTable = document.getElementById('debt-table');
const debtList = document.getElementById('debt-list');
const emptyState = document.getElementById('empty-state');
const categoryTotalsContainer = document.getElementById('category-totals');
const grandTotalAmount = document.getElementById('grand-total-amount');

// State
let currentUser = null;

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showAppScreen();
    loadDebts();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});

// Login Logic
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  const btn = document.getElementById('login-btn');

  try {
    btn.disabled = true;
    btn.textContent = 'Signing In...';
    await signInWithEmailAndPassword(auth, email, password);
    loginError.classList.add('hidden');
    loginForm.reset();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// Logout Logic
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// Modal Logic
addBtn.addEventListener('click', () => {
  // Auto fill today's date
  document.getElementById('debt-due-date').valueAsDate = new Date();
  addModal.classList.remove('hidden');
});

const closeModal = () => {
  addModal.classList.add('hidden');
  addForm.reset();
};
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// Add Debt Logic
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  const title = document.getElementById('debt-title').value;
  const category = document.getElementById('debt-category').value;
  const dueDate = document.getElementById('debt-due-date').value;
  const amount = parseFloat(document.getElementById('debt-amount').value);
  const remarks = document.getElementById('debt-remarks').value;

  const debtData = {
    title,
    category,
    dateAdded: new Date().toISOString(),
    dueDate,
    amount,
    remarks
  };

  try {
    const btn = document.getElementById('save-debt-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const userDebtsRef = ref(db, `users/${currentUser.uid}/debts`);
    await push(userDebtsRef, debtData);
    closeModal();
  } catch (error) {
    console.error("Error adding debt: ", error);
    alert("Failed to add debt. Make sure Firebase is properly configured.");
  } finally {
    const btn = document.getElementById('save-debt-btn');
    btn.disabled = false;
    btn.textContent = 'Save';
  }
});

// Load and Display Debts
function loadDebts() {
  if (!currentUser) return;

  const userDebtsRef = ref(db, `users/${currentUser.uid}/debts`);
  onValue(userDebtsRef, (snapshot) => {
    const data = snapshot.val();
    debtList.innerHTML = '';

    if (!data) {
      emptyState.classList.remove('hidden');
      debtTable.classList.add('hidden');
      updateSummary({});
      return;
    }

    emptyState.classList.add('hidden');
    debtTable.classList.remove('hidden');

    const categoryTotals = {};
    let grandTotal = 0;

    // Convert object to array and sort by due date
    const debtsArray = Object.entries(data).map(([id, debt]) => ({ id, ...debt }));
    debtsArray.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    debtsArray.forEach((debt) => {
      // Calculate totals
      if (!categoryTotals[debt.category]) {
        categoryTotals[debt.category] = 0;
      }
      categoryTotals[debt.category] += debt.amount;
      grandTotal += debt.amount;

      // Render Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(debt.title)}</td>
        <td>${escapeHtml(debt.category)}</td>
        <td>${formatDate(debt.dateAdded)}</td>
        <td>${formatDate(debt.dueDate)}</td>
        <td>$${debt.amount.toFixed(2)}</td>
        <td>${escapeHtml(debt.remarks || '-')}</td>
        <td>
          <button class="action-btn delete-btn" data-id="${debt.id}" title="Delete">
             Delete
          </button>
        </td>
      `;
      debtList.appendChild(tr);
    });

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Are you sure you want to delete this item?')) {
          const id = e.target.getAttribute('data-id');
          await remove(ref(db, `users/${currentUser.uid}/debts/${id}`));
        }
      });
    });

    updateSummary(categoryTotals, grandTotal);
  });
}

// Update Summary UI
function updateSummary(categoryTotals, grandTotal = 0) {
  categoryTotalsContainer.innerHTML = '';

  Object.entries(categoryTotals).forEach(([category, amount]) => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <span>${escapeHtml(category)}</span>
      <strong>$${amount.toFixed(2)}</strong>
    `;
    categoryTotalsContainer.appendChild(div);
  });

  grandTotalAmount.textContent = `$${grandTotal.toFixed(2)}`;
}

// Utilities
function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function showAppScreen() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
