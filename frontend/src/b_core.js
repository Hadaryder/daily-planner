const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const HDAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const HMON=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const WD=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const pdate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const todayStr=()=>dstr(new Date());
const addDays=(s,n)=>{const d=pdate(s);d.setDate(d.getDate()+n);return dstr(d)};
const longDate=s=>{const d=pdate(s);return `יום ${HDAYS[d.getDay()]}, ${d.getDate()} ב${HMON[d.getMonth()]}`};
const shortDate=s=>{const d=pdate(s);return `${d.getDate()} ב${HMON[d.getMonth()].slice(0,3)}׳`};
const fmtNum=n=>Number(n||0).toLocaleString('en-US');
const MEALS=[['breakfast','ארוחת בוקר'],['lunch','ארוחת צהריים'],['dinner','ארוחת ערב'],['snack','נשנושים']];
const MEAL_SHORT={breakfast:'בוקר',lunch:'צהריים',dinner:'ערב',snack:'נשנושים'};
const S={profile:null,days:{},ready:false,mode:'local',uid:null,route:{name:'',a:'',b:''},popup:null,menu:null,cal:null,ui:{},dbfail:false,setup:null};
const emptyDay=()=>({tasks:[],blocks:[],meals:{breakfast:{plan:'',actual:null},lunch:{plan:'',actual:null},dinner:{plan:'',actual:null},snack:{plan:'',actual:null}},steps:0,journal:''});
const plain=x=>x==null?x:JSON.parse(JSON.stringify(x));
function normDay(d0){const e=emptyDay();if(!d0)return e;const d=plain(d0);return{tasks:Array.isArray(d.tasks)?d.tasks:[],blocks:Array.isArray(d.blocks)?d.blocks:[],meals:Object.assign(e.meals,d.meals||{}),steps:+d.steps||0,journal:d.journal||''}}
const dayOf=s=>S.days[s]||emptyDay();
const ensureDay=s=>{if(!S.days[s])S.days[s]=emptyDay();return S.days[s]};
const goal=()=>(S.profile&&+S.profile.stepsGoal)||0;
/* ---------- score ---------- */
function calc(day,g){
  const parts=[];const t=day.tasks||[];
  if(t.length){const d=t.filter(x=>x.done).length;parts.push({k:'tasks',name:'משימות',w:30,f:d/t.length,a:d,b:t.length})}
  const b=day.blocks||[];
  if(b.length){const d=b.filter(x=>x.status==='done').length;parts.push({k:'schedule',name:'לו״ז',w:30,f:d/b.length,a:d,b:b.length})}
  const pl=Object.values(day.meals||{}).filter(m=>m.plan&&m.plan.trim());
  if(pl.length){const d=pl.filter(m=>m.actual&&m.actual.followed).length;parts.push({k:'food',name:'אוכל',w:20,f:d/pl.length,a:d,b:pl.length})}
  const st=day.steps||0;
  if(g>0&&(st>0||parts.length))parts.push({k:'steps',name:'צעדים',w:20,f:Math.min(1,st/g),a:st,b:g});
  if(!parts.length)return{score:null,parts};
  const W=parts.reduce((s,p)=>s+p.w,0);
  parts.forEach(p=>{p.share=Math.round(100*p.w/W);p.pts=Math.round(100*p.w/W*p.f)});
  return{score:Math.round(100*parts.reduce((s,p)=>s+p.w*p.f,0)/W),parts};
}
const tierOf=s=>s==null?'none':s>=85?'great':s>=60?'good':'soft';
const PRAISE={great:'יום מעולה!',good:'יום טוב!',soft:'מחר עוד יום',none:'מתחילים?'};
const praise=(score)=>score===100?'יום מושלם!':PRAISE[tierOf(score)];
const scoreOf=s=>S.days[s]?calc(S.days[s],goal()).score:null;
function streak(){let n=0,s=todayStr();const t=scoreOf(s);if(t!=null&&t>=60)n++;s=addDays(s,-1);for(let i=0;i<4000;i++){const v=scoreOf(s);if(v!=null&&v>=60){n++;s=addDays(s,-1)}else break}return n}
function monthStats(y,m){const n=new Date(y,m+1,0).getDate();let sum=0,c=0,best=null,bd=null,great=0,good=0,soft=0,emp=0,perfect=0;for(let d=1;d<=n;d++){const s=`${y}-${pad2(m+1)}-${pad2(d)}`;if(s>todayStr())continue;const v=scoreOf(s);if(v==null){emp++;continue}if(v===100)perfect++;sum+=v;c++;if(best==null||v>best){best=v;bd=s}const t=tierOf(v);if(t==='great')great++;else if(t==='good')good++;else soft++}return{avg:c?Math.round(sum/c):null,best,bd,great,good,soft,emp,perfect,count:c}}
/* ---------- storage ---------- */
const Store={db:null,uid:null,tm:{},ver:{},pending:{},
  ls(){try{return window.localStorage}catch(e){return null}},
  readLocal(){const l=this.ls();if(!l)return null;try{return JSON.parse(l.getItem('dp1')||'null')}catch(e){return null}},
  loadLocal(){const j=this.readLocal();if(j){S.profile=j.profile||null;S.days={};for(const k in j.days||{})S.days[k]=normDay(j.days[k])}},
  saveLocal(){if(S.mode==='api')return;const l=this.ls();if(!l)return;try{l.setItem('dp1',JSON.stringify({profile:S.profile,days:S.days}))}catch(e){}},
  async initDb(){
    try{
      if(!window.claude||!window.claude.use)return false;
      const to=new Promise(r=>setTimeout(()=>r(null),6000));
      const got=await Promise.race([Promise.all([window.claude.use('user'),window.claude.use('db')]),to]);
      if(!got)return false;const [user,db]=got;if(!user||!db)return false;
      const id=await user.id();if(!id)return false;
      this.db=db;this.uid=id;S.uid=id;S.mode='db';return true;
    }catch(e){return false}
  },
  loadDb(){
    return new Promise(res=>{
      let first=true;
      const done=()=>{if(first){first=false;res()}};
      try{
        this.db.collection('data/users/'+this.uid).onSnapshot(snap=>{
          let changed=false;
          snap.docs.forEach(d=>{
            if(!d.exists)return;const data=d.data();if(!data)return;
            if(d.id==='profile'){if(!this.pending.profile&&JSON.stringify(S.profile)!==JSON.stringify(data)){S.profile=plain(data);changed=true}}
            else if(d.id.startsWith('d-')){const k=d.id.slice(2);if(!this.pending[d.id]){const nd=normDay(data);if(JSON.stringify(S.days[k])!==JSON.stringify(nd)){S.days[k]=nd;changed=true}}}
          });
          if(first){done()}else if(changed){this.saveLocal();softRender()}
        },()=>{S.dbfail=true;done()});
      }catch(e){S.dbfail=true;done()}
      setTimeout(done,8000);
    });
  },
  async init(){
    this.loadLocal();const localCopy={profile:S.profile,days:S.days};
    if(!(window.claude&&window.claude.use)){
      const h=await Api.health();
      if(h){S.apiAvail=true;S.signup=h.signup;S.mail=!!h.mail;const l=this.ls();const guest=!!(l&&l.getItem('dp_guest')==='1');let me=null;try{me=await Api.get('/api/me')}catch(e){}
        if(me&&me.user){S.user=me.user;S.needsConsent=!!me.needsConsent;S.mail=!!me.mail;S.mode='api';S.profile=null;S.days={};await this.loadApi(guest?localCopy:null)}
        else if(guest&&localCopy.profile){S.mode='local';S.guest=true}
        else{S.mode='api';S.profile=null;S.days={}}
      }
      return;
    }
    const ok=await this.initDb();
    if(ok){
      S.profile=null;S.days={};
      await this.loadDb();
      if(!S.profile&&localCopy.profile){S.profile=localCopy.profile;S.days=localCopy.days;this.saveProfile();for(const k in S.days)this.saveDay(k)}
      else this.saveLocal();
    }
  },
  makers:{},tries:{},
  queue(key,make){
    this.saveLocal();
    if(S.mode==='api'){
      this.makers[key]=make;this.pending[key]=true;const v=(this.ver[key]||0)+1;this.ver[key]=v;clearTimeout(this.tm[key]);
      this.tm[key]=setTimeout(async()=>{
        try{const x=make();await Api.call(x.method,x.path,x.body);if(key==='profile'&&0){}S.dbfail=false;this.tries[key]=0;delete this.makers[key]}
        catch(e){if(e.status===401)return;this.tries[key]=(this.tries[key]||0)+1;if(!S.dbfail){S.dbfail=true;toast('השמירה בשרת נכשלה. ננסה שוב')}if(this.tries[key]<8)setTimeout(()=>{if(this.ver[key]===v)this.queue(key,make)},4000*this.tries[key])}
        finally{if(this.ver[key]===v)delete this.pending[key]}
      },500);return;
    }
    if(S.mode!=='db'||!this.db)return;
    this.pending[key]=true;const v=(this.ver[key]||0)+1;this.ver[key]=v;clearTimeout(this.tm[key]);
    this.tm[key]=setTimeout(async()=>{
      try{const x=make();await this.db.doc(x.path).set(JSON.parse(JSON.stringify(x.data)));S.dbfail=false}
      catch(e){if(!S.dbfail){S.dbfail=true;toast('השמירה בענן לא זמינה — הנתונים נשמרים במכשיר הזה')}}
      finally{if(this.ver[key]===v)delete this.pending[key]}
    },700);
  },
  saveDay(s){if(S.mode==='api')this.queue('d-'+s,()=>({method:'PUT',path:'/api/day',body:{date:s,data:S.days[s],score:calc(S.days[s],goal()).score}}));else this.queue('d-'+s,()=>({path:`data/users/${this.uid}/d-${s}`,data:S.days[s]}));if(typeof Social!=='undefined')Social.touch()},
  saveProfile(){if(S.mode==='api')this.queue('profile',()=>({method:'PUT',path:'/api/profile',body:{profile:S.profile}}));else this.queue('profile',()=>({path:`data/users/${this.uid}/profile`,data:S.profile}));if(typeof Social!=='undefined')Social.touch()},
  flush(){if(S.mode!=='api')return;for(const k of Object.keys(this.makers)){try{const x=this.makers[k]();Api.call(x.method,x.path,x.body,{keepalive:true}).catch(()=>{})}catch(e){}}},
};
/* ---------- helpers ---------- */
let toastT=null;
function toast(msg){const t=$('#toast');if(!t)return;t.innerHTML=`<span>${esc(msg)}</span>`;clearTimeout(toastT);toastT=setTimeout(()=>{t.innerHTML=''},2600)}
async function copyText(txt){try{await navigator.clipboard.writeText(txt);return true}catch(e){}
  try{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}}
