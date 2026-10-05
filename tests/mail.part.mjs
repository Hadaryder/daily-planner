// בדיקות מייל, אימות, איפוס סיסמה, הסכמה ודפי מדיניות. מופעל מתוך api.test.mjs
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function startMockSmtp({ mode = 'plain', key, cert, behavior = 'ok' } = {}) {
  const mails = [];
  const attach = (sock, secure, greet) => {
    let buf = '', state = 'cmd', mail = { secure, to: [] };
    const w = l => sock.write(l + '\r\n');
    if (greet) w('220 mock ESMTP');
    sock.on('error', () => {});
    sock.on('data', d => {
      buf += d.toString('utf8');
      for (;;) {
        if (state === 'data') { const i = buf.indexOf('\r\n.\r\n'); if (i < 0) break; mail.raw = buf.slice(0, i); buf = buf.slice(i + 5); mails.push(mail); mail = { secure, to: [] }; state = 'cmd'; w('250 queued'); continue; }
        const i = buf.indexOf('\r\n'); if (i < 0) break; const line = buf.slice(0, i); buf = buf.slice(i + 2); const up = line.toUpperCase();
        if (up.startsWith('EHLO')) { w('250-mock'); if (mode === 'starttls' && !secure) w('250-STARTTLS'); w('250 AUTH PLAIN LOGIN'); }
        else if (up === 'STARTTLS') { w('220 go ahead'); sock.removeAllListeners('data'); const t = new tls.TLSSocket(sock, { isServer: true, key, cert }); t.on('error', () => {}); attach(t, true, false); return; }
        else if (up.startsWith('AUTH PLAIN')) { const [, user, pass] = Buffer.from(line.slice(11), 'base64').toString().split('\0'); mail.auth = { user, pass }; w(behavior === 'authfail' ? '535 nope' : '235 ok'); }
        else if (up.startsWith('MAIL FROM')) { mail.from = line.match(/<([^>]*)>/)[1]; w('250 ok'); }
        else if (up.startsWith('RCPT TO')) { mail.to.push(line.match(/<([^>]*)>/)[1]); w('250 ok'); }
        else if (up === 'DATA') { state = 'data'; w('354 go'); }
        else if (up === 'QUIT') { w('221 bye'); sock.end(); }
        else w('250 ok');
      }
    });
  };
  const server = mode === 'implicit' ? tls.createServer({ key, cert }, s => attach(s, true, true)) : net.createServer(s => attach(s, false, true));
  return new Promise(res => server.listen(0, '127.0.0.1', () => res({ port: server.address().port, mails, close: () => server.close() })));
}
export const dec = raw => {
  const [head, ...rest] = raw.split('\r\n\r\n'); const body = rest.join('\r\n\r\n');
  const subj = (head.match(/^Subject: (.*)$/m) || [])[1] || ''; const m = subj.match(/=\?UTF-8\?B\?(.*)\?=/);
  const parts = [...body.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g)].map(x => Buffer.from(x[1].replace(/\s/g, ''), 'base64').toString('utf8'));
  return { head, subject: m ? Buffer.from(m[1], 'base64').toString('utf8') : subj, text: parts[0] || '', html: parts[1] || '' };
};
export const tokenFrom = (mail, kind) => (dec(mail.raw).text.match(new RegExp('/#/' + kind + '/([A-Za-z0-9_-]+)')) || [])[1];

