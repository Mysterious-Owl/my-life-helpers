import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

// DOM Elements - Screens
const loginScreen = document.getElementById('login-screen');
const trackerScreen = document.getElementById('tracker-screen');
const configScreen = document.getElementById('config-screen');
const navbar = document.getElementById('navbar');

// DOM Elements - Nav Links
const navTracker = document.getElementById('nav-tracker');
const navConfig = document.getElementById('nav-config');
const logoutBtn = document.getElementById('logout-btn');

// DOM Elements - Login
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// DOM Elements - Config
const configCcForm = document.getElementById('config-cc-form');
const configPersonForm = document.getElementById('config-person-form');
const configCcList = document.getElementById('config-cc-list');
const configPersonList = document.getElementById('config-person-list');

// DOM Elements - Tracker (Inputs)
const addCcBillForm = document.getElementById('add-cc-bill-form');
const ccSelect = document.getElementById('cc-select');
const ccBillAmount = document.getElementById('cc-bill-amount');

const addDealForm = document.getElementById('add-deal-form');
const personSelect = document.getElementById('person-select');
const dealTypeBtn = document.getElementById('deal-type-btn');
const dealAmount = document.getElementById('deal-amount');
const dealRemarks = document.getElementById('deal-remarks');

// DOM Elements - Tracker (Lists)
const ccList = document.getElementById('cc-list');
const ccEmptyState = document.getElementById('cc-empty-state');
const ccTotalAmount = document.getElementById('cc-total-amount');

const dealsList = document.getElementById('deals-list');
const dealsEmptyState = document.getElementById('deals-empty-state');
const dealsTotalAmount = document.getElementById('deals-total-amount');

// State
let currentUser = null;
let currentConfig = { creditCards: {}, people: {} };

// --- Routing ---
function navigateTo(path) {
  window.history.pushState({}, "", path);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;
  
  // Hide all screens initially
  loginScreen.classList.add('hidden');
  trackerScreen.classList.add('hidden');
  configScreen.classList.add('hidden');
  
  // Update Nav links
  navTracker.classList.remove('active');
  navConfig.classList.remove('active');

  if (!currentUser) {
    loginScreen.classList.remove('hidden');
    navbar.classList.add('hidden');
    // If not logged in, force them to login visually, regardless of URL
    return;
  }

  // User is logged in
  navbar.classList.remove('hidden');
  
  if (path === '/config') {
    configScreen.classList.remove('hidden');
    navConfig.classList.add('active');
  } else {
    // Default to tracker
    trackerScreen.classList.remove('hidden');
    navTracker.classList.add('active');
    if (path !== '/debt-tracker') {
      window.history.replaceState({}, "", "/debt-tracker");
    }
  }
}

// Intercept Nav clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(e.target.getAttribute('href'));
  });
});
window.addEventListener('popstate', handleRoute);

// --- Auth ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    handleRoute();
    loadConfig();
    loadTransactions();
  } else {
    // Redirect to root/login on logout
    window.history.replaceState({}, "", "/");
    handleRoute();
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  try {
    btn.disabled = true;
    btn.textContent = 'Signing In...';
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
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

logoutBtn.addEventListener('click', () => signOut(auth));


// --- Configuration Logic ---
configCcForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const data = {
    name: document.getElementById('config-cc-name').value,
    bank: document.getElementById('config-cc-bank').value,
    dueDay: document.getElementById('config-cc-due').value
  };
  await push(ref(db, `users/${currentUser.uid}/config/creditCards`), data);
  configCcForm.reset();
});

configPersonForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const data = {
    name: document.getElementById('config-person-name').value
  };
  await push(ref(db, `users/${currentUser.uid}/config/people`), data);
  configPersonForm.reset();
});

function loadConfig() {
  const configRef = ref(db, `users/${currentUser.uid}/config`);
  onValue(configRef, (snapshot) => {
    const data = snapshot.val() || { creditCards: {}, people: {} };
    currentConfig = {
      creditCards: data.creditCards || {},
      people: data.people || {}
    };
    renderConfigUI();
    renderSelectDropdowns();
  });
}

