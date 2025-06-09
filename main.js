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
    darkIcon.innerHTML = '<use href="#sun"></use>';
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.remove('dark');
    darkIcon.innerHTML = '<use href="#moon"></use>';
    localStorage.setItem('theme', 'light');
  }
}
darkToggle.onclick = () => setDarkMode(!html.classList.contains('dark'));
setDarkMode(localStorage.getItem('theme') === 'dark');

// --- Auth Modal ---
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
  } catch (err) {
    alert(err.message);
  }
};
googleSignin.onclick = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    hideAuthModal();
  } catch (err) {
    if (err.code !== 'auth/cancelled-popup-request') {
      alert(err.message);
    }
  }
};

// --- Auth State ---
onAuthStateChanged(auth, user => {
  if (user) {
    authBtn.classList.add('hidden');
    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`;
    userAvatar.classList.remove('hidden');
  } else {
    authBtn.classList.remove('hidden');
    userAvatar.classList.add('hidden');
  }
});
userAvatar.onclick = () => {
  if (confirm('Sign out?')) signOut(auth);
};

// --- Chef's Specials Carousel ---
const carouselTrack = document.getElementById('carousel-track');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');
let specials = [];
let carouselIndex = 0;
let carouselInterval = null;

async function loadSpecials() {
  const snap = await getDocs(collection(db, 'chefSpecials'));
  specials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderCarousel();
  startCarouselAutoSlide();
}

function renderCarousel() {
  if (!specials.length) {
    carouselTrack.innerHTML = `<div class="w-full flex flex-col items-center justify-center min-h-[220px] text-neutral-dark/60 dark:text-neutral-light/60 text-lg">No Chef's Specials available right now. Check back soon!</div>`;
    return;
  }
  const s = specials[carouselIndex];
  carouselTrack.innerHTML = `
    <div class="w-full flex flex-col items-center justify-center p-8">
      <div class="flex flex-col items-center bg-white dark:bg-neutral-dark rounded-2xl shadow-soft p-6 max-w-md mx-auto" style="position:relative;">
        <img src="${s.imageURL || 'https://via.placeholder.com/180?text=No+Image'}" alt="${s.name}" class="carousel-img mb-4" onerror="this.onerror=null;this.src='https://via.placeholder.com/180?text=No+Image';"/>
        <h3 class="font-display text-2xl font-bold mb-2">${s.name}</h3>
        <p class="mb-2 text-center">${s.description}</p>
        <span class="font-semibold text-accent text-lg">₦${Number(s.price).toLocaleString()}</span>
      </div>
    </div>
  `;
}

function updateCarousel() {
  renderCarousel();
}

function startCarouselAutoSlide() {
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    if (!specials.length) return;
    carouselIndex = (carouselIndex + 1) % specials.length;
    updateCarousel();
  }, 4000);
}

carouselPrev.onclick = () => {
  if (!specials.length) return;
  carouselIndex = (carouselIndex - 1 + specials.length) % specials.length;
  updateCarousel();
  startCarouselAutoSlide();
};
carouselNext.onclick = () => {
  if (!specials.length) return;
  carouselIndex = (carouselIndex + 1) % specials.length;
  updateCarousel();
  startCarouselAutoSlide();
};

// Popup modal for Chef's Special
let specialModal = null;
function showSpecialModal(special) {
  if (specialModal) specialModal.remove();
  specialModal = document.createElement('div');
  specialModal.id = 'special-modal';
  specialModal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn">&times;</button>
      <img src="${special.imageURL || 'https://via.placeholder.com/180?text=No+Image'}" alt="${special.name}" class="special-img"/>
      <div class="special-title">${special.name}</div>
      <div class="special-desc">${special.description}</div>
      <div class="special-price">₦${Number(special.price).toLocaleString()}</div>
      <button class="add-cart-btn">Add to Cart</button>
    </div>
  `;
  document.body.appendChild(specialModal);
  specialModal.querySelector('.close-btn').onclick = () => specialModal.remove();
  specialModal.onclick = e => { if (e.target === specialModal) specialModal.remove(); };
  specialModal.querySelector('.add-cart-btn').onclick = () => {
    addToCart(special.id, { target: specialModal.querySelector('.add-cart-btn') });
    specialModal.remove();
  };
}

carouselTrack.onclick = () => {
  if (!specials.length) return;
  showSpecialModal(specials[carouselIndex]);
};

// --- Menu Grid ---
const menuGrid = document.getElementById('menu-grid');
let menuItems = [];
async function loadMenu() {
  const snap = await getDocs(collection(db, 'menuItems'));
  menuItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMenu();
}
function renderMenu() {
  menuGrid.innerHTML = menuItems.map(item => `
    <div class="card group transition hover:shadow-lg hover:-translate-y-1">
      <div class="relative">
        <img src="${item.imageURL || 'https://via.placeholder.com/220?text=No+Image'}" alt="${item.name}" class="card-img" onerror="this.onerror=null;this.src='https://via.placeholder.com/220?text=No+Image';"/>
        <button data-id="${item.id}" class="add-cart-btn absolute bottom-2 right-2 bg-accent text-white p-2 rounded-full shadow-soft opacity-0 group-hover:opacity-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"><use href="#cart-icon"></use></svg>
        </button>
      </div>
      <h4 class="card-title font-display text-xl font-bold">${item.name}</h4>
      <p class="card-desc flex-1">${item.description}</p>
      <div class="flex items-center justify-between">
        <span class="card-price font-semibold text-accent text-lg">₦${Number(item.price).toLocaleString()}</span>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.onclick = e => addToCart(btn.dataset.id, e);
  });
}

