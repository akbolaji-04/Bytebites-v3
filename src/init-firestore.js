import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Chef's Specials data
const chefSpecials = [
  {
    name: "Truffle Infused Wagyu Burger",
    description: "Premium A5 Wagyu beef patty with black truffle, aged cheddar, caramelized onions, and our signature truffle aioli on a brioche bun.",
    price: 24.99,
    imageURL: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Lobster Mac & Cheese",
    description: "Fresh Maine lobster meat with our three-cheese blend, truffle oil, and crispy breadcrumbs.",
    price: 32.99,
    imageURL: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Saffron Risotto",
    description: "Creamy Arborio rice with saffron, wild mushrooms, and aged parmesan.",
    price: 28.99,
    imageURL: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&auto=format&fit=crop&q=60"
  }
];

// Menu Items data
const menuItems = [
  {
    name: "Classic Caesar Salad",
    description: "Crisp romaine lettuce, parmesan crisps, house-made croutons, and our signature Caesar dressing.",
    price: 12.99,
    imageURL: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon with lemon butter sauce, roasted vegetables, and herb rice.",
    price: 26.99,
    imageURL: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Mushroom Ravioli",
    description: "House-made pasta filled with wild mushrooms, ricotta, and herbs, served in a white wine cream sauce.",
    price: 18.99,
    imageURL: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Beef Tenderloin",
    description: "8oz grass-fed beef tenderloin with red wine reduction, truffle mashed potatoes, and seasonal vegetables.",
    price: 34.99,
    imageURL: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Vegetable Curry",
    description: "Seasonal vegetables in a rich coconut curry sauce, served with basmati rice and naan bread.",
    price: 16.99,
    imageURL: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=60"
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with a molten center, served with vanilla ice cream and fresh berries.",
    price: 9.99,
    imageURL: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=60"
  }
];

// Function to add data to Firestore
async function initializeFirestore() {
  try {
    // Add Chef's Specials
    console.log('Adding Chef\'s Specials...');
    for (const special of chefSpecials) {
      await addDoc(collection(db, 'chefSpecials'), special);
    }
    console.log('Chef\'s Specials added successfully!');

    // Add Menu Items
    console.log('Adding Menu Items...');
    for (const item of menuItems) {
      await addDoc(collection(db, 'menuItems'), item);
    }
    console.log('Menu Items added successfully!');

    console.log('Firestore initialization complete!');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
}

// Run the initialization
initializeFirestore(); 