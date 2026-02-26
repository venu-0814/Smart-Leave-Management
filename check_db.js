const { initDB, get } = require('./server/db');

async function checkAdmin() {
    await initDB();
    const admin = get('SELECT * FROM users WHERE username = ?', ['admin']);
    console.log('Admin user in DB:', JSON.stringify(admin, null, 2));
}

checkAdmin().catch(console.error);