function resizeImage(file,max=640,q=.72){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(new Error('read'));fr.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error('img'));im.onload=()=>{let w=im.width,h=im.height;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);let url=c.toDataURL('image/jpeg',q);if(url.length>170000)url=c.toDataURL('image/jpeg',.5);res(url)};im.src=fr.result};fr.readAsDataURL(file)})}
function genCode(){const L='ABCDEFGHJKLMNPQRSTUVWXYZ',D='23456789';let a='';for(let i=0;i<3;i++)a+=L[Math.floor(Math.random()*L.length)];let b='';for(let i=0;i<3;i++)b+=D[Math.floor(Math.random()*D.length)];return a+'-'+b}
function whatsapp(text){const u='https://wa.me/?text='+encodeURIComponent(text);try{const w=window.open(u,'_blank','noopener');if(!w)throw 0}catch(e){copyText(text).then(()=>toast('הטקסט הועתק — אפשר להדביק בוואטסאפ'))}}
/* ---------- routing / render ---------- */
const PAGES={};const ACT={};const INP={};const SUB={};const POP={};
function parseRoute(){const h=location.hash.replace(/^#\/?/,'').split('/');S.route={name:h[0]||'',a:decodeURIComponent(h[1]||''),b:h[2]||''}}
function go(p){const t='#/'+p;if(location.hash===t)render(true);else location.hash=t}
function render(keep){
  parseRoute();const app=$('#app');if(!app)return;
  if(!S.ready){app.innerHTML='<div class="splash">היום שלי…</div>';return}
  const r=S.route.name;
  if(S.mode==='api'){if(!S.user&&!['welcome','join','reset','verify'].includes(r))return go('welcome');if(S.user&&!S.profile&&!['setup','reset','verify'].includes(r))return go('setup')}
  if(!S.profile&&!['welcome','setup','join','reset','verify'].includes(r)){return go('welcome')}
  if(S.profile&&(r===''||r==='welcome'||(r==='setup'&&!S.ui.editSetup)))return go('today');
  const y=window.scrollY;
  const fn=PAGES[r]||PAGES.today;let html='';
  try{html=fn(S.route)}catch(e){console.error(e);html=`<div class="page"><div class="note">אופס, משהו השתבש בטעינת המסך. <button class="btn sm" data-act="reload">נסו שוב</button></div></div>`}
  const showNav=S.profile&&!['welcome','setup','reset','verify'].includes(r);
  app.innerHTML=(showNav?navHtml(r):'')+html;
  closeMenu();afterRender();
  if(S.mode==='api'&&S.user&&S.needsConsent&&!S.popup)setTimeout(()=>{if(S.needsConsent&&!S.popup)openPopup('consent')},0);
  if(S.mode==='api'&&Social.on&&['friends','friend','postcards','zine'].includes(r)&&Date.now()-Social.last>6000)Social.refresh();
  window.scrollTo(0,keep?y:0);
}
function softRender(){const a=document.activeElement;if(S.popup||S.menu||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&$('#app').contains(a)))return;if(Date.now()-lastDown<1500){clearTimeout(softT);softT=setTimeout(softRender,1600);return}render(true)}
function afterRender(){if(typeof checkCelebrate==='function')setTimeout(checkCelebrate,0);$$('textarea[data-auto]').forEach(t=>{t.style.height='auto';t.style.height=Math.max(t.scrollHeight,56)+'px'});const f=$('[data-focus]');if(f){f.focus();if(f.select&&f.dataset.focus==='sel')f.select()}}
/* ---------- popups & menus ---------- */
function openPopup(type,d){S.popup={type,d:d||{}};renderPopup()}
function renderPopup(){const el=$('#popup');if(!el)return;if(!S.popup){el.innerHTML='';return}
  const p=POP[S.popup.type];if(!p){el.innerHTML='';return}
  el.innerHTML=`<div class="scrim" ${p.locked?'':'data-act="scrim"'}><div class="dlg ${p.cls||''}" role="dialog" aria-modal="true" aria-label="${esc(p.label||'')}">${p.render(S.popup.d)}</div></div>`;
  const f=$('#popup [data-focus]');if(f){f.focus();if(f.dataset.focus==='sel'&&f.select)f.select()}
  if(p.after){try{p.after(S.popup.d)}catch(e){}}}
function closePopup(){if(!S.popup)return;S.popup=null;const el=$('#popup');if(el)el.innerHTML=''}
function openMenu(items,el){closeMenu();const r=el.getBoundingClientRect();const w=230;let left=Math.min(Math.max(8,r.left),window.innerWidth-w-8);let top=r.bottom+6;if(top+items.length*46>window.innerHeight)top=Math.max(8,r.top-items.length*46-6);
  const m=$('#menu');m.innerHTML=`<div class="menu" style="left:${left}px;top:${top}px">${items.map(i=>`<button class="${i.red?'red':''}" data-act="${i.act}" ${Object.entries(i.data||{}).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${ico(i.ic,20)}<span>${esc(i.t)}</span></button>`).join('')}</div>`;S.menu=true}
function closeMenu(){if(!S.menu)return;S.menu=false;const m=$('#menu');if(m)m.innerHTML=''}
document.addEventListener('click',e=>{
  if(S.menu&&!e.target.closest('.menu')&&!e.target.closest('[data-menu]'))closeMenu();
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='scrim'){if(e.target===el)closePopup();return}
  if(el.tagName==='A')e.preventDefault();
  const fn=ACT[a];if(fn){try{const r=fn(el,e);if(r&&r.catch)r.catch(err=>{console.error(err);toast('שגיאה: '+(err&&err.message||'לא ידועה'))})}catch(err){console.error(err);toast('שגיאה: '+(err&&err.message||'לא ידועה'))}}
});
document.addEventListener('input',e=>{const el=e.target.closest('[data-in]');if(el&&INP[el.dataset.in]){try{INP[el.dataset.in](el,e)}catch(err){console.error(err)}}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-ch]');if(el&&INP[el.dataset.ch]){try{INP[el.dataset.ch](el,e)}catch(err){console.error(err)}}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-submit]');if(f){e.preventDefault();const fn=SUB[f.dataset.submit];if(fn){try{fn(f,e)}catch(err){console.error(err)}}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.menu)closeMenu();else if(!(S.popup&&POP[S.popup.type]&&POP[S.popup.type].locked))closePopup()}});
window.addEventListener('hashchange',()=>{closePopup();render(false)});
const VERSION='1.8.0';
async function saveFile(filename,blob){try{const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(dl){await dl.save({filename,data:blob});return true}}catch(e){if(e&&e.code==='cancelled')return false}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return true}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')Store.flush()});window.addEventListener('pagehide',()=>Store.flush());
window.addEventListener('error',e=>{try{toast('שגיאה: '+(e.message||'לא ידועה'))}catch(_){}});window.addEventListener('unhandledrejection',e=>{try{toast('שגיאה: '+((e.reason&&e.reason.message)||'לא ידועה'))}catch(_){}});
ACT.reload=()=>location.reload();
ACT.submit=el=>{const f=el.closest('[data-submit]');if(f&&SUB[f.dataset.submit]){try{SUB[f.dataset.submit](f)}catch(err){console.error(err)}}};
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.isComposing||e.shiftKey)return;const t=e.target;if(!t||t.tagName!=='INPUT'||/^(button|checkbox|radio|file)$/.test(t.type))return;const f=t.closest('[data-submit]');if(f&&SUB[f.dataset.submit]){e.preventDefault();try{SUB[f.dataset.submit](f)}catch(err){console.error(err)}}});
let lastDown=0,softT=null;document.addEventListener('pointerdown',()=>{lastDown=Date.now()},true);document.addEventListener('keydown',()=>{lastDown=Date.now()},true);