// --- Cart Drawer ---
const cartBtn = document.getElementById('cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const closeCart = document.getElementById('close-cart');
const cartItemsDiv = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartCount = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

function openCart() { cartDrawer.style.transform = 'translateX(0)'; }
function closeCartDrawer() { cartDrawer.style.transform = 'translateX(100%)'; }
cartBtn.onclick = openCart;
closeCart.onclick = closeCartDrawer;
cartDrawer.onclick = e => { if (e.target === cartDrawer) closeCartDrawer(); };

function addToCart(id, e) {
  cart[id] = (cart[id] || 0) + 1;
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  flyToCart(e.target.closest('.add-cart-btn'));
}
function removeFromCart(id) {
  delete cart[id];
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}
function updateCartQty(id, qty) {
  if (qty < 1) return;
  cart[id] = qty;
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}
function renderCart() {
  let items = Object.entries(cart).map(([id, qty]) => {
    let item = menuItems.find(m => m.id === id) || specials.find(s => s.id === id);
    if (!item) return '';
    return `
      <div class="cart-item-row">
        <img src="${item.imageURL || 'https://via.placeholder.com/56?text=No+Image'}" class="cart-img"/>
        <div class="cart-item-details">
          <h5>${item.name}</h5>
          <div class="cart-item-controls">
            <button class="qty-btn px-2 py-1 rounded bg-neutral-light dark:bg-neutral-dark" data-id="${id}" data-delta="-1">-</button>
            <span class="font-semibold">${qty}</span>
            <button class="qty-btn px-2 py-1 rounded bg-neutral-light dark:bg-neutral-dark" data-id="${id}" data-delta="1">+</button>
            <span class="cart-item-price">₦${(item.price * qty).toLocaleString()}</span>
          </div>
        </div>
        <button class="remove-cart text-neutral-dark dark:text-neutral-light hover:text-accent" data-id="${id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><use href="#close-icon"></use></svg>
        </button>
      </div>
    `;
  }).join('');
  cartItemsDiv.innerHTML = items || '<p class="text-center text-neutral-dark/60 dark:text-neutral-light/60">Your cart is empty.</p>';
  let subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    let item = menuItems.find(m => m.id === id) || specials.find(s => s.id === id);
    return item ? sum + item.price * qty : sum;
  }, 0);
  cartSubtotal.textContent = `₦${subtotal.toLocaleString()}`;
  let count = Object.values(cart).reduce((a, b) => a + b, 0);
  cartCount.textContent = count;
  cartCount.classList.toggle('hidden', count === 0);

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.onclick = () => {
      let id = btn.dataset.id;
      let delta = parseInt(btn.dataset.delta);
      let qty = cart[id] + delta;
      if (qty < 1) return;
      updateCartQty(id, qty);
    };
  });
  document.querySelectorAll('.remove-cart').forEach(btn => {
    btn.onclick = () => removeFromCart(btn.dataset.id);
  });
}
function flyToCart(btn) {
  const img = btn.closest('.relative').querySelector('img');
  const cartIcon = cartBtn;
  if (!img || !cartIcon) return;
  const imgRect = img.getBoundingClientRect();
  const cartRect = cartIcon.getBoundingClientRect();
  const clone = img.cloneNode();
  clone.style.position = 'fixed';
  clone.style.left = imgRect.left + 'px';
  clone.style.top = imgRect.top + 'px';
  clone.style.width = imgRect.width + 'px';
  clone.style.height = imgRect.height + 'px';
  clone.style.zIndex = 9999;
  clone.classList.add('fly-to-cart');
  document.body.appendChild(clone);
  setTimeout(() => {
    clone.style.left = cartRect.left + 'px';
    clone.style.top = cartRect.top + 'px';
    clone.style.width = '32px';
    clone.style.height = '32px';
    clone.style.opacity = 0;
  }, 10);
  setTimeout(() => clone.remove(), 700);
}

// --- Checkout Modal ---
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');
const checkoutSteps = document.getElementById('checkout-steps');
let checkoutStep = 0;
let orderData = {};