export async function mailTests({ ok, sleep, SERVER, spawn, fs, os, path, DatabaseSync }) {
  const mkserver = (env, dir) => { const port = 3900 + Math.floor(Math.random() * 90); const p = spawn('node', ['--no-warnings', SERVER], { env: { ...process.env, PORT: port, DATA_DIR: dir, TRUST_PROXY: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] }); p.stderr.on('data', () => {}); return { p, port, base: `http://localhost:${port}` }; };
  const caller = base => async (m, p, b, ck) => { const r = await fetch(base + p, { method: m, headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(ck ? { cookie: ck } : {}) }, body: b ? JSON.stringify(b) : undefined }); const sc = r.headers.get('set-cookie'); return { r, j: await r.json().catch(() => null), ck: sc ? sc.split(';')[0] : null, text: null }; };

  const smtp = await startMockSmtp({ mode: 'plain' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dpm-'));
  const S1 = mkserver({ SMTP_URL: `smtp://user:p%40ss@127.0.0.1:${smtp.port}`, MAIL_FROM: 'היום שלי <noreply@example.com>', CONTACT_EMAIL: 'hello@example.com', OPERATOR_NAME: 'הדר' }, dir);
  S1.p.env = null; await sleep(1100);
  const call = caller(S1.base);
  let x = await call('GET', '/api/health'); ok(x.j.mail === true, 'mail: health reports mail enabled');
  x = await call('POST', '/api/register', { email: 'new@x.com', password: 'password123' }); ok(x.r.status === 400 && x.j.error === 'consent_required', 'register requires consent');
  x = await call('POST', '/api/register', { email: 'new@x.com', password: 'password123', consent: true }); const ck = x.ck;
  ok(x.r.status === 200 && x.j.user.verified === false && x.j.needsConsent === false, 'register with consent ok, starts unverified');
  await sleep(500); ok(smtp.mails.length === 1 && smtp.mails[0].to[0] === 'new@x.com' && smtp.mails[0].from === 'noreply@example.com', 'verification email delivered via SMTP');
  ok(smtp.mails[0].auth && smtp.mails[0].auth.user === 'user' && smtp.mails[0].auth.pass === 'p@ss', 'SMTP credentials (URL-decoded) used for AUTH');
  const vm = dec(smtp.mails[0].raw); ok(vm.subject.includes('אימות') && vm.html.includes('dir="rtl"') && /\/#\/verify\//.test(vm.text), 'verification email: Hebrew subject, RTL html, link with #/verify/');
  const vtoken = tokenFrom(smtp.mails[0], 'verify');
  x = await call('POST', '/api/friends/add', { code: 'ZZZ-999' }, ck); ok(x.r.status === 403 && x.j.error === 'unverified', 'unverified user cannot use friend features');
  x = await call('POST', '/api/postcards', { to: ['1'], note: 'x' }, ck); ok(x.r.status === 403, 'unverified user cannot send postcards');
  x = await call('POST', '/api/verify', { token: 'garbage' }); ok(x.r.status === 400, 'bad verify token rejected');
  x = await call('POST', '/api/verify', { token: vtoken }); ok(x.r.status === 200, 'verify link works (even from another browser, no session needed)');
  x = await call('POST', '/api/verify', { token: vtoken }); ok(x.r.status === 400, 'verify token is single-use');
  x = await call('GET', '/api/me', null, ck); ok(x.j.user.verified === true, 'me shows verified after verification');
  x = await call('POST', '/api/friends/add', { code: 'ZZZ-999' }, ck); ok(x.r.status === 404, 'verified user passes the gate (unknown code -> nf)');
  x = await call('POST', '/api/verify/resend', {}, ck); ok(x.j.already === true, 'resend for verified user is a no-op');
  // resend rate limit for an unverified user
  const u2 = await call('POST', '/api/register', { email: 'two@x.com', password: 'password123', consent: true }); await sleep(300);
  let codes = []; for (let i = 0; i < 4; i++) codes.push((await call('POST', '/api/verify/resend', {}, u2.ck)).r.status); ok(codes.filter(c => c === 429).length >= 1, 'resend verification is rate limited: ' + codes.join(','));
  // ---- forgot / reset
  await sleep(800); // מיילי האימות שנשלחו ברקע בבדיקה הקודמת
  const before = smtp.mails.length;
  x = await call('POST', '/api/forgot', { email: 'nobody@x.com' }); await sleep(400); ok(x.r.status === 200 && smtp.mails.length === before, 'forgot for unknown email: same 200 answer, no email sent (no account enumeration)');
  x = await call('POST', '/api/forgot', { email: 'new@x.com' }); await sleep(500); ok(x.r.status === 200 && smtp.mails.length === before + 1, 'forgot for known email sends one email');
  const rm = smtp.mails[smtp.mails.length - 1]; ok(dec(rm.raw).subject.includes('איפוס') && /\/#\/reset\//.test(dec(rm.raw).text), 'reset email has Hebrew subject and #/reset/ link');
  const rtoken = tokenFrom(rm, 'reset');
  x = await call('POST', '/api/reset', { token: rtoken, password: 'short' }); ok(x.r.status === 400 && x.j.error === 'weak_password', 'reset rejects weak password');
  x = await call('POST', '/api/reset', { token: 'nope', password: 'brand-new-pass1' }); ok(x.r.status === 400 && x.j.error === 'bad_token', 'reset rejects unknown token');
  const ck2 = (await call('POST', '/api/login', { email: 'new@x.com', password: 'password123' })).ck;
  x = await call('POST', '/api/reset', { token: rtoken, password: 'brand-new-pass1' }); ok(x.r.status === 200 && x.ck, 'reset with valid token succeeds and signs in');
  ok((await call('GET', '/api/me', null, ck)).r.status === 401 && (await call('GET', '/api/me', null, ck2)).r.status === 401, 'reset signs out all old sessions');
  ok((await call('POST', '/api/login', { email: 'new@x.com', password: 'password123' })).r.status === 401, 'old password no longer works');
  ok((await call('POST', '/api/login', { email: 'new@x.com', password: 'brand-new-pass1' })).r.status === 200, 'new password works');
  x = await call('POST', '/api/reset', { token: rtoken, password: 'another-pass12' }); ok(x.r.status === 400, 'reset token is single-use');
  // expired token
  const dbh = new DatabaseSync(path.join(dir, 'planner.db')); const uid = dbh.prepare("SELECT id FROM users WHERE email='new@x.com'").get().id;
  dbh.prepare('INSERT INTO tokens(hash,user_id,kind,expires) VALUES (?,?,?,?)').run(crypto.createHash('sha256').update('expired-token').digest('hex'), uid, 'reset', Date.now() - 1000);
  x = await call('POST', '/api/reset', { token: 'expired-token', password: 'another-pass12' }); ok(x.r.status === 400, 'expired reset token rejected');
  // forgot rate limit per email
  let fr = []; for (let i = 0; i < 5; i++) fr.push((await call('POST', '/api/forgot', { email: 'ratelimit@x.com' })).r.status); ok(fr.includes(429), 'forgot is rate limited per email: ' + fr.join(','));
  // ---- change password
  const sA = (await call('POST', '/api/login', { email: 'new@x.com', password: 'brand-new-pass1' })).ck, sB = (await call('POST', '/api/login', { email: 'new@x.com', password: 'brand-new-pass1' })).ck;
  x = await call('POST', '/api/password', { oldPassword: 'wrong', newPassword: 'third-pass-123' }, sA); ok(x.r.status === 403, 'change password needs the old password');
  x = await call('POST', '/api/password', { oldPassword: 'brand-new-pass1', newPassword: 'third-pass-123' }, sA); ok(x.r.status === 200, 'change password works');
  ok((await call('GET', '/api/me', null, sA)).r.status === 200 && (await call('GET', '/api/me', null, sB)).r.status === 401, 'change password keeps this session, signs out the others');
  // ---- consent for existing users
  dbh.prepare('UPDATE users SET consent_ver=NULL WHERE id=?').run(uid);
  x = await call('GET', '/api/me', null, sA); ok(x.j.needsConsent === true, 'user without recorded consent is asked to accept');
  x = await call('POST', '/api/consent', { accept: true }, sA); ok(x.r.status === 200, 'consent endpoint accepts');
  x = await call('GET', '/api/me', null, sA); ok(x.j.needsConsent === false, 'consent recorded');
  dbh.close();
  // ---- existing unverified users get a verification email automatically (once a day)
  { const lg = await call('POST', '/api/register', { email: 'legacy2@x.com', password: 'password123', consent: true }); await sleep(600);
    const dbh2 = new DatabaseSync(path.join(dir, 'planner.db')); const lid = dbh2.prepare("SELECT id FROM users WHERE email='legacy2@x.com'").get().id;
    dbh2.prepare("DELETE FROM tokens WHERE user_id=? AND kind='verify'").run(lid); dbh2.close(); // כמו חשבון ישן שנוצר לפני שהיו מיילים
    const n0 = smtp.mails.length; await call('GET', '/api/me', null, lg.ck); await sleep(700);
    ok(smtp.mails.length === n0 + 1 && smtp.mails[n0].to[0] === 'legacy2@x.com' && /\/#\/verify\//.test(dec(smtp.mails[n0].raw).text), 'existing unverified user automatically receives a verification email on first visit');
    await call('GET', '/api/me', null, lg.ck); await call('GET', '/api/me', null, lg.ck); await sleep(500);
    ok(smtp.mails.length === n0 + 1, 'no repeat emails on later visits (pending link / once a day)');
    const v = tokenFrom(smtp.mails[n0], 'verify'); await call('POST', '/api/verify', { token: v }); const n1 = smtp.mails.length; await call('GET', '/api/me', null, lg.ck); await sleep(500);
    ok(smtp.mails.length === n1, 'verified users are never emailed again'); }
  // ---- legal pages
  const pr = await fetch(S1.base + '/privacy'), tr = await fetch(S1.base + '/terms'); const pt = await pr.text(), tt = await tr.text();
  ok(pr.status === 200 && pt.includes('מדיניות פרטיות') && pt.includes('hello@example.com') && pt.includes('הדר') && !pt.includes('{{'), 'privacy page served with operator and contact filled in');
  ok(tr.status === 200 && tt.includes('תנאי שימוש') && !tt.includes('{{'), 'terms page served');
  S1.p.kill(); smtp.close();
  // ---- SMTP failure never breaks the site
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'dpm2-')); const S2 = mkserver({ SMTP_URL: 'smtp://u:p@127.0.0.1:1', MAIL_FROM: 'a@example.com' }, dir2); await sleep(1000); const c2 = caller(S2.base);
  x = await c2('POST', '/api/register', { email: 'q@x.com', password: 'password123', consent: true }); ok(x.r.status === 200, 'registration succeeds even when the mail server is down');
  x = await c2('POST', '/api/forgot', { email: 'q@x.com' }); ok(x.r.status === 200, 'forgot answers 200 even when the mail server is down'); S2.p.kill();
  // ---- TLS variants (need openssl)
  let haveSsl = true; const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dpt-'));
  try { execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(tdir, 'k.pem'), '-out', path.join(tdir, 'c.pem'), '-subj', '/CN=localhost', '-days', '1'], { stdio: 'ignore' }); } catch { haveSsl = false; }
  if (!haveSsl) console.log('SKIP TLS variants (openssl not available)');
  else {
    const key = fs.readFileSync(path.join(tdir, 'k.pem')), cert = fs.readFileSync(path.join(tdir, 'c.pem'));
    for (const mode of ['implicit', 'starttls']) {
      const sm = await startMockSmtp({ mode, key, cert }); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'dpx-'));
      const S = mkserver({ SMTP_URL: `${mode === 'implicit' ? 'smtps' : 'smtp'}://u:p@localhost:${sm.port}`, MAIL_FROM: 'a@example.com', SMTP_INSECURE_TLS: '1' }, d); await sleep(1000); const c = caller(S.base);
      await c('POST', '/api/register', { email: 't@x.com', password: 'password123', consent: true }); await sleep(900);
      ok(sm.mails.length === 1 && sm.mails[0].secure === true && sm.mails[0].auth && sm.mails[0].auth.user === 'u', `SMTP over ${mode === 'implicit' ? 'implicit TLS (465)' : 'STARTTLS (587)'} works and credentials were sent only inside TLS`);
      S.p.kill(); sm.close();
    }
  }
}
