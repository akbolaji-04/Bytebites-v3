import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- Auth Check ---
// In a real app, you would check if user.email === "admin@bytebites.com"
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'index.html'; // Kick out non-logged users
    } else {
        document.getElementById('admin-email').textContent = user.email;
    }
});

document.getElementById('logout-btn').onclick = () => {
    signOut(auth).then(() => window.location.href = 'index.html');
};

// --- 1. Real-Time Order Listener (Kitchen Display) ---
const ordersGrid = document.getElementById('orders-grid');

// Query orders sorted by newest first
const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    ordersGrid.innerHTML = ""; // Clear list
    
    if(snapshot.empty) {
        ordersGrid.innerHTML = "<p>No active orders.</p>";
        return;
    }

    snapshot.forEach(docSnap => {
        const order = docSnap.data();
        const orderId = docSnap.id;
        const status = order.status || 'pending'; // Default to pending
        const time = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';

        // Styling based on status
        let statusClass = `status-${status.toLowerCase()}`;
        
        // Build the HTML for one Order Card
        const cardHTML = `
            <div class="order-card" style="${status === 'delivered' ? 'opacity:0.6;' : ''}">
                <div class="order-header">
                    <span class="order-id">#${orderId.slice(-6).toUpperCase()}</span>
                    <span class="order-time">${time}</span>
                </div>
                
                <div style="margin-bottom:0.8rem;">
                    <span class="status-badge ${statusClass}">${status}</span>
                    <div style="float:right; font-weight:bold;">₦${Number(order.total || 0).toLocaleString()}</div>
                </div>

                <ul class="order-items">
                    ${order.items.map(item => `
                        <li class="order-item">
                            <span><span class="item-qty">${item.qty}x</span> ${item.name}</span>
                        </li>
                    `).join('')}
                </ul>

                ${status !== 'delivered' ? `
                <div class="status-controls">
                    <button class="status-btn btn-cook" onclick="updateStatus('${orderId}', 'cooking')">Cooking</button>
                    <button class="status-btn btn-ready" onclick="updateStatus('${orderId}', 'ready')">Ready</button>
                    <button class="status-btn btn-deliver" onclick="updateStatus('${orderId}', 'delivered')">Done</button>
                </div>
                ` : '<small style="color:green;">Order Completed</small>'}
            </div>
        `;
        ordersGrid.innerHTML += cardHTML;
    });
});

// Expose status updater to window so HTML buttons can click it
window.updateStatus = async (id, status) => {
    try {
        const orderRef = doc(db, "orders", id);
        await updateDoc(orderRef, { status: status });
        // The onSnapshot listener will automatically refresh the UI!
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
};

// --- 2. Add Product Logic ---
const productForm = document.getElementById('add-product-form');

productForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('p-name').value;
    const desc = document.getElementById('p-desc').value;
    const price = parseFloat(document.getElementById('p-price').value);
    const image = document.getElementById('p-image').value;
    const collectionName = document.getElementById('p-collection').value; // 'menuItems' or 'chefSpecials'
    const btn = productForm.querySelector('button');

    try {
        btn.textContent = "Publishing...";
        btn.disabled = true;

        await addDoc(collection(db, collectionName), {
            name: name,
            description: desc,
            price: price,
            imageURL: image,
            createdAt: serverTimestamp()
        });

        alert("Product Added Successfully!");
        productForm.reset(); // Clear form
        
        // If you are on the main page in another tab, it will update instantly!
    } catch (err) {
        alert("Error adding product: " + err.message);
    } finally {
        btn.textContent = "Publish Item";
        btn.disabled = false;
    }
};