function renderConfigUI() {
  // Render CC Config
  configCcList.innerHTML = '';
  Object.entries(currentConfig.creditCards).forEach(([id, card]) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${escapeHtml(card.name)}</strong> (${escapeHtml(card.bank)}) - Due on ${card.dueDay}th</span>
      <button class="delete-text-btn" data-id="${id}" data-type="cc">Remove</button>
    `;
    configCcList.appendChild(li);
  });

  // Render People Config
  configPersonList.innerHTML = '';
  Object.entries(currentConfig.people).forEach(([id, person]) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(person.name)}</span>
      <button class="delete-text-btn" data-id="${id}" data-type="person">Remove</button>
    `;
    configPersonList.appendChild(li);
  });

  // Add delete listeners
  document.querySelectorAll('.delete-text-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const type = e.target.getAttribute('data-type');
      const path = type === 'cc' ? 'creditCards' : 'people';
      if(confirm('Remove this configuration? Active transactions will lose their name reference.')) {
        await remove(ref(db, `users/${currentUser.uid}/config/${path}/${id}`));
      }
    });
  });
}

function renderSelectDropdowns() {
  ccSelect.innerHTML = '<option value="" disabled selected>Select Card</option>';
  Object.entries(currentConfig.creditCards).forEach(([id, card]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${card.name} (${card.bank})`;
    ccSelect.appendChild(opt);
  });

  personSelect.innerHTML = '<option value="" disabled selected>Select Person</option>';
  Object.entries(currentConfig.people).forEach(([id, person]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = person.name;
    personSelect.appendChild(opt);
  });
}

// --- Tracker Logic ---

// Add CC Bill
addCcBillForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const cardId = ccSelect.value;
  const amount = parseFloat(ccBillAmount.value);
  if(!cardId || isNaN(amount)) return;

  const data = {
    cardId,
    amount,
    dateAdded: new Date().toISOString(),
    isPaid: false
  };
  await push(ref(db, `users/${currentUser.uid}/transactions/creditCards`), data);
  addCcBillForm.reset();
});

// Toggle Deal Type (+/-)
dealTypeBtn.addEventListener('click', () => {
  const isGiven = dealTypeBtn.dataset.type === 'given';
  if (isGiven) {
    dealTypeBtn.dataset.type = 'taken';
    dealTypeBtn.textContent = '-';
    dealTypeBtn.classList.remove('given');
    dealTypeBtn.classList.add('taken');
    dealTypeBtn.title = 'Taken (-)';
  } else {
    dealTypeBtn.dataset.type = 'given';
    dealTypeBtn.textContent = '+';
    dealTypeBtn.classList.remove('taken');
    dealTypeBtn.classList.add('given');
    dealTypeBtn.title = 'Given (+)';
  }
});

// Add Deal
addDealForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const personId = personSelect.value;
  const type = dealTypeBtn.dataset.type; // Read from toggle button
  const amount = parseFloat(dealAmount.value);
  const remarks = dealRemarks.value;
  if(!personId || isNaN(amount)) return;

  const data = {
    personId,
    type,
    amount,
    remarks,
    dateAdded: new Date().toISOString(),
    isPaid: false
  };
  await push(ref(db, `users/${currentUser.uid}/transactions/personalDeals`), data);
  addDealForm.reset();
  
  // Reset toggle to given (+)
  dealTypeBtn.dataset.type = 'given';
  dealTypeBtn.textContent = '+';
  dealTypeBtn.classList.remove('taken');
  dealTypeBtn.classList.add('given');
});

// Load Transactions
function loadTransactions() {
  const ccRef = ref(db, `users/${currentUser.uid}/transactions/creditCards`);
  onValue(ccRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderCcTransactions(data);
  });

  const dealsRef = ref(db, `users/${currentUser.uid}/transactions/personalDeals`);
  onValue(dealsRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderDealsTransactions(data);
  });
}

function renderCcTransactions(data) {
  ccList.innerHTML = '';
  let total = 0;
  
  // Convert to array for sorting
  const bills = Object.entries(data).filter(([id, txn]) => !txn.isPaid).map(([id, txn]) => {
    const card = currentConfig.creditCards[txn.cardId] || { name: 'Unknown Card', bank: '?', dueDay: 31 };
    
    // Calculate a "next due date" for sorting purposes
    const now = new Date();
    const dueDayNum = parseInt(card.dueDay) || 31;
    let nextDate = new Date(now.getFullYear(), now.getMonth(), dueDayNum);
    if (nextDate < now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return { id, txn, card, nextDate };
  });
  
  // Sort by next due date
  bills.sort((a, b) => a.nextDate - b.nextDate);

  bills.forEach(({ id, txn, card, nextDate }) => {
    total += txn.amount;
    
    // Check if urgent (within 7 days)
    const now = new Date();
    const daysUntilDue = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilDue <= 7 && daysUntilDue >= 0;
    const textClass = isUrgent ? 'urgent-text' : '';
    
    // Formatting nextDate
    const dateStr = nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="paid-overlay">✔</div>
      <div class="item-row">
        <span class="item-name ${textClass}">${escapeHtml(card.name)} - ${escapeHtml(card.bank)}</span>
        <span class="item-amount ${textClass}">${formatINR(txn.amount)}</span>
      </div>
      <div class="item-row">
        <span class="item-subtext ${textClass}">${dateStr}</span>
      </div>
    `;
    
    // Click logic for marking paid
    li.addEventListener('click', async (e) => {
      const isTouch = window.matchMedia("(hover: none)").matches;
      if (isTouch) {
        if (!li.classList.contains('show-overlay')) {
          document.querySelectorAll('.item-list li').forEach(el => el.classList.remove('show-overlay'));
          li.classList.add('show-overlay');
          return;
        }
      }
      
      await update(ref(db, `users/${currentUser.uid}/transactions/creditCards/${id}`), {
        isPaid: true,
        datePaid: new Date().toISOString()
      });
    });
    
    ccList.appendChild(li);
  });

  ccTotalAmount.textContent = formatINR(total);

  if (bills.length === 0) {
    ccList.classList.add('hidden');
    ccEmptyState.classList.remove('hidden');
  } else {
    ccList.classList.remove('hidden');
    ccEmptyState.classList.add('hidden');
  }
}

