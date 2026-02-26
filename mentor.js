const express = require('express');
const { run, get, all } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAttendancePercent, getLeavesThisMonth } = require('../ai/leaveAnalyzer');

const router = express.Router();
router.use(authenticate, requireRole('mentor'));

// GET /api/mentor/students
router.get('/students', (req, res) => {
  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const students = all(
    'SELECT id, full_name, roll_number, branch, semester FROM students WHERE mentor_id = ?',
    [mentor.id]
  );
  const enriched = students.map(s => ({
    ...s,
    attendance_percent: getAttendancePercent(s.id),
    leaves_this_month: getLeavesThisMonth(s.id)
  }));
  res.json(enriched);
});

// GET /api/mentor/leaves/pending
router.get('/leaves/pending', (req, res) => {
  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const leaves = all(`
    SELECT lr.*, s.full_name, s.roll_number, s.branch, s.semester
    FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    WHERE s.mentor_id = ? AND lr.status = 'pending'
    ORDER BY lr.applied_at DESC`, [mentor.id]);
  res.json(leaves);
});

// GET /api/mentor/leaves/all
router.get('/leaves/all', (req, res) => {
  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const leaves = all(`
    SELECT lr.*, s.full_name, s.roll_number, s.branch
    FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    WHERE s.mentor_id = ?
    ORDER BY lr.applied_at DESC`, [mentor.id]);
  res.json(leaves);
});

// PUT /api/mentor/leaves/:id
router.put('/leaves/:id', (req, res) => {
  const { status, mentor_note } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be approved or rejected' });

  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const leave = get(`
    SELECT lr.* FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    WHERE lr.id = ? AND s.mentor_id = ?`, [req.params.id, mentor.id]);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  run(`UPDATE leave_requests SET status = ?, mentor_note = ?,
       reviewed_at = datetime('now') WHERE id = ?`,
    [status, mentor_note || null, req.params.id]);

  res.json({ message: `Leave ${status} successfully` });
});

// GET /api/mentor/student/:id/contact
router.get('/student/:id/contact', (req, res) => {
  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const student = get(
    'SELECT full_name, parent_name, parent_phone FROM students WHERE id = ? AND mentor_id = ?',
    [req.params.id, mentor.id]
  );
  if (!student) return res.status(404).json({ error: 'Student not found or not your mentee' });
  res.json(student);
});

// GET /api/mentor/alerts
router.get('/alerts', (req, res) => {
  const mentor = get('SELECT id FROM mentors WHERE user_id = ?', [req.user.id]);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const alerts = all(`
    SELECT aa.*, s.full_name, s.roll_number
    FROM absence_alerts aa
    JOIN students s ON aa.student_id = s.id
    WHERE s.mentor_id = ? AND aa.resolved = 0
    ORDER BY aa.created_at DESC`, [mentor.id]);
  res.json(alerts);
});

// PUT /api/mentor/alerts/:id/resolve
router.put('/alerts/:id/resolve', (req, res) => {
  run('UPDATE absence_alerts SET resolved = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Alert resolved' });
});

module.exports = router;
