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
        <hr class="carousel-divider" />
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
  menuGrid.innerHTML = menuItems.map(item => {
    // Default qty
    let qty = Number(cart[item.id]);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;

    // New HTML Structure for List View
    return `
      <div class="menu-item-row">
        <img src="${item.imageURL || 'https://via.placeholder.com/150'}" 
             alt="${item.name}" 
             class="menu-thumb" 
             onerror="this.onerror=null;this.src='https://via.placeholder.com/150?text=No+Image';"/>
        
        <div class="menu-details">
          <div class="menu-header">
            <h4 class="menu-title">${item.name}</h4>
            <div class="menu-spacer"></div>
            <span class="menu-price">₦${Number(item.price).toLocaleString()}</span>
          </div>
          
          <p class="menu-desc">${item.description}</p>
          
          <div class="menu-actions">
            <div class="qty-selector">
              <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
              <span class="qty-val" id="qty-value-${item.id}">${qty}</span>
              <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <button data-id="${item.id}" class="add-cart-btn btn-add">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach event listeners (same as before)
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.onclick = e => {
      const id = btn.dataset.id;
      let val = Number(document.getElementById(`qty-value-${id}`).textContent);
      val += parseInt(btn.dataset.delta);
      if (val < 1) val = 1;
      document.getElementById(`qty-value-${id}`).textContent = val;
    };
  });

  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.onclick = e => {
      const id = btn.dataset.id;
      let qty = Number(document.getElementById(`qty-value-${id}`).textContent);
      addToCart(id, e, qty);
    };
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

// --- Sanitize cart values to always be positive integers ---
function sanitizeCart() {
  let changed = false;
  for (const id in cart) {
    let qty = parseInt(cart[id]);
    if (!Number.isFinite(qty) || qty < 1) {
      qty = 1;
      changed = true;
    }
    cart[id] = qty;
  }
  if (changed) localStorage.setItem('cart', JSON.stringify(cart));
}

sanitizeCart();

function openCart() { cartDrawer.style.transform = 'translateX(0)'; }
function closeCartDrawer() { cartDrawer.style.transform = 'translateX(100%)'; }
cartBtn.onclick = openCart;
closeCart.onclick = closeCartDrawer;
cartDrawer.onclick = e => { if (e.target === cartDrawer) closeCartDrawer(); };

function addToCart(id, e, qty = 1) {
  qty = parseInt(qty);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  cart[id] = (parseInt(cart[id]) || 0) + qty;
  sanitizeCart();
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
  qty = parseInt(qty);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  cart[id] = qty;
  sanitizeCart();
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}
function renderCart() {
  sanitizeCart();
  let items = Object.entries(cart).map(([id, qty]) => {
    qty = parseInt(qty);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    // Ensure id is always a string for lookup
    const item = menuItems.find(m => String(m.id) === String(id)) || specials.find(s => String(s.id) === String(id));
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
            <span class="cart-item-price">₦${(Number(item.price) * qty).toLocaleString()}</span>
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
    qty = parseInt(qty);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    let item = menuItems.find(m => String(m.id) === String(id)) || specials.find(s => String(s.id) === String(id));
    return item ? sum + Number(item.price) * qty : sum;
  }, 0);
  cartSubtotal.textContent = `₦${subtotal.toLocaleString()}`;
  let count = Object.values(cart).reduce((a, b) => a + (Number.isFinite(parseInt(b)) && parseInt(b) > 0 ? parseInt(b) : 0), 0);
  cartCount.textContent = count;
  cartCount.classList.toggle('hidden', count === 0);

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.onclick = () => {
      let id = btn.dataset.id;
      let delta = parseInt(btn.dataset.delta);
      let qty = parseInt(cart[id]) + delta;
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      updateCartQty(id, qty);
    };
  });
  document.querySelectorAll('.remove-cart').forEach(btn => {
    btn.onclick = () => removeFromCart(btn.dataset.id);
  });
}

// --- Checkout Modal ---
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');
const checkoutStepsContainer = document.getElementById('checkout-steps');
const stepDeliveryAddress = document.getElementById('step-delivery-address');
const stepPaymentMethod = document.getElementById('step-payment-method');
const stepOrderSummary = document.getElementById('step-order-summary');
const nextToPaymentBtn = document.getElementById('next-to-payment');
const prevToAddressBtn = document.getElementById('prev-to-address');
const nextToSummaryBtn = document.getElementById('next-to-summary');
const placeOrderBtn = document.getElementById('place-order-btn');
const deliveryAddressInput = document.getElementById('delivery-address-input');
const addressSuggestionsDiv = document.getElementById('address-suggestions');
const summaryItemCount = document.getElementById('summary-item-count');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryDeliveryFee = document.getElementById('summary-delivery-fee');
const summaryServiceFee = document.getElementById('summary-service-fee');
const summaryTotal = document.getElementById('summary-total');
const checkoutItemsDiv = document.getElementById('checkout-items');

const checkoutPaymentMethodDisplay = document.getElementById('checkout-payment-method-display');
const checkoutPromoCode = document.getElementById('checkout-promo-code');
const summaryDeliveryAddress = document.getElementById('summary-delivery-address');
const checkoutChangeAddress = document.getElementById('checkout-change-address');
const checkoutAddDeliveryInstructionsBtn = document.getElementById('checkout-add-delivery-instructions-btn');
const deliveryInstructionsTextarea = document.getElementById('delivery-instructions');
const checkoutAddVendorInstructionsBtn = document.getElementById('checkout-add-vendor-instructions-btn');
const vendorInstructionsTextarea = document.getElementById('vendor-instructions');
const clearOrdersBtn = document.getElementById('clear-orders-btn');
const saveForLaterBtn = document.getElementById('save-for-later-btn');

let currentCheckoutStep = 0;
const steps = [stepDeliveryAddress, stepPaymentMethod, stepOrderSummary];
let selectedAddress = null;

function showCheckoutModal() {
  checkoutModal.classList.remove('hidden');
  currentCheckoutStep = 0; // Always start at the first step
  showCheckoutStep(currentCheckoutStep);
  initAddressAutocomplete();
  populateOrderSummary();
}

function hideCheckoutModal() {
  checkoutModal.classList.add('hidden');
}

function showCheckoutStep(stepIndex) {
  steps.forEach((step, index) => {
    if (index === stepIndex) {
      step.classList.remove('hidden');
    } else {
      step.classList.add('hidden');
    }
  });
  currentCheckoutStep = stepIndex;
  if (currentCheckoutStep === 2) { // Order Summary step
    populateOrderSummary();
    updateSummaryDetails();
  }
}

// Event Listeners for Checkout Modal
checkoutBtn.onclick = showCheckoutModal;
closeCheckout.onclick = hideCheckoutModal;
checkoutModal.onclick = e => { if (e.target === checkoutModal) hideCheckoutModal(); };

nextToPaymentBtn.onclick = () => {
  if (!selectedAddress || deliveryAddressInput.value.trim() === '') {
    alert('Please enter and select a valid delivery address.');
    return;
  }
  showCheckoutStep(1); // Go to Payment Method
};
prevToAddressBtn.onclick = () => { showCheckoutStep(0); }; // Go back to Delivery Address
nextToSummaryBtn.onclick = () => { showCheckoutStep(2); populateOrderSummary(); }; // Go to Order Summary and update it

placeOrderBtn.onclick = async () => {
  if (!auth.currentUser) {
    alert('Please sign in to place an order.');
    showAuthModal(true);
    return;
  }

  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty. Please add items before placing an order.');
    return;
  }

  const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
  const deliveryInstructions = deliveryInstructionsTextarea.value.trim();
  const vendorInstructions = vendorInstructionsTextarea.value.trim();

  const itemsForOrder = Object.entries(cart).map(([id, qty]) => {
    const item = menuItems.find(m => m.id === id) || specials.find(s => s.id === id);
    return { id, name: item.name, price: item.price, qty };
  });

  const subtotal = itemsForOrder.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = 800; // Hardcoded for now
  const serviceFee = 455; // Hardcoded for now
  const total = subtotal + deliveryFee + serviceFee;

  try {
    await addDoc(collection(db, 'orders'), {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      items: itemsForOrder,
      deliveryAddress: selectedAddress,
      paymentMethod: paymentMethod,
      deliveryInstructions: deliveryInstructions || null,
      vendorInstructions: vendorInstructions || null,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      serviceFee: serviceFee,
      total: total,
      status: 'pending', // e.g., 'pending', 'confirmed', 'delivered', 'cancelled'
      timestamp: serverTimestamp(),
    });

    alert('Order Placed Successfully!');
    cart = {}; // Clear cart
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    hideCheckoutModal();
    showOrderConfirmation();
  } catch (error) {
    console.error('Error placing order:', error);
    alert('Failed to place order. Please try again.');
  }
};

// --- Address Autocomplete (Google Maps Places API) ---
let autocomplete;

function initAddressAutocomplete() {
  if (!deliveryAddressInput) return; // Ensure element exists

  autocomplete = new google.maps.places.Autocomplete(deliveryAddressInput, {
    types: ['address'],
    componentRestrictions: {'country': ['ng']} // Restrict to Nigeria
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      // User entered the name of a Place that was not suggested and
      // pressed the Enter key, or the Place Details request failed.
      alert("No details available for input: '" + place.name + "'");
      return;
    }
    selectedAddress = place.formatted_address;
    deliveryAddressInput.value = selectedAddress;
    addressSuggestionsDiv.innerHTML = ''; // Clear suggestions after selection
  });

  // Handle custom suggestions display for a better location pickout
  deliveryAddressInput.addEventListener('input', async () => {
    const query = deliveryAddressInput.value;
    if (query.length < 3) {
      addressSuggestionsDiv.innerHTML = '';
      return;
    }

    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: query, componentRestrictions: {'country': ['ng']} }, (predictions, status) => {
      addressSuggestionsDiv.innerHTML = '';
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        predictions.forEach(prediction => {
          const suggestionItem = document.createElement('div');
          suggestionItem.classList.add('address-suggestion-item');
          suggestionItem.textContent = prediction.description;
          suggestionItem.onclick = () => {
            deliveryAddressInput.value = prediction.description;
            selectedAddress = prediction.description;
            addressSuggestionsDiv.innerHTML = ''; // Clear suggestions
            // Optionally, you might want to fetch place details here for more info
          };
          addressSuggestionsDiv.appendChild(suggestionItem);
        });
      }
    });
  });
}

// --- Populate Order Summary ---
function populateOrderSummary() {
  let itemCount = 0;
  let subtotal = 0;

  checkoutItemsDiv.innerHTML = ''; // Clear previous items

  Object.entries(cart).forEach(([id, qty]) => {
    const item = menuItems.find(m => m.id === id) || specials.find(s => s.id === id);
    if (item) {
      itemCount += qty;
      subtotal += item.price * qty;
      const itemElement = document.createElement('div');
      itemElement.classList.add('cart-item-row'); // Reuse cart-item-row for consistent styling
      itemElement.innerHTML = `
        <img src="${item.imageURL || 'https://via.placeholder.com/56?text=No+Image'}" class="cart-img"/>
        <div class="cart-item-details">
          <h5>${item.name}</h5>
          <p>Quantity: ${qty}</p>
        </div>
        <span class="cart-item-price">₦${(item.price * qty).toLocaleString()}</span>
      `;
      checkoutItemsDiv.appendChild(itemElement);
    }
  });

  const deliveryFee = 800; // Example delivery fee
  const serviceFee = 455; // Example service fee
  const total = subtotal + deliveryFee + serviceFee;

  summaryItemCount.textContent = itemCount;
  summarySubtotal.textContent = `₦${subtotal.toLocaleString()}`;
  summaryDeliveryFee.textContent = `₦${deliveryFee.toLocaleString()}`;
  summaryServiceFee.textContent = `₦${serviceFee.toLocaleString()}`;
  summaryTotal.textContent = `₦${total.toLocaleString()}`;
}

// --- Update Summary Details (for Step 3) ---
function updateSummaryDetails() {
  // Update payment method display
  const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
  checkoutPaymentMethodDisplay.textContent = selectedPaymentMethod === 'wallet' ? 'Wallet (₦0.00)' : 'Pay online';

  // Update delivery address display
  summaryDeliveryAddress.textContent = selectedAddress || 'Select Address';

  // Toggle delivery instructions textarea
  checkoutAddDeliveryInstructionsBtn.onclick = () => {
    deliveryInstructionsTextarea.classList.toggle('hidden');
    checkoutAddDeliveryInstructionsBtn.textContent = deliveryInstructionsTextarea.classList.contains('hidden') ? 'Add' : 'Hide';
  };

  // Toggle vendor instructions textarea
  checkoutAddVendorInstructionsBtn.onclick = () => {
    vendorInstructionsTextarea.classList.toggle('hidden');
    checkoutAddVendorInstructionsBtn.textContent = vendorInstructionsTextarea.classList.contains('hidden') ? 'Add' : 'Hide';
  };

  // Handle change address link
  checkoutChangeAddress.onclick = () => {
    showCheckoutStep(0); // Go back to delivery address step
  };

  // Handle promo code click (placeholder)
  checkoutPromoCode.onclick = () => {
    alert('Promo code functionality coming soon!');
  };

  // Handle Clear orders button
  clearOrdersBtn.onclick = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      cart = {};
      localStorage.setItem('cart', JSON.stringify(cart));
      renderCart();
      hideCheckoutModal();
      alert('Cart cleared!');
    }
  };

  // Handle Save for later button (placeholder)
  saveForLaterBtn.onclick = () => {
    alert('Save for later functionality coming soon!');
  };
}

// --- Order Confirmation ---
const orderConfirmationModal = document.getElementById('order-confirmation');
const closeConfirmationBtn = document.getElementById('close-confirmation');

function showOrderConfirmation() {
  orderConfirmationModal.classList.remove('hidden');
}

closeConfirmationBtn.onclick = () => {
  orderConfirmationModal.classList.add('hidden');
};

// Initial loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadSpecials();
    loadMenu();
    renderCart();
    setDarkMode(localStorage.getItem('theme') === 'dark');
  });
} else {
  loadSpecials();
  loadMenu();
  renderCart();
  setDarkMode(localStorage.getItem('theme') === 'dark');
}
