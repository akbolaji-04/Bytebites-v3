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

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("admin-email").textContent = user.email;
  } else {
    document.body.innerHTML = `<div style="text-align:center; margin-top:50px;"><h1>Access Denied</h1><a href="index.html">Login</a></div>`;
  }
});

document.getElementById("logout-btn").onclick = () =>
  signOut(auth).then(() => (window.location.href = "index.html"));

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

const menuList = document.getElementById("menu-list");

function loadCollection(colName) {
  onSnapshot(collection(db, colName), (snap) => {

    renderAllMenuItems();
  });
}

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

const form = document.getElementById("product-form");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const editIdInput = document.getElementById("edit-id");

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

  const item = [...itemsMap.menuItems, ...itemsMap.chefSpecials].find(
    (i) => i.id === id
  );
  if (!item) return;

  document.getElementById("p-name").value = item.name;
  document.getElementById("p-desc").value = item.description;
  document.getElementById("p-price").value = item.price;
  document.getElementById("p-image").value = item.imageURL;
  document.getElementById("p-collection").value = col;
  document.getElementById("p-category").value = item.category || "all";

  editIdInput.value = id;
  formTitle.textContent = "Edit Item";
  submitBtn.textContent = "Update Item";
  submitBtn.classList.remove("btn-primary");
  submitBtn.style.background = "#2196f3";
  cancelBtn.style.display = "block";

  document.getElementById("p-collection").disabled = true;
};

cancelBtn.onclick = () => {
  form.reset();
  editIdInput.value = "";
  formTitle.textContent = "Add Item";
  submitBtn.textContent = "Publish Item";
  submitBtn.style.background = "";
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
    createdAt: serverTimestamp(),
  };

  try {
    if (id) {

      await updateDoc(doc(db, col, id), data);
      alert("Item Updated!");
      cancelBtn.click();
    } else {

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

setupMenuListeners();
