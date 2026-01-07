import { db, auth, googleProvider } from './firebase-config.js';
import {
  collection, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- Dark Mode ---
const html = document.documentElement;
const darkToggle = document.getElementById('dark-toggle');
const darkIcon = document.getElementById('dark-icon');

function setDarkMode(on) {
  if (on) {
    html.classList.add('dark');
    darkIcon.className = 'ri-sun-line';
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.remove('dark');
    darkIcon.className = 'ri-moon-line';
    localStorage.setItem('theme', 'light');
  }
}
darkToggle.onclick = () => setDarkMode(!html.classList.contains('dark'));
setDarkMode(localStorage.getItem('theme') === 'dark');

// --- Auth System ---
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
  isSignIn = signIn;
  authTitle.textContent = signIn ? 'Sign In' : 'Sign Up';
  toggleAuthMode.textContent = signIn ? "Don't have an account? Sign Up" : "Already have an account? Sign In";
  authModal.classList.remove('hidden');
}
function hideAuthModal() { authModal.classList.add('hidden'); }

authBtn.onclick = () => showAuthModal(true);
closeAuth.onclick = hideAuthModal;
toggleAuthMode.onclick = () => showAuthModal(!isSignIn);
authModal.onclick = e => { if (e.target === authModal) hideAuthModal(); };

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

googleSignin.onclick = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    hideAuthModal();
  } catch (err) { console.error(err); }
};

onAuthStateChanged(auth, user => {
  if (user) {
    authBtn.style.display = 'none';
    userAvatar.style.display = 'block';
    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`;
  } else {
    authBtn.style.display = 'block';
    userAvatar.style.display = 'none';
  }
});
userAvatar.onclick = () => { if (confirm('Sign out?')) signOut(auth); };

// --- Data & State ---
let specials = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

// --- Carousel (Cinematic Hero) ---
const carouselTrack = document.getElementById('carousel-track');
let carouselIndex = 0;
let carouselInterval = null;

async function loadSpecials() {
  const snap = await getDocs(collection(db, 'chefSpecials'));
  specials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderCarousel();
  startCarouselAutoSlide();
}

function renderCarousel() {
  if (!specials.length) return;
  const s = specials[carouselIndex];
  
  carouselTrack.innerHTML = `
    <div style="position:relative; width:100%; height:100%;">
      <img src="${s.imageURL}" class="carousel-img" alt="${s.name}"/>
      <div class="carousel-overlay">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        <div style="margin-top:1rem; font-weight:700; font-size:1.2rem; color:#FFD700;">₦${Number(s.price).toLocaleString()}</div>
      </div>
    </div>
  `;
  
  // Make the hero clickable to open modal
  carouselTrack.onclick = () => showSpecialModal(s);
}

function startCarouselAutoSlide() {
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    if (!specials.length) return;
    carouselIndex = (carouselIndex + 1) % specials.length;
    renderCarousel();
  }, 5000);
}

document.getElementById('carousel-prev').onclick = () => {
  if (!specials.length) return;
  carouselIndex = (carouselIndex - 1 + specials.length) % specials.length;
  renderCarousel();
  startCarouselAutoSlide();
};
document.getElementById('carousel-next').onclick = () => {
  if (!specials.length) return;
  carouselIndex = (carouselIndex + 1) % specials.length;
  renderCarousel();
  startCarouselAutoSlide();
};

// --- Menu Grid (Premium Cards) ---
const menuGrid = document.getElementById('menu-grid');

async function loadMenu() {
  const snap = await getDocs(collection(db, 'menuItems'));
  menuItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMenu();
}

function renderMenu() {
  menuGrid.innerHTML = menuItems.map(item => {
    let qty = Number(cart[item.id]);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;

    return `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${item.imageURL || 'https://via.placeholder.com/400'}" class="card-img" alt="${item.name}">
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
      const qty = parseInt(document.getElementById(`qty-value-${id}`).textContent);
      addToCart(id, qty);
    };
  });
}