function renderDealsTransactions(data) {
  dealsList.innerHTML = '';
  let total = 0;
  
  const deals = Object.entries(data).filter(([id, txn]) => !txn.isPaid);

  deals.forEach(([id, txn]) => {
    const person = currentConfig.people[txn.personId] || { name: 'Unknown Person' };
    
    // If taken (-), if given (+)
    // The requirement says "+/- sign (borrowed/sent) as symbol"
    const sign = txn.type === 'given' ? '+' : '-';
    const amountClass = txn.type === 'given' ? 'given-amount' : 'taken-amount';
    
    // Total computation: we can just sum up the raw amounts for now or net them.
    // Usually total is absolute, but maybe net is better. Let's do absolute sum or net?
    // Let's do net: given is positive, taken is negative.
    if (txn.type === 'given') {
      total += txn.amount;
    } else {
      total -= txn.amount;
    }
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="paid-overlay">✔</div>
      <div class="item-row">
        <span class="item-name">${escapeHtml(person.name)}</span>
        <span class="item-amount ${amountClass}">${sign}${formatINR(txn.amount)}</span>
      </div>
      <div class="item-row">
        <span class="item-subtext">${escapeHtml(txn.remarks || 'No remarks')}</span>
      </div>
    `;
    
    // Click logic for marking paid
    li.addEventListener('click', async (e) => {
      const isTouch = window.matchMedia("(hover: none)").matches;
      if (isTouch) {
        if (!li.classList.contains('show-overlay')) {
          document.querySelectorAll('.item-list li').forEach(el => el.classList.remove('show-overlay'));
          li.classList.add('show-overlay');
          return;
        }
      }
      
      await update(ref(db, `users/${currentUser.uid}/transactions/personalDeals/${id}`), {
        isPaid: true,
        datePaid: new Date().toISOString()
      });
    });
    
    dealsList.appendChild(li);
  });

  dealsTotalAmount.textContent = formatINR(Math.abs(total)) + (total < 0 ? ' (Net Taken)' : ' (Net Given)');

  if (deals.length === 0) {
    dealsList.classList.add('hidden');
    dealsEmptyState.classList.remove('hidden');
  } else {
    dealsList.classList.remove('hidden');
    dealsEmptyState.classList.add('hidden');
  }
}

// Remove mobile overlay if clicked outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.item-list li')) {
    document.querySelectorAll('.item-list li').forEach(el => el.classList.remove('show-overlay'));
  }
});


// --- Utilities ---
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
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
