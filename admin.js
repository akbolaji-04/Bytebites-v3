import { db, auth } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("admin-email").textContent = user.email;
  } else {
    document.body.innerHTML = `<div style="text-align:center; margin-top:50px;"><h1>Access Denied</h1><a href="index.html">Login</a></div>`;
  }
});

document.getElementById("logout-btn").onclick = () =>
  signOut(auth).then(() => (window.location.href = "index.html"));

// --- 1. Live Orders ---
const ordersGrid = document.getElementById("orders-grid");
onSnapshot(
  query(collection(db, "orders"), orderBy("createdAt", "desc")),
  (snapshot) => {
    ordersGrid.innerHTML = "";
    if (snapshot.empty) {
      ordersGrid.innerHTML = "<p>No active orders.</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      const id = docSnap.id;
      ordersGrid.innerHTML += `
            <div class="order-card" style="${
              order.status === "delivered" ? "opacity:0.6" : ""
            }">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <b>#${id.slice(-4).toUpperCase()}</b> 
                    <span class="status-badge status-${order.status}">${
        order.status
      }</span>
                </div>
                <div style="margin-bottom:1rem; color:#555;">
                    ${order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                </div>
                
                ${
                  order.status !== "delivered"
                    ? `
                <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button class="btn-status btn-cook" onclick="updateOrderStatus('${id}', 'cooking')">
                        <i class="ri-fire-line"></i> Cook
                    </button>
                    <button class="btn-status btn-ready" onclick="updateOrderStatus('${id}', 'ready')">
                        <i class="ri-check-line"></i> Ready
                    </button>
                    <button class="btn-status btn-done" onclick="updateOrderStatus('${id}', 'delivered')">
                        <i class="ri-truck-line"></i> Done
                    </button>
                </div>`
                    : '<div style="font-size:0.85rem; color:green; font-weight:600;"><i class="ri-checkbox-circle-line"></i> Order Completed</div>'
                }
            </div>`;
    });
  }
);

window.updateOrderStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, "orders", id), { status });
  } catch (e) {
    alert(e.message);
  }
};

// --- 2. Live Menu Management (Edit/Delete) ---
const menuList = document.getElementById("menu-list");

function loadCollection(colName) {
  onSnapshot(collection(db, colName), (snap) => {
    // We append to the list, so we might need to clear it first if we want a pure list,
    // but since we have 2 collections (menuItems + chefSpecials), handling 2 listeners is tricky.
    // Simplified: Just re-render everything when data changes.
    renderAllMenuItems();
  });
}

// We will store items in memory to render them combined
let allItems = [];

function setupMenuListeners() {
  onSnapshot(collection(db, "menuItems"), (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "menuItems",
    }));
    updateLocalItems("menuItems", items);
  });
  onSnapshot(collection(db, "chefSpecials"), (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "chefSpecials",
    }));
    updateLocalItems("chefSpecials", items);
  });
}

const itemsMap = { menuItems: [], chefSpecials: [] };

function updateLocalItems(col, items) {
  itemsMap[col] = items;
  renderAllMenuItems();
}

function renderAllMenuItems() {
  menuList.innerHTML = "";
  const combined = [...itemsMap.menuItems, ...itemsMap.chefSpecials];

  if (combined.length === 0) {
    menuList.innerHTML = "<p>No items found.</p>";
    return;
  }

  combined.forEach((item) => {
    menuList.innerHTML += `
            <div class="menu-item-row">
                <img src="${
                  item.imageURL
                }" class="menu-item-img" onerror="this.src='https://via.placeholder.com/50'">
                <div class="menu-item-info">
                    <div style="font-weight:600;">${item.name}</div>
                    <div style="font-size:0.85rem; color:#666;">₦${Number(
                      item.price
                    ).toLocaleString()} • ${
      item.collection === "chefSpecials" ? "🌟 Special" : "Menu"
    }</div>
                </div>
                <div class="menu-item-actions">
                    <button class="btn-icon-small btn-edit" onclick="editItem('${
                      item.id
                    }', '${
      item.collection
    }')"><i class="ri-pencil-line"></i></button>
                    <button class="btn-icon-small btn-delete" onclick="deleteItem('${
                      item.id
                    }', '${
      item.collection
    }')"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `;
  });
}

// --- 3. Form Logic (Add/Update) ---
const form = document.getElementById("product-form");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const editIdInput = document.getElementById("edit-id");

// Global Edit/Delete Functions
window.deleteItem = async (id, col) => {
  if (confirm("Are you sure you want to delete this item?")) {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (e) {
      alert("Error deleting: " + e.message);
    }
  }
};

window.editItem = (id, col) => {
  // Find item data
  const item = [...itemsMap.menuItems, ...itemsMap.chefSpecials].find(
    (i) => i.id === id
  );
  if (!item) return;

  // Populate Form
  document.getElementById("p-name").value = item.name;
  document.getElementById("p-desc").value = item.description;
  document.getElementById("p-price").value = item.price;
  document.getElementById("p-image").value = item.imageURL;
  document.getElementById("p-collection").value = col;
  document.getElementById("p-category").value = item.category || "all";

  // Switch to Edit Mode
  editIdInput.value = id;
  formTitle.textContent = "Edit Item";
  submitBtn.textContent = "Update Item";
  submitBtn.classList.remove("btn-primary"); // Change color to indicate edit
  submitBtn.style.background = "#2196f3"; // Blue for update
  cancelBtn.style.display = "block";

  // Disable collection change during edit (simplifies logic)
  document.getElementById("p-collection").disabled = true;
};

cancelBtn.onclick = () => {
  form.reset();
  editIdInput.value = "";
  formTitle.textContent = "Add Item";
  submitBtn.textContent = "Publish Item";
  submitBtn.style.background = ""; // Reset color
  submitBtn.classList.add("btn-primary");
  cancelBtn.style.display = "none";
  document.getElementById("p-collection").disabled = false;
};

form.onsubmit = async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const id = editIdInput.value;
  const col = document.getElementById("p-collection").value;

  const data = {
    name: document.getElementById("p-name").value,
    description: document.getElementById("p-desc").value,
    price: parseFloat(document.getElementById("p-price").value),
    imageURL: document.getElementById("p-image").value,
    category: document.getElementById("p-category").value,
    createdAt: serverTimestamp(), // Updates timestamp on edit too
  };

  try {
    if (id) {
      // Update Existing
      await updateDoc(doc(db, col, id), data);
      alert("Item Updated!");
      cancelBtn.click(); // Reset form
    } else {
      // Add New
      await addDoc(collection(db, col), data);
      alert("Item Added!");
      form.reset();
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
};

// Start Listeners
setupMenuListeners();