// --- Special Modal (Fixed Layout) ---
let specialModal = null;
function showSpecialModal(special) {
  if (specialModal) specialModal.remove();
  
  specialModal = document.createElement('div');
  specialModal.className = 'modal';
  specialModal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close"><i class="ri-close-line"></i></button>
      <img src="${special.imageURL}" style="width:100%; height:250px; object-fit:cover; border-radius:16px; margin-bottom:1rem;">
      <h2 style="font-family:'Playfair Display',serif; margin-bottom:0.5rem;">${special.name}</h2>
      <p style="color:#666; margin-bottom:1.5rem; line-height:1.6;">${special.description}</p>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:1.5rem; font-weight:700; color:var(--accent);">₦${Number(special.price).toLocaleString()}</span>
        <button class="btn-primary add-special-btn">Add to Cart</button>
      </div>
    </div>
  `;
  document.body.appendChild(specialModal);

  specialModal.querySelector('.modal-close').onclick = () => specialModal.remove();
  specialModal.onclick = (e) => { if(e.target === specialModal) specialModal.remove(); };
  specialModal.querySelector('.add-special-btn').onclick = () => {
    addToCart(special.id, 1);
    specialModal.remove();
  };
}

// --- Cart System ---
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsDiv = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartCount = document.getElementById('cart-count');

document.getElementById('cart-btn').onclick = () => cartDrawer.classList.add('open');
document.getElementById('close-cart').onclick = () => cartDrawer.classList.remove('open');

function addToCart(id, qty) {
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  renderCart();
  // Fly effect could go here
  cartDrawer.classList.add('open'); // Auto open cart for feedback
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
  cartCount.textContent = count;
  cartCount.classList.toggle('hidden', count === 0);
}

function renderCart() {
  if (Object.keys(cart).length === 0) {
    cartItemsDiv.innerHTML = '<p style="text-align:center; color:#888; margin-top:2rem;">Your cart is empty.</p>';
    cartSubtotal.textContent = '₦0.00';
    return;
  }

  const allItems = [...menuItems, ...specials];
  let total = 0;

  cartItemsDiv.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return '';
    total += item.price * qty;

    return `
      <div class="cart-item">
        <img src="${item.imageURL}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">₦${(item.price * qty).toLocaleString()}</div>
        </div>
        <div class="qty-selector">
          <button class="qty-btn" onclick="updateCartQty('${id}', ${qty - 1})">-</button>
          <div class="qty-val">${qty}</div>
          <button class="qty-btn" onclick="updateCartQty('${id}', ${qty + 1})">+</button>
        </div>
      </div>
    `;
  }).join('');

  cartSubtotal.textContent = `₦${total.toLocaleString()}`;
  updateCartCount();
}

// --- Checkout Mockup ---
const orderConfirmation = document.getElementById('order-confirmation');
document.getElementById('checkout-btn').onclick = async () => {
  if (!auth.currentUser) {
    alert('Please sign in to complete your order.');
    showAuthModal(true);
    return;
  }
  if (Object.keys(cart).length === 0) return;

  // Simple checkout flow
  try {
    const allItems = [...menuItems, ...specials];
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = allItems.find(i => i.id === id);
      return { name: item.name, price: item.price, qty };
    });

    await addDoc(collection(db, 'orders'), {
      userId: auth.currentUser.uid,
      items: orderItems,
      total: parseInt(cartSubtotal.textContent.replace(/\D/g, '')),
      createdAt: serverTimestamp()
    });

    cart = {};
    saveCart();
    renderCart();
    cartDrawer.classList.remove('open');
    orderConfirmation.classList.remove('hidden');
  } catch (err) {
    alert('Order failed: ' + err.message);
  }
};
document.getElementById('close-confirmation').onclick = () => orderConfirmation.classList.add('hidden');

// --- Initialization ---
loadSpecials();
loadMenu();
renderCart();
updateCartCount();