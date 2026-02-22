const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const usersDb = mongoose.connection.client.db('Users');
  
  // Check each collection
  const collections = ['Preferences', 'Management', 'Events', 'Registerations'];
  for (const col of collections) {
    const count = await usersDb.collection(col).countDocuments();
    console.log(col + ': ' + count + ' documents');
    if (count > 0 && count <= 5) {
      const docs = await usersDb.collection(col).find().limit(3).toArray();
      console.log('  Sample:', JSON.stringify(docs.map(d => {
        const { password, ...rest } = d;
        return rest;
      }), null, 2));
    }
  }
  
  // Also check test db counts
  console.log('\n--- test DB ---');
  const testDb = mongoose.connection.client.db('test');
  const testCols = ['preferences', 'managements', 'events', 'registrations', 'tasks'];
  for (const col of testCols) {
    const count = await testDb.collection(col).countDocuments();
    console.log(col + ': ' + count + ' documents');
  }
  
  await mongoose.disconnect();
}
check().catch(e => console.error(e));
