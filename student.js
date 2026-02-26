const express = require('express');
const { run, get, all } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAttendancePercent, getLeavesThisMonth } = require('../ai/leaveAnalyzer');

const router = express.Router();
router.use(authenticate, requireRole('student'));

// GET /api/student/me
router.get('/me', (req, res) => {
    const student = get(`
    SELECT s.id, s.full_name, s.roll_number, s.branch, s.semester,
           s.user_id, s.mentor_id, s.parent_name,
           m.full_name as mentor_name
    FROM students s
    LEFT JOIN mentors m ON s.mentor_id = m.id
    WHERE s.user_id = ?`, [req.user.id]);

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const attendance = getAttendancePercent(student.id);
    const leavesThisMonth = getLeavesThisMonth(student.id);

    delete student.parent_phone; // Privacy: hidden from student

    res.json({ ...student, attendance_percent: attendance, leaves_this_month: leavesThisMonth });
});

// GET /api/student/leave/history
router.get('/leave/history', (req, res) => {
    const student = get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const leaves = all(
        'SELECT * FROM leave_requests WHERE student_id = ? ORDER BY applied_at DESC',
        [student.id]
    );
    res.json(leaves);
});

// POST /api/student/leave/apply
router.post('/leave/apply', (req, res) => {
    const { from_date, to_date, reason, leave_type } = req.body;
    if (!from_date || !to_date || !reason)
        return res.status(400).json({ error: 'from_date, to_date and reason are required' });

    const student = get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const attendance = getAttendancePercent(student.id);
    if (attendance < 75) {
        return res.status(403).json({
            error: 'ATTENDANCE_LOW',
            message: `Your attendance is ${attendance}%. Please submit a physical letter to your faculty.`,
            attendance_percent: attendance
        });
    }

    const leavesThisMonth = getLeavesThisMonth(student.id);
    if (leavesThisMonth >= 4) {
        return res.status(403).json({
            error: 'LIMIT_EXCEEDED',
            message: 'You have reached the maximum of 4 leave requests this month.',
            leaves_this_month: leavesThisMonth
        });
    }

    if (new Date(from_date) > new Date(to_date))
        return res.status(400).json({ error: 'from_date must be before or equal to to_date' });

    const result = run(
        'INSERT INTO leave_requests (student_id, from_date, to_date, reason, leave_type) VALUES (?, ?, ?, ?, ?)',
        [student.id, from_date, to_date, reason, leave_type || 'personal']
    );

    res.status(201).json({
        message: 'Leave request submitted successfully',
        id: result.lastInsertRowid,
        leaves_remaining: 4 - (leavesThisMonth + 1)
    });
});

module.exports = router;
