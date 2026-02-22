const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  const uri = process.env.MONGODB_URI.replace('/Users?', '/?');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const sourceDb = mongoose.connection.client.db('test');
  const targetDb = mongoose.connection.client.db('Users');

  // First, remove validators on existing target collections
  const targetCollections = await targetDb.listCollections().toArray();
  for (const col of targetCollections) {
    try {
      await targetDb.command({ collMod: col.name, validator: {}, validationLevel: 'off' });
      console.log('Removed validator from ' + col.name);
    } catch (e) {
      // ignore if no validator
    }
  }

  // Mapping: source collection -> target collection
  const collectionMap = {
    'managements': 'Management',
    'events': 'Events',
    'preferences': 'Preferences',
    'registrations': 'Registerations',
    'tasks': 'Tasks',
  };

  for (const [src, tgt] of Object.entries(collectionMap)) {
    const srcCount = await sourceDb.collection(src).countDocuments();
    if (srcCount === 0) {
      console.log(src + ' -> ' + tgt + ': 0 documents (skipping)');
      continue;
    }

    // Check if target collection exists
    const existingCols = await targetDb.listCollections({ name: tgt }).toArray();
    
    let tgtCount = 0;
    if (existingCols.length > 0) {
      tgtCount = await targetDb.collection(tgt).countDocuments();
      if (tgtCount > 0) {
        console.log(src + ' -> ' + tgt + ': target has ' + tgtCount + ' docs, clearing...');
        await targetDb.collection(tgt).deleteMany({});
      }
    } else {
      await targetDb.createCollection(tgt);
    }

    console.log(src + ' (' + srcCount + ' docs) -> ' + tgt + '...');
    const docs = await sourceDb.collection(src).find().toArray();
    
    let inserted = 0;
    for (const doc of docs) {
      try {
        await targetDb.collection(tgt).insertOne(doc);
        inserted++;
      } catch (e) {
        console.log('  Failed doc ' + doc._id + ': ' + e.message);
      }
    }
    console.log('  Migrated ' + inserted + '/' + docs.length + ' documents');
  }

  // Verify
  console.log('\n--- Verification (Users DB) ---');
  for (const tgt of Object.values(collectionMap)) {
    try {
      const count = await targetDb.collection(tgt).countDocuments();
      console.log(tgt + ': ' + count + ' documents');
    } catch (e) {
      console.log(tgt + ': not found');
    }
  }

  await mongoose.disconnect();
  console.log('\nMigration complete!');
}

migrate().catch(e => console.error('Migration error:', e));
