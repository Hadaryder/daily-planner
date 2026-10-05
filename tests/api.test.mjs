import { spawn } from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { mailTests } from './mail.part.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dp-'));const PORT=3900+Math.floor(Math.random()*90);
const SERVER=fileURLToPath(new URL('../server.mjs',import.meta.url));
const srv=spawn('node',['--no-warnings',SERVER],{env:{...process.env,PORT,DATA_DIR:dir,TRUST_PROXY:''},stdio:['ignore','pipe','pipe']});
srv.stderr.on('data',d=>process.stderr.write(d));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(900);
const base=`http://localhost:${PORT}`;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
function client(){let cookie='';return async(method,p,body,hdr={})=>{const r=await fetch(base+p,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...hdr},body:body!==undefined?JSON.stringify(body):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0].startsWith('dp_sid=;')?'':sc.split(';')[0];let j=null;try{j=await r.json()}catch{}return{status:r.status,j,headers:r.headers}}}
const A=client(),B=client(),C=client(),anon=client();
let r=await anon('GET','/api/health');ok(r.status===200&&r.j.app==='daily-planner','health');
r=await anon('GET','/api/data');ok(r.status===401,'data requires auth');
r=await A('POST','/api/register',{email:'a@x.com',password:'short'});ok(r.status===400&&r.j.error==='weak_password','weak password rejected');
r=await A('POST','/api/register',{email:'a@x.com',password:'password123',consent:true});ok(r.status===200,'register A');
r=await A('POST','/api/register',{email:'a@x.com',password:'password123',consent:true});ok(r.status===409,'duplicate email rejected');
const A2=client();r=await A2('POST','/api/login',{email:'a@x.com',password:'wrong-pass'});ok(r.status===401,'bad login rejected');
r=await A('GET','/api/me');ok(r.status===200&&r.j.user.email==='a@x.com','me after register (cookie session)');
r=await B('POST','/api/register',{email:'b@x.com',password:'password123',consent:true});ok(r.status===200,'register B');
r=await C('POST','/api/register',{email:'c@x.com',password:'password123',consent:true});ok(r.status===200,'register C');
const prof=(n)=>({name:n,birth:'1996-03-14',avatar:null,sticker:'flower',stepsGoal:8000,hidden:[],blocked:[],dismissed:[],noCards:[]});
r=await A('PUT','/api/profile',{profile:prof('דנה')});ok(r.status===200&&/^[A-Z]{3}-\d{3}$/.test(r.j.code),'profile saved, code issued '+(r.j&&r.j.code));const codeA=r.j.code;
r=await B('PUT','/api/profile',{profile:prof('יובל')});const codeB=r.j.code;await C('PUT','/api/profile',{profile:prof('מאיה')});
const day={tasks:[{id:'t',title:'x',done:true}],blocks:[],meals:{},steps:5000,journal:'סוד'};
r=await A('PUT','/api/day',{date:'2026-10-05',data:day,score:87});ok(r.status===200,'day saved');
r=await A('PUT','/api/day',{date:'bad',data:day});ok(r.status===400,'bad date rejected');
r=await A('GET','/api/data');ok(r.j.profile.name==='דנה'&&r.j.days['2026-10-05'].tasks.length===1&&r.j.profile.code===codeA,'data round-trips');
r=await B('GET','/api/data');ok(!r.j.days['2026-10-05'],'B cannot see A data');
// friends
r=await B('POST','/api/friends/add',{code:'ZZZ-999'});ok(r.status===404,'unknown code -> nf');
r=await B('POST','/api/friends/add',{code:codeB});ok(r.status===404,'cannot add self');
r=await B('POST','/api/friends/add',{code:codeA.toLowerCase().replace('-','')});ok(r.status===200&&r.j.name==='דנה','B adds A by code (normalized)');
r=await B('POST','/api/friends/add',{code:codeA});ok(r.status===409,'duplicate add -> dup');
r=await A('GET','/api/social');ok(r.j.incoming.length===1&&r.j.friends.length===0,'A sees incoming request only');
r=await B('GET','/api/social');ok(r.j.outgoing.length===1&&r.j.friends.length===0,'B shows pending outgoing');
r=await A('GET','/api/social');const bId=r.j.incoming[0].id;
r=await A('POST','/api/postcards',{to:[bId],note:'לפני אישור'});ok(r.status===400,'cannot send postcard before friendship is mutual');
r=await A('POST','/api/friends/accept',{id:bId});ok(r.status===200,'A accepts');
r=await A('GET','/api/social');ok(r.j.friends.length===1&&r.j.friends[0].name==='יובל','mutual friendship established');
r=await B('GET','/api/social');const f=r.j.friends[0];ok(f.name==='דנה'&&f.scores['2026-10-05']===87&&!JSON.stringify(r.j).includes('סוד'),'B sees A score but never A journal/tasks');
// hidden day
await A('PUT','/api/profile',{profile:{...prof('דנה'),hidden:['2026-10-05']}});r=await B('GET','/api/social');ok(r.j.friends[0].scores['2026-10-05']===undefined,'hidden day excluded from friend view');
// non-friend C cannot see anything
r=await C('GET','/api/social');ok(r.j.friends.length===0&&!JSON.stringify(r.j).includes('דנה'),'stranger C sees nothing');
r=await C('POST','/api/postcards',{to:[bId],note:'ספאם'});ok(r.status===400,'stranger cannot send postcards');
// postcards
r=await A('POST','/api/postcards',{to:[bId],note:'איזה יום!',sticker:'star',photo:'data:image/jpeg;base64,/9j/4AAQ'});ok(r.status===200,'postcard sent');
r=await B('GET','/api/social');ok(r.j.cardsIn.length===1&&r.j.cardsIn[0].note==='איזה יום!','B receives postcard');
r=await A('GET','/api/social');ok(r.j.cardsOut.length===1&&r.j.cardsOut[0].to[0]===bId,'A sees sent postcard');
r=await C('GET','/api/social');ok(r.j.cardsIn.length===0,'C does not get it');
// B blocks postcards from A
const aId=(await B('GET','/api/social')).j.friends[0].id;await B('PUT','/api/profile',{profile:{...prof('יובל'),noCards:[aId]}});r=await B('GET','/api/social');ok(r.j.cardsIn.length===0,'noCards filter hides postcards');
// CSRF / origin
r=await A('POST','/api/friends/remove',{id:'999'},{origin:'https://evil.example'});ok(r.status===403,'cross-origin POST rejected');
// AI without key
r=await A('POST','/api/estimate',{text:'שניצל'});ok(r.status===503&&r.j.error==='ai_unavailable','AI endpoint degrades cleanly without key');
// remove friend breaks mutual
r=await B('POST','/api/friends/remove',{id:aId});r=await A('GET','/api/social');ok(r.j.friends.length===0,'unfriend breaks mutual view');
// export + delete
r=await A('GET','/api/export');ok(r.status===200&&r.j.days['2026-10-05'],'export works');
r=await A('POST','/api/account/delete',{password:'nope'});ok(r.status===403,'delete needs password');
r=await A('POST','/api/account/delete',{password:'password123'});ok(r.status===200,'account deleted');
r=await A('GET','/api/me');ok(r.status===401,'session gone after delete');
// static + headers
const h=await fetch(base+'/');ok(h.status===200&&h.headers.get('content-security-policy')&&(await h.text()).includes('היום שלי'),'serves app with CSP');
// rate limit login
let limited=false;for(let i=0;i<14;i++){const x=await client()('POST','/api/login',{email:'z@x.com',password:'whatever1'});if(x.status===429)limited=true}ok(limited,'login rate limiting');

