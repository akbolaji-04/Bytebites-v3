import { db, auth, googleProvider } from './firebase-config.js';
import {
  collection, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithPopup, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const html = document.documentElement;
const darkToggle = document.getElementById('dark-toggle');
const darkIcon = document.getElementById('dark-icon');

function setDarkMode(on) {
  if (on) {
    html.classList.add('dark');
    if (darkIcon) darkIcon.className = 'ri-sun-line';
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.remove('dark');
    if (darkIcon) darkIcon.className = 'ri-moon-line';
    localStorage.setItem('theme', 'light');
  }
}

// initialize theme: prefer user's system setting unless they previously chose a theme
const themePref = localStorage.getItem('theme');
const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
if (themePref) {
  setDarkMode(themePref === 'dark');
} else if (mql) {
  setDarkMode(mql.matches);
  // if system preference changes and user hasn't chosen manually, adapt
  try { mql.addEventListener ? mql.addEventListener('change', e => { if (!localStorage.getItem('theme')) setDarkMode(e.matches); }) : mql.addListener(e => { if (!localStorage.getItem('theme')) setDarkMode(e.matches); }); } catch (err) {}
}
if (darkToggle) {
  darkToggle.onclick = () => {
    // user manually toggles -> override system preference
    setDarkMode(!html.classList.contains('dark'));
  };
}

// ensure Firebase auth uses persistent (local) persistence so users stay signed in
try {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('Could not set auth persistence:', err);
  });
} catch (err) { console.warn('Auth persistence setup failed', err); }

const authModal = document.getElementById('auth-modal');
const authBtn = document.getElementById('auth-btn');
const closeAuth = document.getElementById('close-auth');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const googleSignin = document.getElementById('google-signin');
const userAvatar = document.getElementById('user-avatar');
let isSignIn = true;

function showAuthModal(signIn = true) {
  if (!authModal) return;
  isSignIn = signIn;
  authTitle.textContent = signIn ? 'Sign In' : 'Sign Up';
  toggleAuthMode.textContent = signIn ? "Don't have an account? Sign Up" : "Already have an account? Sign In";
  authModal.classList.remove('hidden');
}

function hideAuthModal() {
  if (authModal) authModal.classList.add('hidden');
}

if (authBtn) authBtn.onclick = () => showAuthModal(true);
if (closeAuth) closeAuth.onclick = hideAuthModal;
if (toggleAuthMode) toggleAuthMode.onclick = () => showAuthModal(!isSignIn);
if (authModal) authModal.onclick = e => { if (e.target === authModal) hideAuthModal(); };

if (authForm) {
  authForm.onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    try {
      if (isSignIn) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      hideAuthModal();
    } catch (err) { alert(err.message); }
  };
}

if (googleSignin) {
  googleSignin.onclick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      hideAuthModal();
    } catch (err) { console.error(err); }
  };
}

