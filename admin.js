import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Auth Check
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'index.html'; 
    } else {
        document.getElementById('admin-email').textContent = user.email;
    }
});

document.getElementById('logout-btn').onclick = () => {
    signOut(auth).then(() => window.location.href = 'index.html');
};

// 1. Order Listener
const ordersGrid = document.getElementById('orders-grid');
const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    ordersGrid.innerHTML = "";
    if(snapshot.empty) {
        ordersGrid.innerHTML = "<p>No active orders.</p>";
        return;
    }

    snapshot.forEach(docSnap => {
        const order = docSnap.data();
        const orderId = docSnap.id;
        const status = order.status || 'pending';
        const time = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Now';
        let statusClass = `status-${status.toLowerCase()}`;

        ordersGrid.innerHTML += `
            <div class="order-card" style="${status === 'delivered' ? 'opacity:0.6;' : ''}">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; border-bottom:1px dashed #eee; padding-bottom:0.5rem;">
                    <span style="font-family:monospace; color:#888;">#${orderId.slice(-4).toUpperCase()}</span>
                    <span style="font-weight:600;">${time}</span>
                </div>
                <div style="margin-bottom:1rem;">
                    <span class="status-badge ${statusClass}">${status}</span>
                    <span style="float:right; font-weight:bold; color:var(--accent);">₦${Number(order.total).toLocaleString()}</span>
                </div>
                <ul style="padding-left:1rem; margin-bottom:1rem; color:#444;">
                    ${order.items.map(i => `<li><b>${i.qty}x</b> ${i.name}</li>`).join('')}
                </ul>
                ${status !== 'delivered' ? `
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="updateStatus('${orderId}', 'cooking')" style="flex:1; padding:0.5rem; border:none; background:#e3f2fd; color:#2196f3; border-radius:8px; cursor:pointer; font-weight:600;">Cook</button>
                    <button onclick="updateStatus('${orderId}', 'ready')" style="flex:1; padding:0.5rem; border:none; background:#e8f5e9; color:#4caf50; border-radius:8px; cursor:pointer; font-weight:600;">Ready</button>
                    <button onclick="updateStatus('${orderId}', 'delivered')" style="flex:1; padding:0.5rem; border:none; background:#eee; color:#333; border-radius:8px; cursor:pointer; font-weight:600;">Done</button>
                </div>` : ''}
            </div>
        `;
    });
});

window.updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, "orders", id), { status }); } 
    catch (e) { alert(e.message); }
};

// 2. Add Product Logic
const productForm = document.getElementById('add-product-form');
productForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = productForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        await addDoc(collection(db, document.getElementById('p-collection').value), {
            name: document.getElementById('p-name').value,
            description: document.getElementById('p-desc').value,
            price: parseFloat(document.getElementById('p-price').value),
            imageURL: document.getElementById('p-image').value,
            category: document.getElementById('p-category').value, // <--- NEW FIELD
            createdAt: serverTimestamp()
        });
        alert("Saved!");
        productForm.reset();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Publish Item";
    }
};