const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'slms.db');

let _db = null;

/** Initialise (async — must be awaited once at startup) */
async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }
  createSchema();
  _persist();
  return _db;
}

function _db_() {
  if (!_db) throw new Error('DB not initialised — call initDB() first');
  return _db;
}

function _persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(_db_().export()));
}

function createSchema() {
  _db_().run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      branch TEXT NOT NULL,
      semester INTEGER NOT NULL,
      mentor_id INTEGER,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE(student_id, date)
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      leave_type TEXT NOT NULL DEFAULT 'personal',
      status TEXT NOT NULL DEFAULT 'pending',
      mentor_note TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS absence_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'uninformed',
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ── Public helpers (synchronous surface matching better-sqlite3 style) ─────────

/**
 * Execute one or more SQL statements (no params, no return value).
 * Splits on ; to handle multi-statement strings.
 */
function exec(sql) {
  const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const s of stmts) {
    _db_().run(s);
  }
  _persist();
}

/**
 * Run a single parameterised statement.
 * Returns { lastInsertRowid }.
 */
function run(sql, params = []) {
  // sql.js uses named or positional (?) params via prepare/bind/step
  const stmt = _db_().prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const rowId = _db_().exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
  _persist();
  return { lastInsertRowid: rowId };
}

/**
 * Return the first row as a plain object, or undefined.
 */
function get(sql, params = []) {
  const stmt = _db_().prepare(sql);
  if (params.length) stmt.bind(params);
  let result;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    result = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
  }
  stmt.free();
  return result;
}

/**
 * Return all matching rows as plain objects.
 */
function all(sql, params = []) {
  const stmt = _db_().prepare(sql);
  if (params.length) stmt.bind(params);
  const cols = stmt.getColumnNames();
  const rows = [];
  while (stmt.step()) {
    const vals = stmt.get();
    rows.push(Object.fromEntries(cols.map((c, i) => [c, vals[i]])));
  }
  stmt.free();
  return rows;
}

module.exports = { initDB, run, get, all, exec };
