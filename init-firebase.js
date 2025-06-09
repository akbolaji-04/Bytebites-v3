const admin = require('firebase-admin');
const { chefSpecials, menuItems } = require('./chefSpecialsData');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addCollection(collectionName, data) {
  for (const item of data) {
    await db.collection(collectionName).add(item);
    console.log(`Added to ${collectionName}:`, item.name);
  }
}

async function main() {
  await addCollection('chefSpecials', chefSpecials);
  await addCollection('menuItems', menuItems);
  console.log('Firestore initialization complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 