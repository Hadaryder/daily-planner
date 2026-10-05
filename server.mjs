// היום שלי — standalone server. Node 22+, no npm dependencies.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { mailConfig, sendMail } from './mail.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dir, 'data');
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const AI_DAILY_LIMIT = +process.env.AI_DAILY_LIMIT || 30;
const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP !== '0';
const MAIL = mailConfig(); const MAIL_ENABLED = !!MAIL;
const POLICY_VERSION = '2026-10-06'; // לעדכן כשמשנים את מדיניות הפרטיות או התנאים: כל המשתמשים יתבקשו לאשר מחדש
const BASE_URL_ENV = String(process.env.BASE_URL || '').replace(/\/+$/, '');
const OPERATOR_NAME = process.env.OPERATOR_NAME || '';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || '';
const MAIL_PROVIDER_NAME = process.env.MAIL_PROVIDER_NAME || 'ספק שירות המיילים';
const HOSTING_TEXT = process.env.HOSTING_TEXT || 'שרתים של Fly.io באזור פרנקפורט (גרמניה)';
const TRUST_PROXY = process.env.TRUST_PROXY === '1'; // להפעיל רק מאחורי פרוקסי (Fly, Caddy, nginx)
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'planner.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const sqlStr = x => "'" + String(x).replace(/'/g, "''") + "'";
// שחזור מגיבוי (ידני, בטוח): RESTORE_FROM=<שם קובץ ב-backups או נתיב מלא>.
// קודם נשמר עותק של המצב הנוכחי (pre-restore-*), ורק אז מוחלף. מבוצע פעם אחת לכל קובץ (סמן .restored).
if (process.env.RESTORE_FROM) {
  try {
    const src = path.isAbsolute(process.env.RESTORE_FROM) ? process.env.RESTORE_FROM : path.join(BACKUP_DIR, process.env.RESTORE_FROM);
    const marker = path.join(DATA_DIR, '.restored');
    const done = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : '';
    if (done === src) console.log('RESTORE_FROM כבר בוצע בעבר, מדלגים. אפשר להסיר את המשתנה.');
    else if (!fs.existsSync(src)) console.error('RESTORE_FROM: הקובץ לא נמצא, לא משחזרים:', src);
    else {
      new DatabaseSync(src).close(); // מוודא שהגיבוי תקין לפני שנוגעים בכלום
      if (fs.existsSync(DB_FILE)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const cur = new DatabaseSync(DB_FILE); cur.exec(`VACUUM INTO ${sqlStr(path.join(BACKUP_DIR, 'pre-restore-' + stamp() + '.db'))}`); cur.close();
      }
      for (const ext of ['', '-wal', '-shm']) fs.rmSync(DB_FILE + ext, { force: true });
      fs.copyFileSync(src, DB_FILE); fs.writeFileSync(marker, src);
      console.log('שוחזר מגיבוי:', src);
    }
  } catch (e) { console.error('שחזור נכשל, ממשיכים עם המסד הנוכחי:', e.message); }
}
const db = new DatabaseSync(DB_FILE);
// גיבוי עקבי (VACUUM INTO). נשמרים 8 אחרונים לכל סוג. לא מפיל את השרת אם נכשל.
function backupNow(tag) {
  try {
    if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 300e6) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const f = path.join(BACKUP_DIR, `${tag}-${stamp()}.db`);
    db.exec(`VACUUM INTO ${sqlStr(f)}`);
    const mine = fs.readdirSync(BACKUP_DIR).filter(x => x.startsWith(tag + '-') && x.endsWith('.db')).sort();
    for (const old of mine.slice(0, Math.max(0, mine.length - 8))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
    const left = mine.slice(Math.max(0, mine.length - 8)); // גיבויים ישנים מ-60 יום נמחקים (חוץ מ-3 האחרונים), בהתאם למדיניות הפרטיות
    for (const old of left.slice(0, Math.max(0, left.length - 3))) { const fp = path.join(BACKUP_DIR, old); if (Date.now() - fs.statSync(fp).mtimeMs > 60 * 864e5) fs.rmSync(fp, { force: true }); }
    console.log('גיבוי נשמר:', path.basename(f));
  } catch (e) { console.error('גיבוי נכשל (ממשיכים):', e.message); }
}
// לפני כל שינוי סכמה או עלייה של גרסה: אם כבר יש נתונים, שומרים עותק
try { if (db.prepare("SELECT 1 x FROM sqlite_master WHERE type='table' AND name='users'").get()) backupNow('boot'); } catch {}
setInterval(() => backupNow('daily'), 24 * 3600e3).unref();
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, json TEXT NOT NULL, code TEXT UNIQUE NOT NULL, updated INTEGER);
CREATE TABLE IF NOT EXISTS days(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, json TEXT NOT NULL, score INTEGER, updated INTEGER, PRIMARY KEY(user_id,date));
CREATE TABLE IF NOT EXISTS links(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, other_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id,other_id));
CREATE TABLE IF NOT EXISTS postcards(id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, note TEXT, sticker TEXT, photo TEXT, day TEXT, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS postcard_to(pc_id INTEGER NOT NULL REFERENCES postcards(id) ON DELETE CASCADE, to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(pc_id,to_id));
CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usage(user_id INTEGER NOT NULL, kind TEXT NOT NULL, bucket TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(user_id,kind,bucket));
`);
// מיגרציות: רק מוסיפות עמודות (לא מוחקות ולא משנות)
{ const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('verified')) db.exec('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('consent_at')) db.exec('ALTER TABLE users ADD COLUMN consent_at INTEGER');
  if (!cols.includes('consent_ver')) db.exec('ALTER TABLE users ADD COLUMN consent_ver TEXT'); }
const q = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email=?'),
  insUser: db.prepare('INSERT INTO users(email,pass,created,consent_at,consent_ver) VALUES (?,?,?,?,?)'),
  userById: db.prepare('SELECT * FROM users WHERE id=?'),
  setPass: db.prepare('UPDATE users SET pass=? WHERE id=?'),
  setVerified: db.prepare('UPDATE users SET verified=1 WHERE id=?'),
  setConsent: db.prepare('UPDATE users SET consent_at=?, consent_ver=? WHERE id=?'),
  delUserSessions: db.prepare('DELETE FROM sessions WHERE user_id=?'),
  delOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?'),
  insToken: db.prepare('INSERT INTO tokens(hash,user_id,kind,expires) VALUES (?,?,?,?)'),
  getToken: db.prepare('SELECT * FROM tokens WHERE hash=? AND kind=?'),
  delToken: db.prepare('DELETE FROM tokens WHERE hash=?'),
  delTokens: db.prepare('DELETE FROM tokens WHERE user_id=? AND kind=?'),
  cleanTokens: db.prepare('DELETE FROM tokens WHERE expires<?'),
  pendingToken: db.prepare('SELECT 1 x FROM tokens WHERE user_id=? AND kind=? AND expires>? LIMIT 1'),
  insSess: db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES (?,?,?)'),
  sess: db.prepare('SELECT s.user_id id,u.email email,u.verified verified,u.consent_ver consent_ver FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?'),
  delSess: db.prepare('DELETE FROM sessions WHERE token=?'),
  prof: db.prepare('SELECT json,code FROM profiles WHERE user_id=?'),
  profByCode: db.prepare('SELECT user_id FROM profiles WHERE code=?'),
  upProf: db.prepare('INSERT INTO profiles(user_id,json,code,updated) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET json=excluded.json, updated=excluded.updated'),
  days: db.prepare('SELECT date,json FROM days WHERE user_id=? ORDER BY date DESC LIMIT 800'),
  upDay: db.prepare('INSERT INTO days(user_id,date,json,score,updated) VALUES (?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET json=excluded.json, score=excluded.score, updated=excluded.updated'),
  scores: db.prepare('SELECT date,score FROM days WHERE user_id=? AND score IS NOT NULL AND date>=? ORDER BY date DESC'),
  link: db.prepare('INSERT OR IGNORE INTO links(user_id,other_id) VALUES (?,?)'),
  unlink: db.prepare('DELETE FROM links WHERE user_id=? AND other_id=?'),
  hasLink: db.prepare('SELECT 1 x FROM links WHERE user_id=? AND other_id=?'),
  myLinks: db.prepare('SELECT other_id id FROM links WHERE user_id=?'),
  linkedMe: db.prepare('SELECT user_id id FROM links WHERE other_id=?'),
  insPc: db.prepare('INSERT INTO postcards(from_id,note,sticker,photo,day,at) VALUES (?,?,?,?,?,?)'),
  insPcTo: db.prepare('INSERT OR IGNORE INTO postcard_to(pc_id,to_id) VALUES (?,?)'),
  pcIn: db.prepare('SELECT p.id,p.from_id,p.note,p.sticker,p.photo,p.day,p.at FROM postcards p JOIN postcard_to t ON t.pc_id=p.id WHERE t.to_id=? ORDER BY p.at DESC LIMIT 100'),
  pcOut: db.prepare('SELECT id,note,sticker,photo,day,at FROM postcards WHERE from_id=? ORDER BY at DESC LIMIT 100'),
  pcTo: db.prepare('SELECT to_id FROM postcard_to WHERE pc_id=?'),
  usageGet: db.prepare('SELECT n FROM usage WHERE user_id=? AND kind=? AND bucket=?'),
  usageInc: db.prepare('INSERT INTO usage(user_id,kind,bucket,n) VALUES (?,?,?,1) ON CONFLICT(user_id,kind,bucket) DO UPDATE SET n=n+1'),
  delUser: db.prepare('DELETE FROM users WHERE id=?'),
  cleanSess: db.prepare('DELETE FROM sessions WHERE expires<?'),
};
/* ---------- helpers ---------- */
const now = () => Date.now();
const hashPw = pw => { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
const checkPw = (pw, stored) => { const [s, h] = stored.split(':'); const x = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64); const y = Buffer.from(h, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const genCode = () => { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', D = '23456789'; const r = s => s[crypto.randomInt(s.length)]; return r(L) + r(L) + r(L) + '-' + r(D) + r(D) + r(D); };
const hits = new Map();
function limited(key, max, windowMs) { const t = now(); const a = (hits.get(key) || []).filter(x => t - x < windowMs); a.push(t); hits.set(key, a); return a.length > max; }
setInterval(() => { const t = now(); for (const [k, a] of hits) { const f = a.filter(x => t - x < 3600e3); if (f.length) hits.set(k, f); else hits.delete(k); } q.cleanSess.run(t); q.cleanTokens.run(t); }, 600e3).unref();
const parseCookies = h => Object.fromEntries((h || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const send = (res, code, obj, headers = {}) => { const body = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(body); };
const fail = (res, code, error, extra = {}) => send(res, code, { error, ...extra });
function readBody(req, max) { return new Promise((ok, no) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > max) { no({ status: 413, error: 'too_large' }); req.destroy(); } else ch.push(c); }); req.on('end', () => { if (!ch.length) return ok({}); try { ok(JSON.parse(Buffer.concat(ch).toString('utf8'))); } catch { no({ status: 400, error: 'bad_json' }); } }); req.on('error', () => no({ status: 400, error: 'read' })); }); }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d); t.setDate(t.getDate() + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
function getProfile(uid) { const r = q.prof.get(uid); if (!r) return null; const p = JSON.parse(r.json); p.code = r.code; return p; }
const ids = a => (Array.isArray(a) ? a : []).map(String);
const mutual = (a, b) => !!q.hasLink.get(a, b) && !!q.hasLink.get(b, a);
const pub = (uid, withScores) => {
  const p = getProfile(uid); if (!p) return null;
  const o = { id: String(uid), name: p.name || '?', avatar: p.avatar && p.avatar.length < 60000 ? p.avatar : null, sticker: p.sticker || 'flower' };
  if (withScores) { const hid = new Set(ids(p.hidden)); const s = {}; for (const r of q.scores.all(uid, addDays(today(), -120))) if (!hid.has(r.date)) s[r.date] = r.score; o.scores = s; }
  return o;
};

/* ---------- מיילים, אסימונים, הסכמה ---------- */
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const escH = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const baseUrl = req => BASE_URL_ENV || `${(TRUST_PROXY && req.headers['x-forwarded-proto']) || 'http'}://${req.headers.host}`;
function newToken(uid, kind, ttlMs) { const t = crypto.randomBytes(32).toString('base64url'); q.delTokens.run(uid, kind); q.insToken.run(sha(t), uid, kind, now() + ttlMs); return t; }
function takeToken(t, kind) { const row = q.getToken.get(sha(String(t || '')), kind); if (!row) return null; q.delToken.run(row.hash); return row.expires < now() ? null : row.user_id; }
const userInfo = u => ({ id: String(u.id), email: u.email, verified: !!u.verified });
const needsConsent = u => u.consent_ver !== POLICY_VERSION;
const mailHtml = (title, body, link, btn) => `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;padding:24px;background:#fbf4e6;color:#1f1a2e;border:2px solid #1f1a2e;border-radius:18px"><h2 style="margin:0 0 12px">${escH(title)}</h2><p style="font-size:16px;line-height:1.6">${body}</p><p style="margin:22px 0"><a href="${escH(link)}" style="background:#16b04a;color:#1f1a2e;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px;border:2px solid #1f1a2e;display:inline-block">${escH(btn)}</a></p><p style="font-size:13px;color:#555">אם הכפתור לא נפתח, העתיקו את הקישור לדפדפן:<br><span style="word-break:break-all">${escH(link)}</span></p></div>`;
function sendVerify(req, u) {
  if (!MAIL_ENABLED) return; const link = `${baseUrl(req)}/#/verify/${newToken(u.id, 'verify', 3 * 864e5)}`;
  sendMail(MAIL, { to: u.email, subject: 'אימות המייל שלך ב״היום שלי״', text: `שלום,\nכדי לאמת את כתובת המייל ב"היום שלי" פתחו את הקישור:\n${link}\n\nהקישור תקף ל-3 ימים. אם לא נרשמתם, אפשר להתעלם מההודעה.`, html: mailHtml('אימות המייל', 'תודה שנרשמתם ל״היום שלי״. כדי לאמת את כתובת המייל ולהפעיל חברים וגלויות, לחצו על הכפתור. הקישור תקף ל-3 ימים. אם לא נרשמתם, אפשר להתעלם מההודעה.', link, 'אימות המייל') }).catch(e => console.error('שליחת מייל אימות נכשלה:', e.message));
}
function sendReset(req, u) {
  const link = `${baseUrl(req)}/#/reset/${newToken(u.id, 'reset', 3600e3)}`;
  sendMail(MAIL, { to: u.email, subject: 'איפוס סיסמה ב״היום שלי״', text: `שלום,\nביקשתם לאפס את הסיסמה ב"היום שלי". הקישור תקף לשעה אחת:\n${link}\n\nאם לא ביקשתם, אפשר להתעלם. הסיסמה לא תשתנה.`, html: mailHtml('איפוס סיסמה', 'ביקשתם לאפס את הסיסמה ב״היום שלי״. הקישור תקף לשעה אחת. אם לא ביקשתם, אפשר להתעלם מההודעה והסיסמה לא תשתנה.', link, 'בחירת סיסמה חדשה') }).catch(e => console.error('שליחת מייל איפוס נכשלה:', e.message));
}
// משתמשים קיימים שעוד לא אימתו: בכניסה הראשונה אחרי שהמיילים מופעלים נשלח להם קישור אימות (לכל היותר פעם ביום, ורק אם אין קישור תקף ממתין)
function autoVerifyMail(req, u) {
  if (!MAIL_ENABLED || u.verified) return;
  if (q.pendingToken.get(u.id, 'verify', now())) return;
  const bucket = today(); if (((q.usageGet.get(u.id, 'vauto', bucket) || {}).n || 0) >= 1) return;
  q.usageInc.run(u.id, 'vauto', bucket); const full = q.userById.get(u.id); if (full) sendVerify(req, full);
}
const needVerified = (res, ctx) => { if (MAIL_ENABLED && !ctx.user.verified) { fail(res, 403, 'unverified'); return true; } return false; };
const pwOk = p => typeof p === 'string' && p.length >= 8 && p.length <= 200;
/* ---------- routes ---------- */
const routes = {};
const R = (m, p, fn, opt = {}) => { routes[m + ' ' + p] = { fn, ...opt }; };
R('GET', '/api/health', (req, res) => send(res, 200, { ok: true, app: 'daily-planner', signup: ALLOW_SIGNUP, ai: !!AI_KEY, mail: MAIL_ENABLED, policy: POLICY_VERSION }));
R('GET', '/api/me', (req, res, ctx) => ctx.user ? (autoVerifyMail(req, ctx.user), send(res, 200, { user: userInfo(ctx.user), needsConsent: needsConsent(ctx.user), mail: MAIL_ENABLED })) : fail(res, 401, 'unauthorized'));
R('POST', '/api/register', async (req, res, ctx) => {
  if (!ALLOW_SIGNUP) return fail(res, 403, 'signup_closed');
  if (limited('reg:' + ctx.ip, 10, 3600e3)) return fail(res, 429, 'rate');
  const { email, password } = ctx.body; const em = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$/.test(em)) return fail(res, 400, 'bad_email');
  if (!pwOk(password)) return fail(res, 400, 'weak_password');
  if (ctx.body.consent !== true) return fail(res, 400, 'consent_required');
  if (q.userByEmail.get(em)) return fail(res, 409, 'exists');
  const id = Number(q.insUser.run(em, hashPw(password), now(), now(), POLICY_VERSION).lastInsertRowid);
  let code; for (let i = 0; i < 20; i++) { code = genCode(); if (!q.profByCode.get(code)) break; }
  q.upProf.run(id, JSON.stringify({ name: '', hidden: [], blocked: [], dismissed: [], noCards: [] }), code, now());
  const nu = q.userById.get(id); sendVerify(req, nu);
  startSession(res, id); send(res, 200, { user: userInfo(nu), needsConsent: false, mail: MAIL_ENABLED }, sessionHeader(res));
});
R('POST', '/api/login', async (req, res, ctx) => {
  const { email, password } = ctx.body; const em = String(email || '').trim().toLowerCase();
  if (limited('login:' + ctx.ip + em, 10, 600e3)) return fail(res, 429, 'rate');
  const u = q.userByEmail.get(em);
  if (!u || typeof password !== 'string' || !checkPw(password, u.pass)) return fail(res, 401, 'bad_credentials');
  startSession(res, u.id); send(res, 200, { user: userInfo(u), needsConsent: needsConsent(u), mail: MAIL_ENABLED }, sessionHeader(res));
});
function startSession(res, uid) { const token = crypto.randomBytes(32).toString('hex'); q.insSess.run(token, uid, now() + 30 * 864e5); res._cookie = `dp_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${COOKIE_SECURE ? '; Secure' : ''}`; }
const sessionHeader = res => ({ 'set-cookie': res._cookie });
R('POST', '/api/logout', (req, res, ctx) => { if (ctx.token) q.delSess.run(ctx.token); send(res, 200, { ok: true }, { 'set-cookie': `dp_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}` }); }, { auth: true });

