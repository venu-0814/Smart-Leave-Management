const { initDB, run, get, all, exec } = require('./db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Seeding SLMS database...');
  await initDB();

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ─── Clear existing data ─────────────────────────────────────────────────────
  exec(`DELETE FROM absence_alerts;`);
  exec(`DELETE FROM leave_requests;`);
  exec(`DELETE FROM attendance;`);
  exec(`DELETE FROM students;`);
  exec(`DELETE FROM mentors;`);
  exec(`DELETE FROM users;`);

  // ─── Create users ────────────────────────────────────────────────────────────
  const adminId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash('password123'), 'admin']).lastInsertRowid;
  console.log('✅ Admin user created with username "admin" and role "admin"');
  const m1UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['mentor1', hash('password123'), 'mentor']).lastInsertRowid;
  const m2UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['mentor2', hash('password123'), 'mentor']).lastInsertRowid;
  const s1UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student1', hash('password123'), 'student']).lastInsertRowid;
  const s2UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student2', hash('password123'), 'student']).lastInsertRowid;
  const s3UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student3', hash('password123'), 'student']).lastInsertRowid;
  const s4UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student4', hash('password123'), 'student']).lastInsertRowid;
  const s5UserId = run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student5', hash('password123'), 'student']).lastInsertRowid;

  // ─── Create mentors ──────────────────────────────────────────────────────────
  const mentor1Id = run('INSERT INTO mentors (user_id, full_name, department, email) VALUES (?, ?, ?, ?)',
    [m1UserId, 'Dr. Ramesh Kumar', 'Computer Science', 'ramesh.kumar@college.edu']).lastInsertRowid;
  const mentor2Id = run('INSERT INTO mentors (user_id, full_name, department, email) VALUES (?, ?, ?, ?)',
    [m2UserId, 'Prof. Anitha Sharma', 'Electronics', 'anitha.sharma@college.edu']).lastInsertRowid;

  // ─── Create students ─────────────────────────────────────────────────────────
  const ins = (uid, name, roll, branch, sem, mid, pname, pphone) =>
    run('INSERT INTO students (user_id,full_name,roll_number,branch,semester,mentor_id,parent_name,parent_phone) VALUES (?,?,?,?,?,?,?,?)',
      [uid, name, roll, branch, sem, mid, pname, pphone]).lastInsertRowid;

  const s1Id = ins(s1UserId, 'Arjun Reddy', '22CS001', 'CSE', 4, mentor1Id, 'Suresh Reddy', '+91-9848012345');
  const s2Id = ins(s2UserId, 'Priya Patel', '22CS002', 'CSE', 4, mentor1Id, 'Ramesh Patel', '+91-9848023456');
  const s3Id = ins(s3UserId, 'Kiran Naidu', '22EC001', 'ECE', 4, mentor2Id, 'Venkat Naidu', '+91-9848034567');
  const s4Id = ins(s4UserId, 'Sneha Verma', '22CS003', 'CSE', 4, mentor1Id, 'Raj Verma', '+91-9848045678');
  const s5Id = ins(s5UserId, 'Rahul Banerjee', '22EC002', 'ECE', 4, mentor2Id, 'Gopal Banerjee', '+91-9848056789');

  // ─── Generate attendance records (last 60 days) ───────────────────────────────
  function generateAttendance(studentId, presentRate, days = 60) {
    const today = new Date('2026-02-25');
    for (let i = days; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = d.getDay();
      if (day === 0 || day === 6) continue;
      const status = Math.random() < presentRate ? 'present' : 'absent';
      run('INSERT OR IGNORE INTO attendance (student_id, date, status) VALUES (?, ?, ?)',
        [studentId, d.toISOString().slice(0, 10), status]);
    }
  }

  generateAttendance(s1Id, 0.88);  // Arjun  ~88%
  generateAttendance(s2Id, 0.82);  // Priya  ~82%
  generateAttendance(s3Id, 0.65);  // Kiran  ~65% LOW
  generateAttendance(s4Id, 0.78);  // Sneha  ~78%
  generateAttendance(s5Id, 0.52);  // Rahul  ~52% LOW

  // ─── Leave requests ──────────────────────────────────────────────────────────
  const insl = (sid, from, to, reason, type, status, at) =>
    run('INSERT INTO leave_requests (student_id,from_date,to_date,reason,leave_type,status,applied_at) VALUES (?,?,?,?,?,?,?)',
      [sid, from, to, reason, type, status, at]);

  // Arjun: 2 leaves this month
  insl(s1Id, '2026-02-03', '2026-02-03', 'Medical appointment', 'medical', 'approved', '2026-02-02T09:00:00');
  insl(s1Id, '2026-02-10', '2026-02-11', 'Family function', 'personal', 'approved', '2026-02-08T10:00:00');

  // Priya: 4 leaves this month (at limit)
  insl(s2Id, '2026-02-01', '2026-02-01', 'Fever', 'medical', 'approved', '2026-01-31T18:00:00');
  insl(s2Id, '2026-02-07', '2026-02-07', 'Personal work', 'personal', 'approved', '2026-02-06T14:00:00');
  insl(s2Id, '2026-02-14', '2026-02-14', 'Dental checkup', 'medical', 'approved', '2026-02-13T09:00:00');
  insl(s2Id, '2026-02-20', '2026-02-21', 'Out of town', 'personal', 'approved', '2026-02-19T11:00:00');

  // Sneha: 1 pending leave
  insl(s4Id, '2026-02-26', '2026-02-27', "Sister's wedding", 'personal', 'pending', '2026-02-25T08:00:00');

  // Historical leaves for AI pattern analysis (January)
  insl(s2Id, '2026-01-05', '2026-01-05', 'Headache', 'medical', 'approved', '2026-01-04T09:00:00');
  insl(s2Id, '2026-01-12', '2026-01-13', 'Family trip', 'personal', 'approved', '2026-01-11T09:00:00');
  insl(s2Id, '2026-01-20', '2026-01-20', 'Exam prep', 'personal', 'approved', '2026-01-19T09:00:00');
  insl(s5Id, '2026-01-08', '2026-01-09', 'Sick', 'medical', 'approved', '2026-01-07T09:00:00');
  insl(s5Id, '2026-01-15', '2026-01-16', 'Travel', 'personal', 'approved', '2026-01-14T09:00:00');
  insl(s3Id, '2026-01-10', '2026-01-10', 'Doctor visit', 'medical', 'approved', '2026-01-09T09:00:00');
  insl(s3Id, '2026-01-18', '2026-01-19', 'Personal', 'personal', 'approved', '2026-01-17T09:00:00');

  // ─── Absence alerts ───────────────────────────────────────────────────────────
  run('INSERT INTO absence_alerts (student_id, date, type) VALUES (?, ?, ?)', [s3Id, '2026-02-24', 'uninformed']);
  run('INSERT INTO absence_alerts (student_id, date, type) VALUES (?, ?, ?)', [s5Id, '2026-02-24', 'uninformed']);
  run('INSERT INTO absence_alerts (student_id, date, type) VALUES (?, ?, ?)', [s5Id, '2026-02-25', 'uninformed']);

  console.log('');
  console.log('✅ Seed complete! Login credentials (password: password123)');
  console.log('   admin    → Admin Dashboard');
  console.log('   mentor1  → Dr. Ramesh Kumar   (CSE)');
  console.log('   mentor2  → Prof. Anitha Sharma (ECE)');
  console.log('   student1 → Arjun Reddy   88% att, 2 leaves');
  console.log('   student2 → Priya Patel   82% att, 4 leaves (AT LIMIT)');
  console.log('   student3 → Kiran Naidu   65% att (BLOCKED - low att)');
  console.log('   student4 → Sneha Verma   78% att, 1 pending');
  console.log('   student5 → Rahul Banerjee 52% att (BLOCKED - low att)');
}

main().catch(err => { console.error(err); process.exit(1); });