onAuthStateChanged(auth, user => {
  if (user) {
    if (authBtn) authBtn.style.display = 'none';
    if (userAvatar) {
      userAvatar.style.display = 'block';
      userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`;
    }
  } else {
    if (authBtn) authBtn.style.display = 'block';
    if (userAvatar) userAvatar.style.display = 'none';
  }
});

if (userAvatar) userAvatar.onclick = () => { if (confirm('Sign out?')) signOut(auth); };

let specials = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}');
let currentFilter = 'all';

const carouselTrack = document.getElementById('carousel-track');
let carouselIndex = 0;
let carouselInterval = null;

async function loadSpecials() {
  try {
    const snap = await getDocs(collection(db, 'chefSpecials'));
    specials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCarousel();
    startCarouselAutoSlide();
  } catch (err) { console.error(err); }
}

function renderCarousel() {
  if (!specials.length || !carouselTrack) return;
  const s = specials[carouselIndex];

  carouselTrack.innerHTML = `
    <div style="position:relative; width:100%; height:100%; cursor:pointer;">
      <img src="${s.imageURL}" class="carousel-img" alt="${s.name}" onerror="this.src='https://via.placeholder.com/800x400?text=Delicious+Food'"/>
      <div class="carousel-overlay" style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding:2rem; color:white; pointer-events:none;">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        <div style="margin-top:0.5rem; font-weight:700; font-size:1.2rem; color:#FFD700;">₦${Number(s.price).toLocaleString()}</div>
      </div>
    </div>
  `;

  const wrapper = carouselTrack.firstElementChild;
  // Ensure clicks anywhere on the carousel track open the special modal (robust on desktop)
  if (carouselTrack) {
    carouselTrack.onclick = () => {
      try { showSpecialModal(s); } catch (err) { console.error(err); }
    };
  }
}

function startCarouselAutoSlide() {
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    if (!specials.length) return;
    carouselIndex = (carouselIndex + 1) % specials.length;
    renderCarousel();
  }, 5000);
}

const prevBtn = document.getElementById('carousel-prev');
const nextBtn = document.getElementById('carousel-next');

// Remove arrow button handlers (we now use swipe gestures). Keep variables if needed for progressive enhancement.

function goToNextSpecial() {
  if (!specials.length) return;
  carouselIndex = (carouselIndex + 1) % specials.length;
  renderCarousel();
  startCarouselAutoSlide();
}
function goToPrevSpecial() {
  if (!specials.length) return;
  carouselIndex = (carouselIndex - 1 + specials.length) % specials.length;
  renderCarousel();
  startCarouselAutoSlide();
}

// Add pointer/touch swipe support on the carousel track
if (carouselTrack) {
  let pointerDown = false;
  let startX = 0;
  let lastX = 0;
  let pointerId = null;

  carouselTrack.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    startX = e.clientX;
    lastX = startX;
    pointerId = e.pointerId;
    carouselTrack.setPointerCapture(pointerId);
  });

  carouselTrack.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    lastX = e.clientX;
  });

  const endGesture = (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    try { if (pointerId != null) carouselTrack.releasePointerCapture(pointerId); } catch (err) {}
    const dx = lastX - startX;
    if (Math.abs(dx) < 40) return; // small move -> ignore
    if (dx < 0) goToNextSpecial(); else goToPrevSpecial();
  };

  carouselTrack.addEventListener('pointerup', endGesture);
  carouselTrack.addEventListener('pointercancel', endGesture);
  carouselTrack.addEventListener('pointerleave', endGesture);
}

const menuGrid = document.getElementById('menu-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
  btn.onclick = () => {

    filterBtns.forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    renderMenu();
  };
});

async function loadMenu() {
  try {
    const snap = await getDocs(collection(db, 'menuItems'));
    menuItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMenu();
  } catch (err) { console.error(err); }
}

function renderMenu() {
  if (!menuGrid) return;

  const filteredItems = currentFilter === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === currentFilter);

  if (filteredItems.length === 0) {
    menuGrid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:2rem; color:#888;">No items found in this category.</div>`;
    return;
  }

  menuGrid.innerHTML = filteredItems.map(item => {
    let qty = Number(cart[item.id]) || 1;

    return `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${item.imageURL || 'https://via.placeholder.com/400'}" class="card-img" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
          <div class="price-tag">₦${Number(item.price).toLocaleString()}</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${item.name}</h3>
          <p class="card-desc">${item.description}</p>
          <div class="card-actions">
            <div class="qty-selector">
              <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
              <div class="qty-val" id="qty-value-${item.id}">${qty}</div>
              <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <button class="add-btn add-cart-btn" data-id="${item.id}">Add</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  attachMenuListeners();
}

function attachMenuListeners() {
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const display = document.getElementById(`qty-value-${id}`);
      let val = parseInt(display.textContent) + parseInt(btn.dataset.delta);
      if (val < 1) val = 1;
      display.textContent = val;
    };
  });

  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const qtyDisplay = document.getElementById(`qty-value-${id}`);
      const qty = qtyDisplay ? parseInt(qtyDisplay.textContent) : 1;
      addToCart(id, qty);
    };
  });
}

let specialModal = null;
function showSpecialModal(special) {
  if (specialModal) specialModal.remove();

  specialModal = document.createElement('div');
  specialModal.id = 'special-modal';
  specialModal.className = 'modal';
  specialModal.setAttribute('role', 'dialog');
  specialModal.setAttribute('aria-modal', 'true');
  specialModal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn modal-close" aria-label="Close"><i class="ri-close-line"></i></button>
      <img src="${special.imageURL}" class="special-img" onerror="this.src='https://via.placeholder.com/400'"/>
      <h2 class="special-title">${special.name}</h2>
      <p class="special-desc">${special.description}</p>
      <div class="special-price">₦${Number(special.price).toLocaleString()}</div>
      <button class="add-cart-btn add-btn">Add to Cart</button>
    </div>
  `;
  document.body.appendChild(specialModal);

  const closeBtn = specialModal.querySelector('.close-btn');
  closeBtn.onclick = () => specialModal.remove();
  specialModal.onclick = (e) => { if (e.target === specialModal) specialModal.remove(); };

  const addBtn = specialModal.querySelector('.add-cart-btn');
  addBtn.onclick = () => {
    addToCart(special.id, 1);
    specialModal.remove();
  };
}

const cartDrawer = document.getElementById('cart-drawer');
const cartItemsDiv = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartCount = document.getElementById('cart-count');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');

if (cartBtn) cartBtn.onclick = () => cartDrawer.classList.add('open');
if (closeCartBtn) closeCartBtn.onclick = () => cartDrawer.classList.remove('open');

function addToCart(id, qty) {
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  renderCart();
  if (cartDrawer) cartDrawer.classList.add('open');
}

window.updateCartQty = (id, newQty) => {
  if (newQty < 1) {
    delete cart[id];
  } else {
    cart[id] = newQty;
  }
  saveCart();
  renderCart();
};

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  if (cartCount) {
    cartCount.textContent = count;
    cartCount.classList.toggle('hidden', count === 0);
  }
}

function renderCart() {
  if (!cartItemsDiv) return;
  if (Object.keys(cart).length === 0) {
    cartItemsDiv.innerHTML = '<p style="text-align:center; color:#888; margin-top:2rem;">Your cart is empty.</p>';
    if (cartSubtotal) cartSubtotal.textContent = '₦0.00';
    return;
  }

  const allItems = [...menuItems, ...specials];
  let total = 0;

  cartItemsDiv.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return '';
    total += item.price * qty;

    return `
      <div class="cart-item-row">
        <img src="${item.imageURL}" class="cart-img" onerror="this.src='https://via.placeholder.com/60'"/>
        <div class="cart-item-details">
          <h5>${item.name}</h5>
          <div style="font-size:0.9rem; color:#888;">₦${Number(item.price).toLocaleString()}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateCartQty('${id}', ${qty - 1})">-</button>
          <span>${qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${id}', ${qty + 1})">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (cartSubtotal) cartSubtotal.textContent = `₦${total.toLocaleString()}`;
  updateCartCount();
}

const checkoutBtn = document.getElementById('checkout-btn');
const orderConfirmation = document.getElementById('order-confirmation');
const closeConfirmation = document.getElementById('close-confirmation');

if (checkoutBtn) {
  checkoutBtn.onclick = async () => {
    if (!auth.currentUser) {
      alert('Please sign in to complete your order.');
      showAuthModal(true);
      return;
    }
    if (Object.keys(cart).length === 0) return;

    try {
      const allItems = [...menuItems, ...specials];
      const orderItems = Object.entries(cart).map(([id, qty]) => {
        const item = allItems.find(i => i.id === id);
        if (!item) return null;
        return { name: item.name, price: item.price, qty };
      }).filter(i => i !== null);

      await addDoc(collection(db, 'orders'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        items: orderItems,
        total: parseInt(cartSubtotal.textContent.replace(/\D/g, '')),
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      cart = {};
      saveCart();
      renderCart();
      if (cartDrawer) cartDrawer.classList.remove('open');
      if (orderConfirmation) orderConfirmation.classList.remove('hidden');
    } catch (err) {
      alert('Order failed: ' + err.message);
    }
  };
}

if (closeConfirmation) closeConfirmation.onclick = () => orderConfirmation.classList.add('hidden');

loadSpecials();
loadMenu();
renderCart();
updateCartCount();

document.addEventListener('click', (event) => {
  const cartDrawer = document.getElementById('cart-drawer');
  const cartBtn = document.getElementById('cart-btn');

  if (!cartDrawer || !cartBtn) return;

  if (cartDrawer.classList.contains('open') &&
      !cartDrawer.contains(event.target) &&
      !cartBtn.contains(event.target)) {

    cartDrawer.classList.remove('open');
  }
});