R('POST', '/api/forgot', (req, res, ctx) => {
  if (!MAIL_ENABLED) return fail(res, 501, 'mail_disabled');
  const em = String(ctx.body.email || '').trim().toLowerCase();
  if (limited('forgot-ip:' + ctx.ip, 10, 3600e3) || limited('forgot:' + em, 3, 3600e3)) return fail(res, 429, 'rate');
  const u = q.userByEmail.get(em); if (u) sendReset(req, u);
  send(res, 200, { ok: true }); // אותה תשובה בין אם המייל קיים ובין אם לא
});
R('POST', '/api/reset', (req, res, ctx) => {
  if (limited('reset:' + ctx.ip, 20, 3600e3)) return fail(res, 429, 'rate');
  if (!pwOk(ctx.body.password)) return fail(res, 400, 'weak_password');
  const uid = takeToken(ctx.body.token, 'reset'); if (!uid) return fail(res, 400, 'bad_token');
  q.setPass.run(hashPw(ctx.body.password), uid); q.setVerified.run(uid); q.delUserSessions.run(uid); q.delTokens.run(uid, 'reset');
  const u = q.userById.get(uid); startSession(res, uid);
  send(res, 200, { user: userInfo(u), needsConsent: needsConsent(u), mail: MAIL_ENABLED }, sessionHeader(res));
});
R('POST', '/api/verify', (req, res, ctx) => {
  if (limited('verify:' + ctx.ip, 30, 3600e3)) return fail(res, 429, 'rate');
  const uid = takeToken(ctx.body.token, 'verify'); if (!uid) return fail(res, 400, 'bad_token');
  q.setVerified.run(uid); send(res, 200, { ok: true });
});
R('POST', '/api/verify/resend', (req, res, ctx) => {
  if (!MAIL_ENABLED) return fail(res, 501, 'mail_disabled');
  const u = q.userById.get(ctx.user.id); if (u.verified) return send(res, 200, { ok: true, already: true });
  if (limited('vresend:' + u.id, 3, 3600e3)) return fail(res, 429, 'rate');
  sendVerify(req, u); send(res, 200, { ok: true });
}, { auth: true });
R('POST', '/api/password', (req, res, ctx) => {
  const u = q.userById.get(ctx.user.id); if (limited('pw:' + u.id, 10, 3600e3)) return fail(res, 429, 'rate');
  if (typeof ctx.body.oldPassword !== 'string' || !checkPw(ctx.body.oldPassword, u.pass)) return fail(res, 403, 'bad_credentials');
  if (!pwOk(ctx.body.newPassword)) return fail(res, 400, 'weak_password');
  q.setPass.run(hashPw(ctx.body.newPassword), u.id); q.delOtherSessions.run(u.id, ctx.token); send(res, 200, { ok: true });
}, { auth: true });
R('POST', '/api/consent', (req, res, ctx) => { if (ctx.body.accept !== true) return fail(res, 400, 'bad_body'); q.setConsent.run(now(), POLICY_VERSION, ctx.user.id); send(res, 200, { ok: true }); }, { auth: true });
R('GET', '/api/data', (req, res, ctx) => { const days = {}; for (const r of q.days.all(ctx.user.id)) days[r.date] = JSON.parse(r.json); send(res, 200, { profile: getProfile(ctx.user.id), days }); }, { auth: true });
R('PUT', '/api/profile', (req, res, ctx) => {
  const p = ctx.body.profile; if (!p || typeof p !== 'object') return fail(res, 400, 'bad_body');
  const old = getProfile(ctx.user.id) || {}; const clean = { name: String(p.name || '').slice(0, 24), birth: /^\d{4}-\d{2}-\d{2}$/.test(p.birth || '') ? p.birth : '', avatar: typeof p.avatar === 'string' && p.avatar.startsWith('data:image/') && p.avatar.length < 60000 ? p.avatar : null, sticker: String(p.sticker || 'flower').slice(0, 20), stepsGoal: Math.max(0, Math.min(100000, Math.round(+p.stepsGoal || 0))), hidden: ids(p.hidden).filter(x => DATE_RE.test(x)).slice(0, 400), blocked: ids(p.blocked).slice(0, 200), dismissed: ids(p.dismissed).slice(0, 200), noCards: ids(p.noCards).slice(0, 200), created: old.created || today() };
  q.upProf.run(ctx.user.id, JSON.stringify(clean), old.code || (() => { let c; do { c = genCode(); } while (q.profByCode.get(c)); return c; })(), now());
  send(res, 200, { ok: true, code: getProfile(ctx.user.id).code });
}, { auth: true, max: 300e3 });
R('PUT', '/api/day', (req, res, ctx) => {
  const { date, data, score } = ctx.body; if (!DATE_RE.test(date || '') || !data || typeof data !== 'object') return fail(res, 400, 'bad_body');
  const js = JSON.stringify(data); if (js.length > 150e3) return fail(res, 413, 'too_large');
  q.upDay.run(ctx.user.id, date, js, Number.isFinite(+score) && score !== null ? Math.max(0, Math.min(100, Math.round(+score))) : null, now()); send(res, 200, { ok: true });
}, { auth: true, max: 200e3 });
R('GET', '/api/social', (req, res, ctx) => {
  const me = ctx.user.id; const mine = new Set(q.myLinks.all(me).map(r => r.id)); const theirs = new Set(q.linkedMe.all(me).map(r => r.id));
  const mp = getProfile(me) || {}; const blocked = new Set(ids(mp.blocked)); const dismissed = new Set(ids(mp.dismissed)); const noCards = new Set(ids(mp.noCards));
  const friends = [], incoming = [], outgoing = [];
  for (const id of mine) { if (blocked.has(String(id))) continue; if (theirs.has(id)) friends.push(pub(id, true)); else outgoing.push(pub(id, false)); }
  for (const id of theirs) if (!mine.has(id) && !blocked.has(String(id)) && !dismissed.has(String(id))) incoming.push(pub(id, false));
  const friendSet = new Set(friends.filter(Boolean).map(f => f.id));
  const cardsIn = q.pcIn.all(me).filter(c => friendSet.has(String(c.from_id)) && !noCards.has(String(c.from_id))).map(c => ({ id: String(c.id), from: String(c.from_id), note: c.note || '', sticker: c.sticker || 'flower', photo: c.photo || null, day: c.day || null, at: c.at }));
  const cardsOut = q.pcOut.all(me).map(c => ({ id: String(c.id), to: q.pcTo.all(c.id).map(r => String(r.to_id)), note: c.note || '', sticker: c.sticker || 'flower', photo: c.photo || null, day: c.day || null, at: c.at }));
  send(res, 200, { me: { id: String(me), code: getProfile(me).code }, friends: friends.filter(Boolean), incoming: incoming.filter(Boolean), outgoing: outgoing.filter(Boolean), cardsIn, cardsOut });
}, { auth: true });
R('POST', '/api/friends/add', (req, res, ctx) => {
  if (needVerified(res, ctx)) return;
  if (limited('fadd:' + ctx.user.id, 30, 3600e3)) return fail(res, 429, 'rate');
  let code = String(ctx.body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length === 6) code = code.slice(0, 3) + '-' + code.slice(3);
  const hit = q.profByCode.get(code); if (!hit || hit.user_id === ctx.user.id) return fail(res, 404, 'nf');
  const them = getProfile(hit.user_id); if (ids(them.blocked).includes(String(ctx.user.id))) return fail(res, 404, 'nf');
  if (q.hasLink.get(ctx.user.id, hit.user_id)) return fail(res, 409, 'dup', { name: them.name });
  q.link.run(ctx.user.id, hit.user_id); send(res, 200, { id: String(hit.user_id), name: them.name });
}, { auth: true });
R('POST', '/api/friends/accept', (req, res, ctx) => { if (needVerified(res, ctx)) return; const id = +ctx.body.id; if (!id || !q.hasLink.get(id, ctx.user.id)) return fail(res, 404, 'nf'); q.link.run(ctx.user.id, id); send(res, 200, { ok: true }); }, { auth: true });
R('POST', '/api/friends/remove', (req, res, ctx) => { const id = +ctx.body.id; if (id) q.unlink.run(ctx.user.id, id); send(res, 200, { ok: true }); }, { auth: true });
R('POST', '/api/postcards', (req, res, ctx) => {
  if (needVerified(res, ctx)) return;
  if (limited('pc:' + ctx.user.id, 30, 3600e3)) return fail(res, 429, 'rate');
  const b = ctx.body; const to = [...new Set(ids(b.to))].filter(x => mutual(ctx.user.id, +x)).slice(0, 20); if (!to.length) return fail(res, 400, 'no_recipients');
  const note = String(b.note || '').slice(0, 120); const photo = typeof b.photo === 'string' && b.photo.startsWith('data:image/') && b.photo.length < 220e3 ? b.photo : null; const day = DATE_RE.test(b.day || '') ? b.day : null;
  if (!note.trim() && !photo && !day) return fail(res, 400, 'empty');
  const pid = Number(q.insPc.run(ctx.user.id, note, String(b.sticker || 'flower').slice(0, 20), photo, day, now()).lastInsertRowid); for (const t of to) q.insPcTo.run(pid, +t); send(res, 200, { id: String(pid) });
}, { auth: true, max: 400e3 });
R('POST', '/api/estimate', async (req, res, ctx) => {
  if (!AI_KEY) return fail(res, 503, 'ai_unavailable');
  const bucket = today(); const used = (q.usageGet.get(ctx.user.id, 'ai', bucket) || {}).n || 0; if (used >= AI_DAILY_LIMIT) return fail(res, 429, 'ai_limit');
  const text = String(ctx.body.text || '').trim().slice(0, 400); if (text.length < 2) return fail(res, 400, 'empty');
  const prompt = `אתה עוזר תזונה. המשתמש תיאר ארוחה בטקסט חופשי. פרק אותה לרכיבים והערך לכל רכיב קלוריות וחלבון (בגרמים) לפי הכמות שצוינה. אם לא צוינה כמות, הנח מנה סבירה וכתוב אותה בשדה amount. היה ריאליסטי ועגל למספרים שלמים.\nהתיאור: "${text.replace(/"/g, "'")}"\n\nהחזר JSON בלבד, בלי טקסט נוסף, בפורמט: {"items":[{"name":"","amount":"","kcal":0,"protein":0}]}. עד 12 רכיבים.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: AI_MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }), signal: AbortSignal.timeout(25000) });
    if (!r.ok) return fail(res, 502, 'ai_error');
    const j = await r.json(); const t = (j.content || []).map(c => c.text || '').join(''); const m = t.match(/\{[\s\S]*\}/); const o = JSON.parse(m ? m[0] : t);
    if (!Array.isArray(o.items) || !o.items.length || o.items.length > 12) return fail(res, 502, 'ai_bad');
    const num = v => { v = Math.round(+v); if (!Number.isFinite(v) || v < 0 || v > 6000) throw new Error('bad'); return v; };
    const items = o.items.map(x => ({ name: String(x.name || '').slice(0, 60) || 'רכיב', amount: String(x.amount || '').slice(0, 40), kcal: num(x.kcal), protein: num(x.protein) }));
    q.usageInc.run(ctx.user.id, 'ai', bucket);
    send(res, 200, { items, kcal: items.reduce((s, x) => s + x.kcal, 0), protein: items.reduce((s, x) => s + x.protein, 0) });
  } catch { fail(res, 502, 'ai_error'); }
}, { auth: true });
R('GET', '/api/export', (req, res, ctx) => { const days = {}; for (const r of q.days.all(ctx.user.id)) days[r.date] = JSON.parse(r.json); send(res, 200, { exported: new Date().toISOString(), email: ctx.user.email, profile: getProfile(ctx.user.id), days }); }, { auth: true });
R('POST', '/api/account/delete', (req, res, ctx) => {
  const u = q.userByEmail.get(ctx.user.email); if (!u || typeof ctx.body.password !== 'string' || !checkPw(ctx.body.password, u.pass)) return fail(res, 403, 'bad_credentials');
  q.delUser.run(ctx.user.id); send(res, 200, { ok: true }, { 'set-cookie': `dp_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}` });
}, { auth: true });
/* ---------- server ---------- */
const INDEX = path.join(__dir, 'public', 'index.html');
const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
  const ip = (TRUST_PROXY && (req.headers['fly-client-ip'] || xff[xff.length - 1])) || req.socket.remoteAddress || '';
  try {
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      if (url.pathname === '/' || url.pathname === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SEC }); return res.end(fs.readFileSync(INDEX)); }
      if (url.pathname === '/privacy' || url.pathname === '/terms') {
        const f = path.join(__dir, 'public', url.pathname.slice(1) + '.html');
        const vars = { OPERATOR_NAME: escH(OPERATOR_NAME || 'מפעיל/ת האתר'), CONTACT: CONTACT_EMAIL ? `<a href="mailto:${escH(CONTACT_EMAIL)}">${escH(CONTACT_EMAIL)}</a>` : 'בפנייה למפעיל/ת האתר', POLICY_VERSION, MAIL_PROVIDER: escH(MAIL_PROVIDER_NAME), HOSTING: escH(HOSTING_TEXT) };
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SEC });
        return res.end(fs.readFileSync(f, 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m)));
      }
      if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
      res.writeHead(404, SEC); return res.end('not found');
    }
    const route = routes[req.method + ' ' + url.pathname]; if (!route) return fail(res, 404, 'not_found');
    const cookies = parseCookies(req.headers.cookie); const token = cookies.dp_sid || null; const ctx = { ip, token, user: null, body: {} };
    if (token) { const s = q.sess.get(token, now()); if (s) ctx.user = { id: s.id, email: s.email, verified: s.verified, consent_ver: s.consent_ver }; }
    if (route.auth && !ctx.user) return fail(res, 401, 'unauthorized');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const org = req.headers.origin; const host = req.headers.host; if (org) { try { if (new URL(org).host !== host) return fail(res, 403, 'bad_origin'); } catch { return fail(res, 403, 'bad_origin'); } }
      if (!String(req.headers['content-type'] || '').startsWith('application/json') && req.headers['content-length'] !== '0' && req.headers['content-length'] !== undefined) return fail(res, 415, 'json_only');
      ctx.body = await readBody(req, route.max || 60e3);
    }
    await route.fn(req, res, ctx);
  } catch (e) { if (e && e.status) return fail(res, e.status, e.error); console.error(e); fail(res, 500, 'server_error'); }
});
if (MAIL_ENABLED && !CONTACT_EMAIL) console.warn('אזהרה: CONTACT_EMAIL לא מוגדר, מדיניות הפרטיות תציג ניסוח כללי');
server.listen(PORT, () => console.log(`היום שלי רץ על http://localhost:${PORT}  (AI: ${AI_KEY ? 'פעיל' : 'כבוי'})`));
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