// ---------- data safety: restart keeps data and takes a safety backup ----------
{
  const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'dps-'));const P2=3900+Math.floor(Math.random()*90);
  const start=()=>spawn('node',['--no-warnings',SERVER],{env:{...process.env,PORT:P2,DATA_DIR:dir2,TRUST_PROXY:''},stdio:['ignore','pipe','pipe']});
  let s1=start();await sleep(900);const U=client();
  const base2=`http://localhost:${P2}`;
  const call=async(m,p,b,cookie)=>{const r=await fetch(base2+p,{method:m,headers:{...(b?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:b?JSON.stringify(b):undefined});return{r,j:await r.json().catch(()=>null)}};
  let x=await call('POST','/api/register',{email:'keep@x.com',password:'password123',consent:true});const ck=x.r.headers.get('set-cookie').split(';')[0];
  await call('PUT','/api/profile',{profile:{name:'נשארת',hidden:[],blocked:[],dismissed:[],noCards:[]}},ck);
  await call('PUT','/api/day',{date:'2026-10-05',data:{tasks:[{id:'1',title:'חשוב',done:true}],blocks:[],meals:{},steps:1,journal:''},score:50},ck);
  s1.kill();await sleep(400);
  const s2=start();await sleep(1200);
  x=await call('GET','/api/data',null,ck);ok(x.j&&x.j.profile.name==='נשארת'&&x.j.days['2026-10-05'].tasks[0].title==='חשוב','data survives a server restart (new deploy)');
  const bdir=path.join(dir2,'backups');const files=fs.existsSync(bdir)?fs.readdirSync(bdir).filter(f=>f.startsWith('boot-')):[];
  ok(files.length>=1,'safety backup created on boot: '+files[0]);
  const {DatabaseSync}=await import('node:sqlite');const bk=new DatabaseSync(path.join(bdir,files[0]));
  ok(bk.prepare('SELECT count(*) c FROM users').get().c===1&&bk.prepare('SELECT count(*) c FROM days').get().c===1,'the backup file really contains the users and days');bk.close();
  s2.kill();
}

// ---------- restore from backup (RESTORE_FROM) ----------
{
  const dir3=fs.mkdtempSync(path.join(os.tmpdir(),'dpr-'));const P3=3900+Math.floor(Math.random()*90);
  const start3=(env={})=>spawn('node',['--no-warnings',SERVER],{env:{...process.env,PORT:P3,DATA_DIR:dir3,TRUST_PROXY:'',...env},stdio:['ignore','pipe','pipe']});
  const b3=`http://localhost:${P3}`;
  const call3=async(m,p,b,cookie)=>{const r=await fetch(b3+p,{method:m,headers:{...(b?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:b?JSON.stringify(b):undefined});return{r,j:await r.json().catch(()=>null)}};
  let p3=start3();await sleep(900);
  const reg=async(e)=>{const x=await call3('POST','/api/register',{email:e,password:'password123',consent:true});return x.r.headers.get('set-cookie').split(';')[0]};
  const ckA=await reg('first@x.com');
  // manual backup while running (the tool operators use)
  await new Promise(r=>spawn('node',['--no-warnings',fileURLToPath(new URL('../backup.mjs',import.meta.url)),path.join(dir3,'good.db')],{env:{...process.env,DATA_DIR:dir3}}).on('exit',r));
  const ckB=await reg('second@x.com'); // added AFTER the backup
  p3.kill();await sleep(400);
  p3=start3({RESTORE_FROM:path.join(dir3,'good.db')});await sleep(1300);
  let me=await call3('GET','/api/me',null,ckA);const meB=await call3('GET','/api/me',null,ckB);
  ok(me.r.status===200&&meB.r.status===401,'restore: state returned to the backup (first user kept, later user gone)');
  const pre=fs.readdirSync(path.join(dir3,'backups')).filter(f=>f.startsWith('pre-restore-'));
  ok(pre.length===1,'restore: current state saved to pre-restore backup first');
  p3.kill();await sleep(400);
  const ckC=await (async()=>{p3=start3({RESTORE_FROM:path.join(dir3,'good.db')});await sleep(1000);return reg('third@x.com')})();
  p3.kill();await sleep(400);
  p3=start3({RESTORE_FROM:path.join(dir3,'good.db')});await sleep(1200);
  me=await call3('GET','/api/me',null,ckC);ok(me.r.status===200,'restore runs only once: new data is NOT wiped by later restarts with the same variable');
  p3.kill();
  const bad=start3({RESTORE_FROM:'does-not-exist.db'});await sleep(1000);const h=await fetch(b3+'/api/health').catch(()=>null);ok(h&&h.status===200,'restore with a missing file never takes the site down');bad.kill();
}

// ---------- no mail configured: features degrade cleanly ----------
r=await anon('POST','/api/forgot',{email:'a@x.com'});ok(r.status===501&&r.j.error==='mail_disabled','without SMTP: forgot password answers mail_disabled (no crash)');
r=await anon('GET','/api/health');ok(r.j.mail===false,'without SMTP: health reports mail disabled');
// ---------- mail, verification, reset, consent, legal pages ----------
await mailTests({ ok, sleep, SERVER, spawn, fs, os, path, DatabaseSync });

// ---------- upgrade from a database created by an OLDER version (schema without the new columns) ----------
{
  const crypto2=await import('node:crypto');const dirL=fs.mkdtempSync(path.join(os.tmpdir(),'dpl-'));const PL=3900+Math.floor(Math.random()*90);
  const old=new DatabaseSync(path.join(dirL,'planner.db'));
  old.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE TABLE profiles(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, json TEXT NOT NULL, code TEXT UNIQUE NOT NULL, updated INTEGER);
  CREATE TABLE days(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, json TEXT NOT NULL, score INTEGER, updated INTEGER, PRIMARY KEY(user_id,date));`);
  const salt=crypto2.randomBytes(16);const hash=salt.toString('hex')+':'+crypto2.scryptSync('password123',salt,64).toString('hex');
  old.prepare('INSERT INTO users(email,pass,created) VALUES (?,?,?)').run('legacy@x.com',hash,Date.now());
  old.prepare('INSERT INTO profiles(user_id,json,code,updated) VALUES (1,?,?,?)').run(JSON.stringify({name:'ותיק',hidden:[],blocked:[],dismissed:[],noCards:[]}),'OLD-123',Date.now());
  old.prepare('INSERT INTO days(user_id,date,json,score,updated) VALUES (1,?,?,?,?)').run('2026-10-05',JSON.stringify({tasks:[{id:'1',title:'לא הולך לאיבוד',done:true}],blocks:[],meals:{},steps:1,journal:''}),50,Date.now());
  old.close();
  const sL=spawn('node',['--no-warnings',SERVER],{env:{...process.env,PORT:PL,DATA_DIR:dirL,TRUST_PROXY:''},stdio:['ignore','pipe','pipe']});sL.stderr.on('data',()=>{});await sleep(1300);
  const bL=`http://localhost:${PL}`;let rr=await fetch(bL+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'legacy@x.com',password:'password123'})});const ckL=rr.headers.get('set-cookie').split(';')[0];const jj=await rr.json();
  ok(rr.status===200&&jj.user.verified===false&&jj.needsConsent===true,'legacy database: old account logs in after the upgrade and is asked to accept the new documents');
  rr=await fetch(bL+'/api/data',{headers:{cookie:ckL}});const dd=await rr.json();ok(dd.profile.name==='ותיק'&&dd.days['2026-10-05'].tasks[0].title==='לא הולך לאיבוד','legacy database: all old data intact after the schema upgrade');
  ok(fs.readdirSync(path.join(dirL,'backups')).some(f=>f.startsWith('boot-')),'legacy database: a safety backup was taken before upgrading the schema');
  sL.kill();
}
srv.kill();console.log(fails?'FAILS '+fails:'ALL PASS');process.exit(fails?1:0);
