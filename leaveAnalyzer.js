const { get, all } = require('../db');

function getAttendancePercent(studentId) {
    const rows = all('SELECT status FROM attendance WHERE student_id = ?', [studentId]);
    if (rows.length === 0) return 100;
    const present = rows.filter(r => r.status === 'present' || r.status === 'leave').length;
    return Math.round((present / rows.length) * 100);
}

function getLeavesLast60Days(studentId) {
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceStr = since.toISOString().slice(0, 10);
    return all(
        `SELECT * FROM leave_requests WHERE student_id = ? AND from_date >= ? AND status = 'approved'`,
        [studentId, sinceStr]
    );
}

function getLeavesThisMonth(studentId) {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const row = get(
        `SELECT COUNT(*) as cnt FROM leave_requests
     WHERE student_id = ? AND substr(from_date,1,7) = ?
     AND status IN ('approved','pending')`,
        [studentId, monthStr]
    );
    return row ? row.cnt : 0;
}

function computeRiskScore(attendance, leavesLast60) {
    let score = 0;
    if (attendance < 60) score += 50;
    else if (attendance < 75) score += 35;
    else if (attendance < 85) score += 15;
    score += Math.min(leavesLast60 * 7, 40);
    return Math.min(score, 100);
}

function getRiskLabel(score) {
    if (score >= 70) return 'Critical';
    if (score >= 40) return 'At Risk';
    if (score >= 20) return 'Monitor';
    return 'Safe';
}

function analyzeAll() {
    const students = all('SELECT id, full_name, roll_number, branch, semester FROM students');

    const results = students.map(s => {
        const attendance = getAttendancePercent(s.id);
        const leavesLast60 = getLeavesLast60Days(s.id);
        const leavesThisMonth = getLeavesThisMonth(s.id);
        const riskScore = computeRiskScore(attendance, leavesLast60.length);
        const riskLabel = getRiskLabel(riskScore);

        return {
            student_id: s.id,
            full_name: s.full_name,
            roll_number: s.roll_number,
            branch: s.branch,
            semester: s.semester,
            attendance_percent: attendance,
            leaves_last_60_days: leavesLast60.length,
            leaves_this_month: leavesThisMonth,
            risk_score: riskScore,
            risk_label: riskLabel,
            prediction: riskScore >= 40
                ? 'Frequent absences detected — counselling recommended.'
                : 'Attendance and leave pattern within acceptable range.'
        };
    });

    results.sort((a, b) => b.risk_score - a.risk_score);

    return {
        analyzed_at: new Date().toISOString(),
        total_students: results.length,
        critical: results.filter(r => r.risk_label === 'Critical').length,
        at_risk: results.filter(r => r.risk_label === 'At Risk').length,
        monitor: results.filter(r => r.risk_label === 'Monitor').length,
        safe: results.filter(r => r.risk_label === 'Safe').length,
        students: results
    };
}

module.exports = { analyzeAll, getAttendancePercent, getLeavesThisMonth };
