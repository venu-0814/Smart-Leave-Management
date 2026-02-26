const express = require('express');
const { get } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { analyzeAll } = require('../ai/leaveAnalyzer');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// GET /api/admin/overview
router.get('/overview', (req, res) => {
    const totalStudents = get('SELECT COUNT(*) as n FROM students').n;
    const totalMentors = get('SELECT COUNT(*) as n FROM mentors').n;
    const pendingLeaves = get("SELECT COUNT(*) as n FROM leave_requests WHERE status = 'pending'").n;
    const approvedLeaves = get("SELECT COUNT(*) as n FROM leave_requests WHERE status = 'approved'").n;
    const openAlerts = get('SELECT COUNT(*) as n FROM absence_alerts WHERE resolved = 0').n;

    res.json({ totalStudents, totalMentors, pendingLeaves, approvedLeaves, openAlerts });
});

// GET /api/admin/ai/patterns
router.get('/ai/patterns', (req, res) => {
    try {
        res.json(analyzeAll());
    } catch (e) {
        res.status(500).json({ error: 'Analysis failed', detail: e.message });
    }
});

module.exports = router;
