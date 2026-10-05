const ago=ts=>{const m=Math.round((Date.now()-ts)/60000);if(m<1)return 'עכשיו';if(m<60)return `לפני ${m} דקות`;const h=Math.round(m/60);if(h<24)return h===1?'לפני שעה':`לפני ${h} שעות`;const d=Math.round(h/24);return d===1?'אתמול':`לפני ${d} ימים`};
const SocialDb={on:false,profiles:{},links:{},pcIn:{},pcOut:[],pcSubs:{},timer:null,lastPub:'',err:false,
  me(){return S.uid},
  async init(){
    if(S.mode!=='db'||!Store.db)return;this.on=true;const db=Store.db;const me=S.uid;
    try{
      db.collection('profiles').onSnapshot(sn=>{const o={};sn.docs.forEach(d=>{if(d.exists)o[d.id]=d.data()});this.profiles=o;this.changed()},()=>{this.err=true});
      db.collection('links').onSnapshot(sn=>{const o={};sn.docs.forEach(d=>{if(d.exists)o[d.id]=d.data()});this.links=o;this.syncCards();this.changed()},()=>{this.err=true});
      db.collection('postcards/'+me+'/sent').onSnapshot(sn=>{this.pcOut=sn.docs.filter(d=>d.exists).map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>(b.at||0)-(a.at||0));this.changed()},()=>{});
    }catch(e){this.on=false}
    this.touch(true);
  },
  changed(){if(['friends','friend','postcards','zine'].includes(S.route.name))softRender()},
  mine(){const l=this.links[this.me()];return(l&&l.with)||[]},
  friendIds(){const me=this.me();const bl=(S.profile&&S.profile.blocked)||[];return this.mine().filter(u=>u!==me&&!bl.includes(u)&&((this.links[u]&&this.links[u].with)||[]).includes(me))},
  incoming(){const me=this.me(),mine=this.mine(),bl=((S.profile&&S.profile.blocked)||[]).concat((S.profile&&S.profile.dismissed)||[]);return Object.keys(this.links).filter(u=>u!==me&&!bl.includes(u)&&!mine.includes(u)&&(this.links[u].with||[]).includes(me)&&this.profiles[u])},
  outgoing(){const f=this.friendIds();return this.mine().filter(u=>!f.includes(u)&&this.profiles[u])},
  syncCards(){
    const db=Store.db;if(!db)return;const me=this.me();const f=this.friendIds();
    for(const u of f){if(this.pcSubs[u])continue;try{this.pcSubs[u]=db.collection('postcards/'+u+'/sent').where('to','array-contains',me).onSnapshot(sn=>{this.pcIn[u]=sn.docs.filter(d=>d.exists).map(d=>Object.assign({id:d.id,from:u},d.data()));this.changed()},()=>{})}catch(e){}}
    for(const u of Object.keys(this.pcSubs)){if(!f.includes(u)){try{this.pcSubs[u]()}catch(e){}delete this.pcSubs[u];delete this.pcIn[u]}}
  },
  cardsIn(){const nc=(S.profile&&S.profile.noCards)||[];return Object.values(this.pcIn).flat().filter(c=>!nc.includes(c.from)).sort((a,b)=>(b.at||0)-(a.at||0))},
  touch(fast){if(!this.on)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.publish(),fast?300:2500)},
  async publish(){
    if(!this.on||!S.profile)return;const hid=S.profile.hidden||[];const scores={};const t=todayStr();
    for(let i=0;i<120;i++){const s=addDays(t,-i);if(hid.includes(s))continue;const v=scoreOf(s);if(v!=null)scores[s]=v}
    const av=S.profile.avatar&&S.profile.avatar.length<40000?S.profile.avatar:null;
    const doc={name:S.profile.name,avatar:av,sticker:S.profile.sticker||'flower',code:S.profile.code,scores,updated:Date.now()};
    const key=JSON.stringify(Object.assign({},doc,{updated:0}));if(key===this.lastPub)return;
    try{await Store.db.doc('profiles/'+this.me()).set(doc);this.lastPub=key;this.err=false}catch(e){this.err=true}
  },
  async setLinks(withArr){await Store.db.doc('links/'+this.me()).set({with:withArr,updated:Date.now()})},
  async addByCode(code){
    code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length===6)code=code.slice(0,3)+'-'+code.slice(3);
    const me=this.me();const hit=Object.entries(this.profiles).find(([id,v])=>v.code===code&&id!==me);
    if(!hit)throw{code:'nf'};const id=hit[0];if(this.mine().includes(id))throw{code:'dup',name:hit[1].name};
    await this.setLinks(this.mine().concat([id]));return{id,name:hit[1].name};
  },
  async remove(id){await this.setLinks(this.mine().filter(x=>x!==id))},
  async accept(id){await this.setLinks(this.mine().concat([id]))},
  async send(doc){return Store.db.collection('postcards/'+this.me()+'/sent').add(Object.assign({at:Date.now()},doc))},
};
let Social=SocialDb;
function friendStreak(sc){let n=0,s=todayStr();if((sc[s]||0)>=60)n++;s=addDays(s,-1);for(let i=0;i<400;i++){if((sc[s]||0)>=60){n++;s=addDays(s,-1)}else break}return n}
const mySc=()=>{const o={},t=todayStr();for(let i=0;i<120;i++){const d=addDays(t,-i),v=scoreOf(d);if(v!=null)o[d]=v}return o};
function bestStreak(sc){let best=0,cur=0;const t=todayStr();for(let i=119;i>=0;i--){const v=sc[addDays(t,-i)];if(v!=null&&v>=60){cur++;if(cur>best)best=cur}else cur=0}return best}
function rankRows(){
  const rows=[];const msc=mySc();rows.push({id:'me',mine:true,name:S.profile.name,p:S.profile,streak:friendStreak(msc),best:bestStreak(msc)});
  for(const id of Social.friendIds()){const p=Social.profiles[id];if(!p)continue;const sc=p.scores||{};rows.push({id,mine:false,name:p.name,p,streak:friendStreak(sc),best:bestStreak(sc)})}
  rows.sort((a,b)=>b.streak-a.streak||b.best-a.best||(a.mine?-1:b.mine?1:0)||a.name.localeCompare(b.name,'he'));
  rows.forEach((r,i)=>{const f=rows.findIndex(x=>x.streak===r.streak&&x.best===r.best);r.rank=f+1});return rows;
}
function rankHtml(){
  const rows=rankRows();if(rows.length<2)return '';
  return `<div class="note solid" aria-label="דירוג הרצפים">${tapeEl()}<div class="rowb" style="margin-bottom:10px"><span class="pt">דירוג הרצפים</span><span class="pts">${esc(String(rows.length))} משתתפים</span></div><ol class="rank-list">${rows.map(r=>`<li class="rk ${r.mine?'me':''}"><span class="rkn r${r.rank<=3?r.rank:0}" aria-label="מקום ${r.rank}">${r.rank}</span>${fAvatar(r.p,'')}<span class="tx"><b>${esc(r.name)}${r.mine?' (את/ה)':''}</b><small>הרצף הארוך ביותר: ${r.best}</small></span><span class="rks"><b>${r.streak}</b>${r.streak===1?'יום':'ימים'}</span></li>`).join('')}</ol><div class="hint" style="margin-top:10px">${ico('check',16)} רצף = ימים ברצף עם ציון 60 ומעלה</div></div>`;
}
const fAvatar=(p,cls)=>avatarHtml(p,cls);
const inviteUrl=()=>{let b='';try{b=location.href.split('#')[0]}catch(e){}return b+'#/join/'+(S.profile&&S.profile.code||'')};
const needDb=()=>{const acct=S.guest&&S.apiAvail;return `<main class="page"><div class="cols"><div class="c3"><div class="note"><div class="pt">${acct?'כדי להוסיף חברים צריך חשבון':'החלק החברתי עובד בענן'}</div><p style="margin:8px 0 12px">${acct?'כרגע אתם משתמשים בלי חשבון, והנתונים נשמרים רק במכשיר הזה. אחרי הרשמה אפשר להוסיף חברים ולשלוח גלויות, והנתונים שלכם יועברו לחשבון.':'כדי להוסיף חברים ולשלוח גלויות, צריך לפתוח את הדף עם הרשאת כתיבה. שאר האתר עובד כרגיל.'}</p>${acct?'<button class="btn primary" data-act="make-account">יצירת חשבון</button>':''}</div></div></div></main>`};
/* ---------------- friends ---------------- */
function fcardHtml(id){const p=Social.profiles[id]||{name:'?',scores:{}};const sc=p.scores||{};const t=sc[todayStr()];const tr=tierOf(t==null?null:t);const st=friendStreak(sc);
  const sticker=t==null?`<span class="stk" style="aspect-ratio:1"><svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 6" opacity=".5"/></svg><span style="opacity:.5">–</span></span>`:`<span class="stk" style="aspect-ratio:1;transform:rotate(${tr==='great'?-5:tr==='good'?4:-3}deg)">${tierShape(tr,t)}<span style="font-size:${t===100?15:20}px">${t}</span></span>`;
  return `<button class="fcard" data-act="open-friend" data-id="${esc(id)}">${fAvatar(p,'m')}<span class="tx"><b>${esc(p.name)}</b><span class="pts">${t==null?'עוד לא עודכן היום':(st?`רצף ${st} ימים · `:'')+'עודכן היום'}</span></span>${sticker}</button>`}
