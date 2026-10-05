import { spawn } from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
r=await A('POST','/api/register',{email:'a@x.com',password:'password123'});ok(r.status===200,'register A');
r=await A('POST','/api/register',{email:'a@x.com',password:'password123'});ok(r.status===409,'duplicate email rejected');
const A2=client();r=await A2('POST','/api/login',{email:'a@x.com',password:'wrong-pass'});ok(r.status===401,'bad login rejected');
r=await A('GET','/api/me');ok(r.status===200&&r.j.user.email==='a@x.com','me after register (cookie session)');
r=await B('POST','/api/register',{email:'b@x.com',password:'password123'});ok(r.status===200,'register B');
r=await C('POST','/api/register',{email:'c@x.com',password:'password123'});ok(r.status===200,'register C');
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
  let x=await call('POST','/api/register',{email:'keep@x.com',password:'password123'});const ck=x.r.headers.get('set-cookie').split(';')[0];
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
  const reg=async(e)=>{const x=await call3('POST','/api/register',{email:e,password:'password123'});return x.r.headers.get('set-cookie').split(';')[0]};
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
srv.kill();console.log(fails?'FAILS '+fails:'ALL PASS');process.exit(fails?1:0);
