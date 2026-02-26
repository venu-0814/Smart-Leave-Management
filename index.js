require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Bootstrap: init DB first, then load routes and start listening
initDB().then(() => {
    const authRoutes = require('./routes/auth');
    const studentRoutes = require('./routes/student');
    const mentorRoutes = require('./routes/mentor');
    const adminRoutes = require('./routes/admin');
    const { startAbsenceChecker } = require('./jobs/absenceChecker');

    app.use('/api/auth', authRoutes);
    app.use('/api/student', studentRoutes);
    app.use('/api/mentor', mentorRoutes);
    app.use('/api/admin', adminRoutes);

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
        console.log(`\n🎓 SLMS running at http://localhost:${PORT}`);
        console.log(`   Run "node server/seed.js" first to populate the database.\n`);
        startAbsenceChecker();
    });
}).catch(err => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
});