PAGES.friends=()=>{
  if(!Social.on)return needDb();
  if(S.ui.pendingJoin){const c=S.ui.pendingJoin;S.ui.pendingJoin=null;setTimeout(()=>openPopup('addfriend',{code:c}),50)}
  const fr=Social.friendIds(),inc=Social.incoming(),out=Social.outgoing();
  const req=inc.map(id=>{const p=Social.profiles[id];return `<div class="fcard" style="cursor:default">${fAvatar(p,'m')}<span class="tx"><b>${esc(p.name)}</b><span class="pts">רוצה להצטרף אליך</span></span><button class="btn secondary sm" data-act="decline" data-id="${esc(id)}">דחייה</button><button class="btn primary sm" data-act="accept" data-id="${esc(id)}">${ico('check',18,3)} אישור</button></div>`}).join('');
  return `<main class="page">${verifyBanner()}${Social.err?'<div class="dbwarn">יש בעיה בחיבור לחלק החברתי. אולי חסרה לך הרשאת כתיבה בדף.</div>':''}<div class="rowb" style="margin-bottom:22px"><button class="btn primary" data-act="addfriend-popup">${ico('plus',20,3)} הוספת חבר/ה</button>${stitle('grn','החברים שלי',GX.flower(COL.pink,COL.lime))}</div>
  <div class="cols"><div class="c2"><div class="sheetwrap alt"><div class="sheet" style="padding:26px 20px 22px"><div class="stack" style="gap:10px">${fr.length?fr.map(fcardHtml).join(''):`<div class="empty">עוד אין חברים.<br>שלחו קישור הזמנה כדי להתחיל ${GX.flower(COL.pink,COL.lime).replace('class="g "','class="g" style="width:48px;height:48px;display:inline-block;vertical-align:middle"')}</div>`}</div></div></div></div>
  <div class="c2 stack">${inc.length?`<div class="stack" style="gap:10px"><span class="pt">בקשות הצטרפות · ${inc.length}</span>${req}</div>`:''}${out.length?`<div class="note solid" style="padding:14px 18px"><b>ממתינים לאישור</b><div class="pts">${out.map(id=>esc(Social.profiles[id].name)).join(', ')}</div></div>`:''}${rankHtml()}
  <div class="note">${tapeEl()}<div class="pt">הזמנת חבר/ה</div><div class="stack" style="gap:12px;margin-top:10px"><div class="row" style="gap:10px"><button class="btn secondary sm" data-act="copy-invite">${ico('copy',18)} העתקה</button><div class="in sm" style="direction:ltr;text-align:left;font-family:Heebo;font-weight:500;font-size:15px;display:flex;align-items:center;overflow:hidden;white-space:nowrap">${esc(inviteUrl())}</div></div><button class="btn primary block" data-act="share-invite">${ico('share',20)} שליחה בוואטסאפ</button><div class="rowb"><span class="pts">הקוד האישי שלך</span><span class="codebox">${esc(S.profile.code||'')}</span></div></div></div>
  <div class="hint banner-note">${ico('lock',16)} רק מי שהזמנת יכול/ה להיות חבר/ה. אין חיפוש משתמשים. רואים רק ציונים.</div></div></div></main>`;
};
ACT['open-friend']=el=>go('friend/'+el.dataset.id);
ACT['addfriend-popup']=()=>openPopup('addfriend',{code:''});
ACT['copy-invite']=async()=>{toast((await copyText(inviteUrl()))?'הקישור הועתק':'לא הצלחנו להעתיק')};
ACT['share-invite']=()=>whatsapp(`${S.profile.name} מזמין/ה אותך ל"היום שלי", הדף היומי הצבעוני: ${inviteUrl()}\nהקוד שלי: ${S.profile.code}`);
ACT.accept=async el=>{try{await Social.accept(el.dataset.id);toast('נוסף/ה לחברים');render(true)}catch(e){toast('לא הצלחנו להוסיף')}};
ACT.decline=el=>{S.profile.dismissed=(S.profile.dismissed||[]).concat([el.dataset.id]);Store.saveProfile();toast('הבקשה נדחתה');render(true)};
let qrLoad=null;function loadQR(){if(window.QRCode)return Promise.resolve(true);if(qrLoad)return qrLoad;qrLoad=new Promise(res=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=()=>res(!!window.QRCode);s.onerror=()=>res(false);document.head.appendChild(s);setTimeout(()=>res(!!window.QRCode),5000)});return qrLoad}
POP.addfriend={label:'הוספת חבר/ה',after:()=>{loadQR().then(ok=>{const b=$('#qrbox');if(!ok||!b||b.firstChild)return;try{new QRCode(b,{text:inviteUrl(),width:96,height:96,correctLevel:QRCode.CorrectLevel.M})}catch(e){}})},
 render:d=>`${popTape()}${popHead('הוספת חבר/ה')}<p>שלחו קישור הזמנה. רק מי שקיבל/ה אותו יכול/ה להצטרף.</p>
 <div class="row" style="gap:10px"><button class="btn secondary sm" data-act="copy-invite">${ico('copy',18)} העתקה</button><div class="in sm" style="direction:ltr;text-align:left;font-family:Heebo;font-weight:500;font-size:14px;display:flex;align-items:center;overflow:hidden;white-space:nowrap">${esc(inviteUrl())}</div></div>
 <button class="btn primary block" data-act="share-invite">${ico('share',20)} שליחה בוואטסאפ</button>
 <div class="rowb" style="flex-wrap:nowrap;gap:16px"><div class="qr" id="qrbox" aria-label="קוד QR להזמנה"></div><div class="stack" style="gap:6px;align-items:flex-end"><span class="lbl">הקוד האישי שלך</span><span class="codebox">${esc(S.profile.code||'')}</span><span class="pts">או סרקו את ה-QR</span></div></div>
 <hr style="border:0;border-top:2px dashed var(--ink);opacity:.4;width:100%"><div data-submit="add-by-code" class="stack" style="gap:10px"><div class="field"><label for="fc">יש לך קוד של חבר/ה?</label><input id="fc" class="in" style="direction:ltr;text-transform:uppercase" value="${esc(d.code||'')}" maxlength="7" placeholder="ABC-123" data-in="fc-code" data-focus="1" autocomplete="off"></div>${d.err?`<div class="err-t" role="alert">${esc(d.err)}</div>`:''}<div class="acts"><span class="sp"></span><button class="btn secondary" type="button" data-act="submit">הוספה</button></div></div>`};
