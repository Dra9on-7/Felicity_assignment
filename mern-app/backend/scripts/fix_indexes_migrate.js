const mongoose = require('mongoose');
require('dotenv').config();

async function fixAndMigrate() {
  const uri = process.env.MONGODB_URI.replace('/Users?', '/?');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const targetDb = mongoose.connection.client.db('Users');
  const sourceDb = mongoose.connection.client.db('test');
  
  // List and drop bad indexes on Management
  const indexes = await targetDb.collection('Management').indexes();
  console.log('Current indexes on Management:');
  for (const idx of indexes) {
    console.log('  ' + idx.name + ':', JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
  }
  
  // Drop the bad 'emali_1' index
  for (const idx of indexes) {
    if (idx.name !== '_id_' && idx.name.includes('emali')) {
      console.log('\nDropping bad index: ' + idx.name);
      await targetDb.collection('Management').dropIndex(idx.name);
    }
  }
  
  // Clear and re-migrate Management
  await targetDb.collection('Management').deleteMany({});
  const docs = await sourceDb.collection('managements').find().toArray();
  console.log('\nRe-migrating ' + docs.length + ' Management documents...');
  
  let inserted = 0;
  for (const doc of docs) {
    try {
      await targetDb.collection('Management').insertOne(doc);
      inserted++;
    } catch (e) {
      console.log('  Failed doc ' + doc._id + ' (' + (doc.email || doc.clubName) + '): ' + e.message);
    }
  }
  console.log('Migrated ' + inserted + '/' + docs.length + ' documents');

  // Verify
  console.log('\n--- Final Verification (Users DB) ---');
  const collections = ['Management', 'Events', 'Preferences', 'Registerations', 'Tasks'];
  for (const col of collections) {
    try {
      const count = await targetDb.collection(col).countDocuments();
      console.log(col + ': ' + count + ' documents');
    } catch (e) {
      console.log(col + ': not found');
    }
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixAndMigrate().catch(e => console.error('Error:', e));
