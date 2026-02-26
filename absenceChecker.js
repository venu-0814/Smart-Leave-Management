const cron = require('node-cron');
const { run, get, all } = require('../db');

function runAbsenceCheck() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[AbsenceChecker] Running check for ${today}`);

  const absentToday = all(
    `SELECT student_id FROM attendance WHERE date = ? AND status = 'absent'`,
    [today]
  ).map(r => r.student_id);

  for (const studentId of absentToday) {
    const coveredByLeave = get(`
      SELECT id FROM leave_requests
      WHERE student_id = ? AND status = 'approved'
        AND from_date <= ? AND to_date >= ?`,
      [studentId, today, today]
    );

    if (!coveredByLeave) {
      const existing = get(
        'SELECT id FROM absence_alerts WHERE student_id = ? AND date = ?',
        [studentId, today]
      );
      if (!existing) {
        run('INSERT INTO absence_alerts (student_id, date, type) VALUES (?, ?, ?)',
          [studentId, today, 'uninformed']);
        console.log(`[AbsenceChecker] Alert created for student ${studentId} on ${today}`);
      }
    }
  }
}

function startAbsenceChecker() {
  cron.schedule('0 20 * * *', runAbsenceCheck);
  console.log('[AbsenceChecker] Cron job scheduled — runs daily at 8 PM');
}

module.exports = { startAbsenceChecker, runAbsenceCheck };