INP['fc-code']=el=>{S.popup.d.code=el.value};
SUB['add-by-code']=async()=>{const d=S.popup.d;if(!Social.on){d.err='החלק החברתי לא זמין כרגע';return renderPopup()}
  try{const r=await Social.addByCode(d.code);closePopup();toast(`נשלחה בקשה ל${r.name}. כשיאשרו, תראו אחד את השני`);render(true)}
  catch(e){d.err=e.code==='nf'?'לא מצאנו קוד כזה. בדקו שהחבר/ה כבר נכנס/ה לדף':e.code==='dup'?`${e.name} כבר ברשימה`:e.code==='unverified'?'צריך לאמת את המייל קודם. בדקו את תיבת הדואר':'לא הצלחנו להוסיף. אולי חסרה הרשאת כתיבה';renderPopup()}};
/* ---------------- friend calendar ---------------- */
function fMonthStats(sc,y,m){const n=new Date(y,m+1,0).getDate();let sum=0,c=0,best=null,bd=null,great=0,good=0,soft=0,emp=0;for(let d=1;d<=n;d++){const s=`${y}-${pad2(m+1)}-${pad2(d)}`;if(s>todayStr())continue;const v=sc[s];if(v==null){emp++;continue}sum+=v;c++;if(best==null||v>best){best=v;bd=s}const t=tierOf(v);if(t==='great')great++;else if(t==='good')good++;else soft++}return{avg:c?Math.round(sum/c):null,best,bd,great,good,soft,emp}}
PAGES.friend=r=>{
  if(!Social.on)return needDb();
  const id=r.a;const p=Social.profiles[id];if(!p||!Social.friendIds().includes(id))return `<main class="page"><div class="note"><div class="pt">לא מצאנו את החבר/ה הזה</div><p style="margin:10px 0"><a class="btn primary" href="#/friends">חזרה לחברים</a></p></div></main>`;
  const now=new Date();if(!S.fcal)S.fcal={y:now.getFullYear(),m:now.getMonth()};const {y,m}=S.fcal;const sc=p.scores||{};const t=todayStr();
  const off=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),rows=Math.ceil((off+n)/7);let cells='';
  for(let i=0;i<rows*7;i++){const dn=i-off+1;if(dn<1||dn>n){const d=new Date(y,m,dn);cells+=`<div class="cell out"><span class="d">${d.getDate()}</span></div>`;continue}
    const s=`${y}-${pad2(m+1)}-${pad2(dn)}`;const v=sc[s];const tr=tierOf(v==null?null:v);
    if(s>t)cells+=`<div class="cell fut" style="cursor:default"><span class="d" style="opacity:.55">${dn}</span></div>`;
    else if(v==null)cells+=`<div class="cell emp" style="cursor:default"><span class="d" style="opacity:.55">${dn}</span><span class="ring"></span></div>`;
    else cells+=`<button class="cell ${s===t?'today':''}" data-act="friend-day" data-id="${esc(id)}" data-d="${s}" aria-label="${dn}, ציון ${v}"><span class="d">${dn}</span><span class="stk" style="aspect-ratio:1;transform:rotate(${tr==='great'?-6:tr==='good'?5:-4}deg)">${tierShape(tr,v)}<span class="${v===100?'n3':''}">${v}</span></span></button>`}
  const st=fMonthStats(sc,y,m),avgT=tierOf(st.avg),sk=friendStreak(sc);
  return `<main class="page"><div class="calhead">
  <div class="row" style="gap:14px;flex-wrap:wrap"><button class="more" data-act="friend-privacy" data-id="${esc(id)}" aria-label="שיתוף וגישה"><i></i><i></i><i></i></button><button class="btn primary" data-act="send-card" data-id="${esc(id)}">${ico('mail',20)} שליחת גלויה</button><span class="chip" style="background:var(--lav-l);border-style:dashed">${ico('lock',14)} רואים רק ציונים</span><div style="text-align:start"><div class="pts">הלוח של</div><div class="suez" style="font-size:44px;line-height:1">${esc(p.name)}</div></div>${fAvatar(p,'m')}</div><div class="mnav"><button class="icbtn big" data-act="fcal-next" aria-label="חודש הבא">${ico('left',24)}</button><span class="suez">${HMON[m]} ${y}</span><button class="icbtn big" data-act="fcal-prev" aria-label="חודש קודם">${ico('right',24)}</button></div></div>
  <div class="cols"><div class="c3"><div class="sheetwrap alt"><div class="sheet white" style="padding:26px 24px 18px;border-radius:56px 20px 56px 20px">${tapeEl()}<div class="calgrid">${WD.map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div><div class="hint" style="justify-content:flex-start;margin-top:12px">${ico('check',16)} לחצו על יום כדי להדביק מדבקה או לשלוח גלויה</div></div></div></div>
  <div class="c1 sumcol"><div style="align-self:center;width:200px;height:200px;position:relative;transform:rotate(-4deg)">${st.avg==null?`<svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 6"/></svg>`:tierShape(avgT,st.avg===100?99:st.avg)}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:${st.avg==null?'var(--ink)':'var(--ink-fixed)'}"><small class="hand" style="font-size:18px">ממוצע של ${esc(p.name)}</small><span class="suez" style="font-size:56px;line-height:1">${st.avg==null?'—':st.avg}</span><small class="hand" style="font-size:18px">${PRAISE[avgT]}</small></div></div>
  <div class="statn" style="background:var(--lime-l)"><b>${sk}</b>הרצף הנוכחי</div><div class="statn" style="background:var(--pink-l)"><b>${st.best==null?'–':st.best}</b>היום הכי טוב</div><div class="statn" style="background:var(--lav-l)"><b>${st.great}</b>ימים מעולים</div><a class="btn secondary block" href="#/friends">חזרה לחברים</a></div></div></main>`;
};
ACT['fcal-prev']=()=>{S.fcal.m--;if(S.fcal.m<0){S.fcal.m=11;S.fcal.y--}render(true)};ACT['fcal-next']=()=>{S.fcal.m++;if(S.fcal.m>11){S.fcal.m=0;S.fcal.y++}render(true)};
ACT['friend-day']=el=>openPopup('friendday',{id:el.dataset.id,date:el.dataset.d});
POP.friendday={label:'יום של חבר/ה',render:d=>{const p=Social.profiles[d.id]||{name:'?',scores:{}};const v=(p.scores||{})[d.date];const t=tierOf(v==null?null:v);
  return `${popTape()}${popHead(longDate(d.date))}<div class="row" style="gap:14px">${v==null?'':stk(t,v,72,-5)}<div><b>${esc(p.name)}</b><div class="pts">${praise(v)}</div></div></div><div class="lbl">הדביקו מדבקה על היום הזה</div><div class="opts" style="justify-content:flex-start">${STICKERS.map(s=>`<button class="opt" data-act="react" data-id="${esc(d.id)}" data-d="${d.date}" data-s="${s[0]}" aria-label="שליחת מדבקה">${s[1]()}</button>`).join('')}</div><button class="btn secondary block" data-act="send-card" data-id="${esc(d.id)}" data-d="${d.date}">${ico('mail',20)} שליחת גלויה על היום הזה</button>`}};
ACT.react=async el=>{if(!Social.on)return;try{await Social.send({to:[el.dataset.id],note:'',sticker:el.dataset.s,photo:null,day:el.dataset.d});closePopup();toast('המדבקה נשלחה')}catch(e){toast('לא הצלחנו לשלוח')}};
/* ---------------- privacy ---------------- */
POP.privacy={label:'שיתוף וגישה',cls:'w',render:d=>{const p=Social.profiles[d.id]||{name:'?'};const nc=(S.profile.noCards||[]).includes(d.id);const hid=S.profile.hidden||[];
  return `${popTape()}${popHead('מה '+p.name+' רואה?')}<div class="seg" role="group"><span class="chip" style="opacity:.5;border-color:transparent">הכול</span><span class="chip" style="opacity:.5;border-color:transparent">ציונים ומשימות</span><span class="chip on">ציונים בלבד</span></div><p>${esc(p.name)} רואה רק את המדבקות והציונים שלך. אף פעם לא מה שכתבת, מה אכלת או הלו״ז.</p>
  <div class="rowb" style="flex-wrap:nowrap"><span class="grow"><b>לאפשר ל${esc(p.name)} לשלוח לי גלויות</b></span><button class="toggle ${nc?'':'on'}" role="switch" aria-checked="${!nc}" aria-label="גלויות" data-act="pv-cards" data-id="${esc(d.id)}"><i></i></button></div>
  <div class="stack" style="gap:8px"><b>ימים שמוסתרים מכל החברים</b><div class="opts" style="justify-content:flex-start">${hid.map(h=>`<span class="chip pink">${esc(shortDate(h))}<button class="icbtn" style="width:22px;height:22px;border-width:1.5px" data-act="pv-unhide" data-d="${h}" aria-label="הצגת היום">${ico('x',12,3)}</button></span>`).join('')||'<span class="pts">אין ימים מוסתרים</span>'}</div><div class="row" style="gap:8px"><input class="in sm" type="date" data-in="pv-date" style="max-width:190px" aria-label="בחירת יום להסתרה"><button class="ghost" data-act="pv-hide">${ico('plus',16)} הסתרת יום</button></div></div>
  <div class="acts"><button class="ghost red" data-act="pv-block" data-id="${esc(d.id)}">חסימה</button><button class="ghost" data-act="pv-remove" data-id="${esc(d.id)}">הסרה מהחברים</button><span class="sp"></span><button class="btn primary" data-act="close-popup">סגירה</button></div>`}};
ACT['friend-privacy']=el=>openPopup('privacy',{id:el.dataset.id});
ACT['pv-cards']=el=>{const id=el.dataset.id;const a=S.profile.noCards||(S.profile.noCards=[]);const i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);Store.saveProfile();renderPopup()};
INP['pv-date']=el=>{S.popup.d.hd=el.value};
ACT['pv-hide']=()=>{const v=S.popup.d.hd;if(!v)return toast('צריך לבחור יום');const a=S.profile.hidden||(S.profile.hidden=[]);if(!a.includes(v))a.push(v);Store.saveProfile();Social.lastPub='';renderPopup();toast('היום מוסתר מהחברים')};
ACT['pv-unhide']=el=>{S.profile.hidden=(S.profile.hidden||[]).filter(x=>x!==el.dataset.d);Store.saveProfile();Social.lastPub='';renderPopup()};
ACT['pv-remove']=async el=>{try{await Social.remove(el.dataset.id);closePopup();go('friends');toast('הוסר/ה מהחברים')}catch(e){toast('לא הצלחנו להסיר')}};
ACT['pv-block']=async el=>{const id=el.dataset.id;try{await Social.remove(id);S.profile.blocked=(S.profile.blocked||[]).concat([id]);Store.saveProfile();closePopup();go('friends');toast('נחסם/ה')}catch(e){toast('לא הצלחנו לחסום')}};
/* ---------------- postcards ---------------- */
function pcardHtml(c,dir){const who=dir==='in'?Social.profiles[c.from]:null;const toNames=(c.to||[]).map(u=>(Social.profiles[u]||{name:'?'}).name).join(', ');
  const ph=c.photo?`<img alt="" src="${esc(c.photo)}">`:`<span style="position:absolute;inset:18% 30%">${stickerSvg(c.sticker||'flower')}</span>`;
  return `<button class="pcard" data-act="view-card" data-i="${esc(c.id)}" data-dir="${dir}" style="transform:rotate(${(c.id.charCodeAt(0)%5-2)*.8}deg)">${tapeEl()}<div class="ph" style="background:${c.photo?'var(--card)':['var(--pink)','var(--lime)','var(--lav)'][c.id.charCodeAt(1)%3]}">${ph}${c.photo&&c.sticker?`<span style="position:absolute;inset-inline-start:8px;top:8px;width:46px;height:46px">${stickerSvg(c.sticker)}</span>`:''}</div><div class="ptn" style="min-height:28px">${esc(c.note||(c.day?`מדבקה על ${shortDate(c.day)}`:''))}</div><div class="ft"><span class="pts">${ago(c.at||0)}</span><span class="row" style="gap:8px">${dir==='in'?`<b style="font-size:14px">${esc(who?who.name:'?')}</b>${who?fAvatar(who,''):''}`:`<b style="font-size:14px">אל: ${esc(toNames)}</b>`}</span></div></button>`}
PAGES.postcards=()=>{
  if(!Social.on)return needDb();
  const tab=S.ui.ptab||'in';const list=tab==='in'?Social.cardsIn():Social.pcOut;
  return `<main class="page"><div class="rowb" style="margin-bottom:18px"><button class="btn primary" data-act="send-card">${ico('plus',20,3)} גלויה חדשה</button>${stitle('tp','הגלויות שלי',GX.sparkle(COL.lime))}</div>
  <div class="opts" style="justify-content:flex-start;margin-bottom:22px"><button class="chip ${tab==='in'?'on':''}" style="font-size:18px;padding:6px 20px" data-act="ptab" data-t="in">התקבלו · ${Social.cardsIn().length}</button><button class="chip ${tab==='out'?'on':''}" style="font-size:18px;padding:6px 20px" data-act="ptab" data-t="out">ששלחתי · ${Social.pcOut.length}</button></div>
  ${list.length?`<div class="pgrid">${list.map(c=>pcardHtml(c,tab)).join('')}</div>`:`<div class="note" style="max-width:520px"><div class="pt">${tab==='in'?'עוד לא קיבלת גלויות':'עוד לא שלחת גלויות'}</div><p style="margin:8px 0 12px">שולחים תמונה ושורה בכתב יד לחבר/ה, או מדביקים מדבקה על יום בלוח שלהם.</p><button class="btn primary" data-act="send-card">שליחת גלויה ראשונה</button></div>`}</main>`;
};
ACT.ptab=el=>{S.ui.ptab=el.dataset.t;render(true)};
ACT['view-card']=el=>{const list=el.dataset.dir==='in'?Social.cardsIn():Social.pcOut;const c=list.find(x=>x.id===el.dataset.i);if(c)openPopup('viewcard',{c,dir:el.dataset.dir})};
POP.viewcard={label:'גלויה',cls:'w',render:d=>{const c=d.c;const who=d.dir==='in'?Social.profiles[c.from]:null;return `${popTape()}${popHead(d.dir==='in'?`גלויה מ${who?who.name:'?'}`:'גלויה ששלחת')}<div class="pcard" style="cursor:default;box-shadow:none"><div class="ph" style="height:auto;min-height:200px;background:${c.photo?'var(--card)':'var(--pink)'}">${c.photo?`<img alt="" src="${esc(c.photo)}" style="max-height:60vh;object-fit:contain">`:`<span style="display:block;width:160px;height:160px;margin:20px auto">${stickerSvg(c.sticker||'flower')}</span>`}</div><div class="pt">${esc(c.note||(c.day?`מדבקה על ${longDate(c.day)}`:''))}</div><div class="pts">${ago(c.at||0)}</div></div>`}};
ACT['send-card']=el=>{closePopup();if(!Social.on)return;const fr=Social.friendIds();if(!fr.length){toast('קודם צריך להוסיף חבר/ה');return go('friends')}
  openPopup('postcard',{to:el&&el.dataset&&el.dataset.id?[el.dataset.id]:(fr.length===1?[fr[0]]:[]),photo:null,note:'',sticker:'flower',day:el&&el.dataset?el.dataset.d||null:null,sending:false,err:''})};
POP.postcard={label:'שליחת גלויה',cls:'w',render:d=>{const fr=Social.friendIds();
  return `${popTape()}${popHead('שליחת גלויה')}<div class="stack" style="gap:14px"><div class="opts" style="justify-content:flex-start" role="group" aria-label="נמענים"><b>אל</b>${fr.map(id=>{const p=Social.profiles[id];const on=d.to.includes(id);return `<button type="button" class="chip ${on?'on':''}" data-act="pc-to" data-id="${esc(id)}" aria-pressed="${on}">${esc(p.name)}</button>`}).join('')}</div>
  ${d.day?`<div class="banner lav">${ico('cal',18)} על היום ${esc(longDate(d.day))}</div>`:''}
  <div class="dropz">${d.photo?`<img alt="תמונה שנבחרה" src="${esc(d.photo)}">`:`${ico('camera',44)}<span class="pt">הוסיפו תמונה</span>`}<div class="row" style="gap:10px;flex-wrap:wrap;justify-content:center"><label class="ghost" style="cursor:pointer">${ico('image',18)} מהגלריה<input type="file" accept="image/*" hidden data-ch="pc-file"></label><label class="ghost" style="cursor:pointer">${ico('camera',18)} צילום עכשיו<input type="file" accept="image/*" capture="environment" hidden data-ch="pc-file"></label>${d.photo?`<button type="button" class="ghost red" data-act="pc-nophoto">${ico('trash',16)} הסרה</button>`:''}</div></div>
  <div class="field"><label for="pn">מה כותבים על הגלויה?</label><input id="pn" class="in" maxlength="100" value="${esc(d.note)}" placeholder="איזה יום! גאה בך" data-in="pc-note" data-focus="1"></div>
  <div class="row" style="gap:6px;flex-wrap:wrap"><b>מדבקה</b>${STICKERS.map(s=>`<button type="button" class="opt ${d.sticker===s[0]?'on':''}" style="width:48px;height:48px" data-act="pc-sticker" data-s="${s[0]}" aria-label="מדבקה">${s[1]()}</button>`).join('')}</div>
  ${d.err?`<div class="err-t" role="alert">${esc(d.err)}</div>`:''}<div class="acts"><span class="sp"></span><button class="btn secondary" type="button" data-act="close-popup">ביטול</button><button class="btn primary" type="button" data-act="pc-send" ${d.sending?'disabled':''}>${d.sending?'שולחים…':'שליחה'} ${ico('mail',20)}</button></div></div>`}};
ACT['pc-to']=el=>{const d=S.popup.d,id=el.dataset.id;const i=d.to.indexOf(id);if(i>=0)d.to.splice(i,1);else d.to.push(id);renderPopup()};
ACT['pc-sticker']=el=>{S.popup.d.sticker=el.dataset.s;renderPopup()};ACT['pc-nophoto']=()=>{S.popup.d.photo=null;renderPopup()};
INP['pc-note']=el=>{S.popup.d.note=el.value};
INP['pc-file']=async el=>{const f=el.files&&el.files[0];if(!f)return;const d=S.popup.d;try{d.photo=await resizeImage(f,720,.72);d.err=''}catch(e){d.err='לא הצלחנו לקרוא את התמונה'}renderPopup()};
ACT['pc-send']=async()=>{const d=S.popup.d;if(!d.to.length){d.err='צריך לבחור למי לשלוח';return renderPopup()}if(!d.photo&&!(d.note||'').trim()){d.err='צריך להוסיף תמונה או שורה בכתב יד';return renderPopup()}
  d.sending=true;d.err='';renderPopup();const pp=S.popup;
  try{await Social.send({to:d.to,note:(d.note||'').trim(),sticker:d.sticker,photo:d.photo||null,day:d.day||null});if(S.popup!==pp)return;closePopup();toast('הגלויה נשלחה!');if(S.route.name==='postcards'){S.ui.ptab='out';render(true)}}
  catch(e){if(S.popup!==pp)return;d.sending=false;d.err='לא הצלחנו לשלוח. אולי התמונה גדולה מדי, או שחסרה הרשאת כתיבה';renderPopup()}};
/* ---------------- weekly zine ---------------- */
function zineData(){const t=todayStr();const days=[];for(let i=6;i>=0;i--){const s=addDays(t,-i);days.push({s,v:scoreOf(s)})}const sc=days.filter(x=>x.v!=null);const avg=sc.length?Math.round(sc.reduce((a,b)=>a+b.v,0)/sc.length):null;const best=sc.reduce((a,b)=>!a||b.v>a.v?b:a,null);const stepsAvg=Math.round(days.reduce((a,d)=>a+((S.days[d.s]&&S.days[d.s].steps)||0),0)/7);return{days,sc,avg,best,stepsAvg,streak:streak()}}
PAGES.zine=()=>{
  const z=zineData();const first=z.days[0].s,last=z.days[6].s;
  const quote=!z.sc.length?'עוד אין מדבקות השבוע. התחילו להזין, והגיליון ימלא את עצמו.':z.streak>=3?`שבוע של רצף! ${z.streak} ימים רצופים שעמדת ביעד.`:z.avg>=75?'שבוע חזק. הממוצע שלך גבוה, תמשיכו ככה!':'שבוע של התחלות. כל מדבקה נחשבת.';
  const cards=Social.on?Social.cardsIn().filter(c=>c.at>=Date.now()-7*864e5&&c.photo).slice(0,2):[];
  const dayCol=d=>{const t=tierOf(d.v);return `<div><span>${WD[pdate(d.s).getDay()]}</span><span class="stk" style="aspect-ratio:1;transform:rotate(${t==='great'?-5:t==='good'?4:-3}deg)">${d.v==null?`<svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 6" opacity=".5"/></svg>`:tierShape(t,d.v)}<span style="font-size:20px">${d.v==null?'':d.v}</span></span></div>`};
  return `<main class="page"><div class="rowb" style="margin-bottom:22px"><div class="row" style="gap:12px;flex-wrap:wrap"><button class="btn primary" data-act="zine-share">${ico('share',20)} שיתוף בוואטסאפ</button><button class="btn secondary" data-act="zine-dl" id="zdl">${ico('up',20)} הורדה כתמונה</button></div><div class="row" style="gap:16px;flex-wrap:wrap"><div class="datetag" style="margin:0;font-family:'Gveret Levin';font-size:28px;transform:rotate(-2deg)">${esc(shortDate(first))} – ${esc(shortDate(last))}</div>${stitle('lav','הגיליון השבועי',GX.star(COL.lime))}</div></div>
  <div class="cols"><div class="c2" style="position:relative;min-height:440px"><span class="dec" style="inset-inline-start:30px;top:30px;width:min(420px,70%);aspect-ratio:1.4">${GX.blob(COL.pink,2)}</span><div style="position:relative;z-index:1;display:grid;place-items:center;padding:20px 0">${z.best?(z.best.v===100?`<div class="score-big p100" style="transform:rotate(-6deg)">${GX.flower100()}<div class="in-t"><span class="n n3">100</span></div><div class="p100cap">היום הכי טוב · ${WD[pdate(z.best.s).getDay()]} · יום מושלם!</div></div>`:`<div class="score-big" style="transform:rotate(-6deg)">${tierShape(tierOf(z.best.v),z.best.v)}<div class="in-t"><small>היום הכי טוב · ${WD[pdate(z.best.s).getDay()]}</small><span class="n">${z.best.v}</span><small>${praise(z.best.v)}</small></div></div>`):`<div class="note"><div class="pt">עוד אין יום מוביל</div></div>`}</div>${cards.length?`<div class="pgrid" style="grid-template-columns:repeat(2,1fr);margin-top:10px">${cards.map(c=>pcardHtml(c,'in')).join('')}</div>`:''}</div>
  <div class="c2"><div class="sheetwrap alt"><div class="sheet white" style="padding:30px 22px 22px">${tapeEl()}<div class="zine-days" style="margin-bottom:18px">${z.days.slice().reverse().map(dayCol).join('')}</div><div class="row" style="gap:10px;margin-bottom:16px;flex-wrap:wrap"><div class="statn grow" style="background:var(--lav-l);justify-content:center;flex-direction:column;gap:0"><b>${z.best?z.best.v:'–'}</b><span class="pts">היום הכי טוב</span></div><div class="statn grow" style="background:var(--pink-l);justify-content:center;flex-direction:column;gap:0"><b>${z.streak}</b><span class="pts">ימים ברצף</span></div><div class="statn grow" style="background:var(--lime-l);justify-content:center;flex-direction:column;gap:0"><b>${z.avg==null?'–':z.avg}</b><span class="pts">ממוצע השבוע</span></div></div><div class="pt">${esc(quote)}</div><div class="row" style="gap:8px;margin-top:10px"><b>בממוצע ${fmtNum(z.stepsAvg)} צעדים ביום</b></div></div></div></div></div></main>`;
};
function zineText(z){return `הגיליון השבועי שלי ב"היום שלי":\n${z.days.map(d=>`${WD[pdate(d.s).getDay()]} ${d.v==null?'—':d.v}`).join(' · ')}\nממוצע ${z.avg==null?'—':z.avg}, ${z.streak} ימים ברצף${z.best?`, היום הכי טוב ${z.best.v}`:''}`}
ACT['zine-share']=()=>whatsapp(zineText(zineData()));
function scallop(ctx,cx,cy,r,n){ctx.beginPath();for(let i=0;i<=240;i++){const t=i/240*Math.PI*2,rr=r*(0.84+0.1*Math.cos(n*t));const x=cx+rr*Math.cos(t),y=cy+rr*Math.sin(t);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath()}
ACT['zine-dl']=async()=>{
  const z=zineData();
  try{await Promise.all([document.fonts.load('80px "Suez One"'),document.fonts.load('40px "Gveret Levin"'),document.fonts.load('700 30px Heebo')])}catch(e){}
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.direction='rtl';x.textAlign='center';
  x.fillStyle='#fbf4e6';x.fillRect(0,0,W,H);x.fillStyle='#1f1a2e';x.font='110px "Suez One",serif';x.fillText('הגיליון השבועי',W/2,170);x.font='44px "Gveret Levin",cursive';x.fillText(`${shortDate(z.days[0].s)} – ${shortDate(z.days[6].s)}`,W/2,240);
  z.days.slice().reverse().forEach((d,i)=>{const cx=W-(95+i*148),cy=470,t=tierOf(d.v);x.lineWidth=6;x.strokeStyle='#1f1a2e';
    if(d.v==null){x.setLineDash([12,12]);x.beginPath();x.arc(cx,cy,56,0,7);x.stroke();x.setLineDash([])}
    else if(d.v===100){x.fillStyle='#ff9ccb';for(let k=0;k<10;k++){x.save();x.translate(cx,cy);x.rotate(k*Math.PI/5);x.beginPath();x.ellipse(0,-34,20,32,0,0,Math.PI*2);x.fill();x.stroke();x.restore()}x.fillStyle='#ffe27a';x.beginPath();x.arc(cx,cy,34,0,7);x.fill();x.stroke();x.fillStyle='#1f1a2e';x.font='34px "Suez One",serif';x.fillText('100',cx,cy+12)}
    else{x.fillStyle=t==='great'?'#ff5b2e':t==='good'?'#cbf03a':'#b9a4f7';if(t==='soft'){x.beginPath();x.arc(cx,cy,56,0,7)}else scallop(x,cx,cy,64,12);x.fill();x.stroke();x.fillStyle='#1f1a2e';x.font='46px "Suez One",serif';x.fillText(String(d.v),cx,cy+16)}
    x.fillStyle='#1f1a2e';x.font='700 32px Heebo,sans-serif';x.fillText(WD[pdate(d.s).getDay()],cx,cy-86)});
  const stat=(i,v,l,col)=>{const cx=W-(210+i*330),cy=780;x.fillStyle=col;x.strokeStyle='#1f1a2e';x.lineWidth=6;x.beginPath();x.roundRect(cx-140,cy-90,280,180,36);x.fill();x.stroke();x.fillStyle='#1f1a2e';x.font='90px "Suez One",serif';x.fillText(String(v),cx,cy+10);x.font='34px "Gveret Levin",cursive';x.fillText(l,cx,cy+60)};
  stat(0,z.best?z.best.v:'–','היום הכי טוב','#ddd2fb');stat(1,z.streak,'ימים ברצף','#ffd3e7');stat(2,z.avg==null?'–':z.avg,'ממוצע השבוע','#e7f8a0');
  x.fillStyle='#1f1a2e';x.font='54px "Gveret Levin",cursive';x.fillText(`בממוצע ${fmtNum(z.stepsAvg)} צעדים ביום`,W/2,1030);x.font='70px "Suez One",serif';x.fillText('היום שלי',W/2,1250);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  try{const ok=await saveFile('היום-שלי-גיבוי-שבועי.png',blob);if(ok)toast('התמונה מוכנה')}catch(e){toast('לא הצלחנו להוריד')}
};
PAGES.join=r=>{S.ui.pendingJoin=r.a;if(S.mode==='api'&&!S.user)S.ui.auth=Object.assign(S.ui.auth||{},{tab:'register',email:'',pass:'',err:'',busy:false});setTimeout(()=>go(S.profile?'friends':'welcome'),0);return '<div class="splash">…</div>'};
