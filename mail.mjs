// שליחת מיילים ב-SMTP בלי תלויות. תומך ב-SMTPS (פורט 465) וב-STARTTLS (587), עם AUTH PLAIN/LOGIN.
// SMTP_URL לדוגמה:  smtps://resend:API_KEY@smtp.resend.com:465   או   smtp://user:pass@host:587
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const isLocal = h => /^(localhost|127\.|\[?::1\]?$)/.test(h);
export function mailConfig(env = process.env) {
  if (!env.SMTP_URL || !env.MAIL_FROM) return null;
  try { const url = new URL(env.SMTP_URL); if (!/^smtps?:$/.test(url.protocol)) return null; return { url, from: env.MAIL_FROM, insecureTls: env.SMTP_INSECURE_TLS === '1' }; } catch { return null; }
}
const clean = s => String(s).replace(/[\r\n]+/g, ' ').trim();
const b64lines = s => Buffer.from(s, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n');
const encHeader = s => (/^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=');
const addrOf = s => { const m = String(s).match(/<([^>]+)>\s*$/); return clean(m ? m[1] : s); };
function fromHeader(from) { const m = String(from).match(/^(.*)<([^>]+)>\s*$/); const name = m ? clean(m[1]).replace(/"/g, '') : ''; return name ? `${encHeader(name)} <${clean(m[2])}>` : `<${addrOf(from)}>`; }
export function buildMessage({ from, to, subject, text, html }) {
  const boundary = '=_dp_' + crypto.randomBytes(12).toString('hex');
  const dom = addrOf(from).split('@')[1] || 'localhost';
  const head = [`From: ${fromHeader(from)}`, `To: <${addrOf(to)}>`, `Subject: ${encHeader(clean(subject))}`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${dom}>`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`].join('\r\n');
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64lines(body)}`;
  return head + '\r\n\r\n' + part('text/plain', text) + part('text/html', html) + `--${boundary}--\r\n`;
}
function reader(sock) {
  let buf = '', lines = [], err = null; const replies = [], waiters = [];
  sock.setEncoding('utf8');
  const onData = d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); lines.push(line); if (/^\d{3}( |$)/.test(line)) { const r = { code: +line.slice(0, 3), text: lines.join('\n') }; lines = []; const w = waiters.shift(); if (w) w.resolve(r); else replies.push(r); } } };
  const onErr = e => { err = err || e; while (waiters.length) waiters.shift().reject(err); };
  sock.on('data', onData); sock.on('error', onErr); sock.on('close', () => onErr(new Error('smtp connection closed')));
  return { read: () => replies.length ? Promise.resolve(replies.shift()) : err ? Promise.reject(err) : new Promise((resolve, reject) => waiters.push({ resolve, reject })), detach: () => sock.off('data', onData) };
}
export async function sendMail(cfg, msg) {
  const u = cfg.url, implicit = u.protocol === 'smtps:', host = u.hostname, port = +u.port || (implicit ? 465 : 587);
  const user = decodeURIComponent(u.username), pass = decodeURIComponent(u.password), reject = !cfg.insecureTls;
  if (!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]{2,}$/.test(addrOf(msg.to))) throw new Error('bad recipient');
  let sock = implicit ? tls.connect({ host, port, servername: host, rejectUnauthorized: reject }) : net.connect({ host, port });
  const timer = setTimeout(() => sock.destroy(new Error('smtp timeout')), 25000);
  try {
    let rd = reader(sock); const send = l => sock.write(l + '\r\n');
    const expect = async (codes, why) => { const r = await rd.read(); if (!codes.includes(r.code)) throw new Error(`smtp ${why}: ${r.text.slice(0, 160)}`); return r; };
    await expect([220], 'greeting'); send('EHLO planner'); let ehlo = await expect([250], 'ehlo');
    if (!implicit) {
      if (/STARTTLS/i.test(ehlo.text)) {
        send('STARTTLS'); await expect([220], 'starttls'); rd.detach();
        const raw = sock; sock = tls.connect({ socket: raw, servername: host, rejectUnauthorized: reject });
        await new Promise((ok, no) => { sock.once('secureConnect', ok); sock.once('error', no); });
        rd = reader(sock); send('EHLO planner'); ehlo = await expect([250], 'ehlo2');
      } else if (!isLocal(host)) throw new Error('smtp: server does not offer STARTTLS, refusing to send credentials in clear');
    }
    if (user) {
      if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) { send('AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`).toString('base64')); await expect([235], 'auth'); }
      else { send('AUTH LOGIN'); await expect([334], 'auth'); send(Buffer.from(user).toString('base64')); await expect([334], 'auth'); send(Buffer.from(pass).toString('base64')); await expect([235], 'auth'); }
    }
    send(`MAIL FROM:<${addrOf(cfg.from)}>`); await expect([250], 'mail from');
    send(`RCPT TO:<${addrOf(msg.to)}>`); await expect([250, 251], 'rcpt');
    send('DATA'); await expect([354], 'data');
    sock.write(buildMessage({ ...msg, from: cfg.from }) + '\r\n.\r\n'); await expect([250], 'send');
    send('QUIT');
  } finally { clearTimeout(timer); sock.destroy(); }
}
