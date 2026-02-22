require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Management = require('../models/Management');

async function resetAdmin() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing admin
        const deleteResult = await Management.deleteMany({ role: 'admin' });
        console.log(`Deleted ${deleteResult.deletedCount} admin account(s)`);

        // Create new admin with lowercase email
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const admin = new Management({
            role: 'admin',
            email: 'admin@felicity.com',
            password: hashedPassword,
            adminName: 'Super Admin',
            privileges: 'full'
        });

        await admin.save();
        console.log('✅ Admin account created successfully');
        console.log('Email: admin@felicity.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetAdmin();