checkoutBtn.onclick = () => {
  if (!auth.currentUser) {
    showAuthModal(true);
    return;
  }
  if (Object.keys(cart).length === 0) return;
  checkoutStep = 0;
  orderData = {};
  showCheckoutStep();
  checkoutModal.classList.remove('hidden');
};
closeCheckout.onclick = () => checkoutModal.classList.add('hidden');
checkoutModal.onclick = e => { if (e.target === checkoutModal) checkoutModal.classList.add('hidden'); };

function initAddressAutocomplete() {
  const input = document.getElementById('delivery-address');
  if (input && window.google && window.google.maps && window.google.maps.places) {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'ng' } // Adjust country code as needed
    });
    autocomplete.setFields(['formatted_address']);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      input.value = place.formatted_address || input.value;
    });
  }
}

function showCheckoutStep() {
  checkoutSteps.innerHTML = '';
  if (checkoutStep === 0) {
    // Delivery address step
    let savedAddress = localStorage.getItem('savedAddress') || '';
    checkoutSteps.innerHTML = `
      <div class="checkout-progress">
        <div class="checkout-step completed">
          <span>1</span>
          <span class="checkout-step-label">Order Type</span>
        </div>
        <div class="checkout-step active">
          <span>2</span>
          <span class="checkout-step-label">Delivery</span>
        </div>
        <div class="checkout-step">
          <span>3</span>
          <span class="checkout-step-label">Payment</span>
        </div>
      </div>
      <h3 class="font-display text-xl font-bold mb-4">Delivery Address</h3>
      <form id="delivery-form" class="checkout-form">
        <div class="checkout-form-group">
          <label for="delivery-address">Delivery Address</label>
          <input type="text" id="delivery-address" class="checkout-input" placeholder="Enter your delivery address" value="${savedAddress}" required />
        </div>
        <div class="checkout-form-group">
          <label><input type="checkbox" id="save-address" ${savedAddress ? 'checked' : ''}/> Save address for next time</label>
        </div>
        <div class="checkout-btn-group">
          <button type="button" class="checkout-btn checkout-btn-secondary" onclick="checkoutStep = 0; showCheckoutStep();">Back</button>
          <button type="submit" class="checkout-btn checkout-btn-primary">Continue to Payment</button>
        </div>
      </form>
    `;
    initAddressAutocomplete(); // Initialize autocomplete after rendering the input

    document.getElementById('delivery-form').onsubmit = e => {
      e.preventDefault();
      const address = document.getElementById('delivery-address').value;
      const save = document.getElementById('save-address').checked;
      if (save) localStorage.setItem('savedAddress', address);
      else localStorage.removeItem('savedAddress');
      orderData.address = address;
      checkoutStep = 2;
      showCheckoutStep();
    };
  } else if (checkoutStep === 1) {
    // Confirm order step
    checkoutSteps.innerHTML = `
      <div class="checkout-form-group">
        <label>Delivery Address</label>
        <div class="checkout-input" style="background:#f5f6fa;">${orderData.address}</div>
      </div>
      <div class="checkout-btn-group">
        <button class="checkout-btn checkout-btn-primary" id="place-order">Place Order</button>
        <button class="checkout-btn checkout-btn-secondary" id="back">Back</button>
      </div>
    `;
    document.getElementById('place-order').onclick = async () => {
      // ...existing order placement logic...
      checkoutModal.classList.add('hidden');
      document.getElementById('order-confirmation').classList.remove('hidden');
      cart = {};
      localStorage.setItem('cart', '{}');
      renderCart();
    };
    document.getElementById('back').onclick = () => {
      checkoutStep = 0;
      showCheckoutStep();
    };
  }
}
async function placeOrder() {
  const items = Object.entries(cart).map(([id, qty]) => {
    const item = menuItems.find(m => m.id === id) || specials.find(s => s.id === id);
    return { id, name: item.name, price: item.price, qty };
  });
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  await addDoc(collection(db, 'orders'), {
    user: auth.currentUser.uid,
    items,
    subtotal,
    type: orderData.type,
    address: orderData.address || null,
    status: 'pending',
    created: serverTimestamp(),
  });
  cart = {};
  localStorage.setItem('cart', '{}');
  renderCart();
  checkoutModal.classList.add('hidden');
  showOrderConfirmation();
}
const orderConfirmation = document.getElementById('order-confirmation');
const closeConfirmation = document.getElementById('close-confirmation');
function showOrderConfirmation() {
  orderConfirmation.classList.remove('hidden');
}
closeConfirmation.onclick = () => orderConfirmation.classList.add('hidden');
orderConfirmation.onclick = e => { if (e.target === orderConfirmation) orderConfirmation.classList.add('hidden'); };

// --- Init ---
loadSpecials();
loadMenu().then(renderCart);

// No changes needed for navbar layout in JS. Navbar is controlled by CSS and HTML only.