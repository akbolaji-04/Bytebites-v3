# Epicurean Eats – Restaurant Ordering Site

A modern, responsive restaurant ordering site using **HTML**, **Tailwind CSS**, and **plain JavaScript** with real data from Firebase Firestore.

---

## 🚀 Quick Start

### 1. Install Tailwind & Build Tools

```sh
npm install tailwindcss postcss-cli autoprefixer
```

### 2. Build Tailwind CSS

```sh
npx tailwindcss -i ./src/styles.css -o ./src/styles.css --minify
```

### 3. Add Your Firebase Config

Edit `src/firebase-config.js` and replace the config object with your Firebase project credentials.

### 4. Serve Locally

Use any static server, e.g. [live-server](https://www.npmjs.com/package/live-server):

```sh
npx live-server src
```

---

## 🗂️ Project Structure

- `tailwind.config.js` – Tailwind config (dark mode, custom colors, fonts)
- `postcss.config.js` – Tailwind + Autoprefixer
- `src/firebase-config.js` – Firebase app & Firestore setup
- `src/index.html` – Main site (auth, carousel, menu, cart, checkout)
- `src/styles.css` – Tailwind + custom styles
- `src/main.js` – All interactivity, Firestore queries, cart, checkout
- `README.md` – This file

---

## 🛠️ Firestore Collections

- `chefSpecials` – Carousel specials (`name`, `description`, `price`, `imageURL`)
- `menuItems` – Menu grid (`name`, `description`, `price`, `imageURL`)
- `orders` – Orders placed by users

---

## ✨ Features

- Email/password & Google sign-in
- Chef's Specials carousel
- Responsive menu grid
- Slide-out cart with fly-to-cart animation
- Multi-step checkout (delivery/pickup, address, payment)
- Orders saved to Firestore
- Dark mode toggle
- Polished, modern UI

---

## 📦 Deploy

Host on Firebase Hosting or any static host.  
**No build step needed** except Tailwind CSS.

--- 