const avatarHtml=(p,cls='')=>`<span class="av ${cls}">${p&&p.avatar?`<img alt="" src="${esc(p.avatar)}">`:stickerSvg((p&&p.sticker)||'flower')}</span>`;
const stitle=(color,text,deco,lg)=>`<span class="stitle ${color}" ${lg?'':''}><span class="dc">${deco}</span>${esc(text)}</span>`;
const tapeEl=(c)=>`<span class="tape">${GX.tape(c)}</span>`;
function navHtml(r){
  const active=r==='day'||r==='zine'?'calendar':r==='friend'?'friends':r;
  const tabs=[['today','היום','sun'],['calendar','לוח שנה','cal'],['friends','חברים','people'],['postcards','גלויות','mail']];
  return `<header class="top"><a class="logo" href="#/today"><span>היום שלי</span><span style="width:44px;height:44px;display:block">${GX.flower(COL.pink,COL.lime)}</span></a><nav class="rail" aria-label="ניווט ראשי">${tabs.map(t=>`<a class="tab ${active===t[0]?'on':''}" href="#/${t[0]}" ${active===t[0]?'aria-current="page"':''}>${ico(t[2],22)}<span>${t[1]}</span></a>`).join('')}</nav><button class="me" data-act="settings" aria-label="הפרופיל שלי">${avatarHtml(S.profile)}<b>${esc(S.profile.name)}</b></button></header>`;
}
/* ---------------- welcome ---------------- */
const welcomeShell=panel=>`<div class="ob"><div class="in-wrap two">
 <div class="h-title" style="text-align:center;justify-self:center"><div style="position:relative;display:inline-block"><span class="dec" style="inset-inline-start:-120px;top:-20px;width:110px">${GX.flower(COL.pink,COL.lime)}</span><span class="dec" style="inset-inline-end:-30px;width:90px;top:-70px">${GX.sparkle(COL.lime)}</span><h1>היום שלי</h1></div>
 <p class="pt" style="margin-top:16px">משימות, לו״ז, אוכל וצעדים. ובסוף היום מדבקה.</p>
 <div class="score-cl" style="justify-content:center;margin-top:26px"><div class="score-big" style="transform:rotate(-7deg)">${GX.badge(COL.orange,14)}<div class="in-t"><small>הציון שלי היום</small><span class="n">87</span><small>יום מעולה!</small></div></div></div></div>
 <div class="sheetwrap big"><div class="panel" style="background:var(--lav-l);z-index:1">${tapeEl('var(--tape)')}${panel}</div></div></div></div>`;
const classicPanel=()=>`<h2 class="suez" style="font-size:clamp(36px,5vw,56px)">בואו נתחיל</h2>
  <p class="ptn">הדף היומי הצבעוני שלך, שנשמר בענן ועובד בכל מכשיר.</p>
  <p class="pts">הכניסה מתבצעת אוטומטית דרך חשבון claude.ai שלך. אין סיסמה נוספת.</p>
  <button class="btn primary big block" data-act="start">${ico('check',22)} התחלה</button><div class="pts" style="opacity:.6">גרסה ${VERSION}</div>`;
PAGES.welcome=()=>welcomeShell(S.apiAvail?authPanel():classicPanel());
ACT.start=()=>{S.setup=null;S.ui.editSetup=false;go('setup')};
/* ---------------- setup ---------------- */
function initSetup(){const p=S.profile;let d='',m='',y='';if(p&&p.birth){[y,m,d]=p.birth.split('-')}S.setup={name:p?p.name:'',d:d?+d:'',m:m?+m:'',y:y||'',avatar:p?p.avatar||null:null,sticker:p?p.sticker||'flower':'flower',goal:p?p.stepsGoal||8000:8000,err:''}}
const goalFieldHtml=(g,presets=true)=>`<div class="field"><label>יעד צעדים יומי (מינימום)</label><div class="stepper"><button type="button" class="icbtn big" data-act="goal-step" data-n="500" aria-label="הוספה">${ico('plus',24)}</button><div class="val"><input type="number" inputmode="numeric" min="0" step="500" value="${g}" data-in="goal-input" aria-label="יעד צעדים"><small>צעדים</small></div><button type="button" class="icbtn big" data-act="goal-step" data-n="-500" aria-label="הפחתה">${ico('minus',24)}</button></div>
 ${presets?`<div class="opts" style="justify-content:flex-start">${[5000,8000,10000,12000].map(n=>`<button type="button" class="chip ${g==n?'on':''}" data-act="goal-set" data-n="${n}">${fmtNum(n)}</button>`).join('')}</div>`:''}
 <div class="hint">${ico('check',16)} עמידה ביעד שווה 20% מהציון היומי</div></div>`;
const avatarEditHtml=(st)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div style="position:relative;width:180px;height:170px;display:grid;place-items:center"><span class="dec" style="inset:0;width:170px;height:170px;margin:auto">${GX.blob(COL.lime,3)}</span><span style="position:relative;width:150px;height:150px;display:block">${st.avatar?`<span class="av l" style="width:150px;height:150px">${`<img alt="" src="${esc(st.avatar)}">`}</span>`:stickerSvg(st.sticker)}</span></div>
 <input id="avfile" type="file" accept="image/*" hidden data-ch="avatar-file"><button type="button" class="btn sticker" style="font-size:28px" data-act="pick-avatar">${ico('camera',26)} העלאת תמונה</button>
 <div class="pts">או בחרו מדבקה במקום</div><div class="opts">${STICKERS.map(s=>`<button type="button" class="opt ${!st.avatar&&st.sticker===s[0]?'on':''}" data-act="pick-sticker" data-id="${s[0]}" aria-label="מדבקה">${s[1]()}</button>`).join('')}</div></div>`;
PAGES.setup=()=>{
  if(!S.setup)initSetup();const st=S.setup;
  return `<div class="ob"><div class="in-wrap" style="max-width:1100px"><div class="sheetwrap big"><div class="panel" style="z-index:1;gap:22px">${tapeEl()}
  <div class="steps-top"><div class="dots-s"><i></i><i class="a"></i><i class="d"></i></div><span class="ptn">${S.ui.editSetup?'עריכת פרופיל':'שלב 2 מתוך 3'}</span></div>
  <div><h2 class="suez" style="font-size:clamp(36px,5vw,56px)">ספרו לנו עליכם</h2><p class="pt">ככה העמוד היומי יהיה באמת שלכם</p></div>
  <div data-submit="save-setup" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:34px;align-items:start">
   <div class="stack" style="gap:18px">
    <div class="field"><label for="nm">איך קוראים לך?</label><input id="nm" class="in ${st.name?'ok':''}" value="${esc(st.name)}" maxlength="24" data-in="setup-name" data-focus="1" autocomplete="given-name"></div>
    <div class="field"><label>תאריך לידה (אופציונלי)</label><div class="twin" style="grid-template-columns:1fr 1fr 1.3fr;gap:10px"><input class="in num" inputmode="numeric" placeholder="יום" maxlength="2" value="${st.d}" data-in="setup-d" aria-label="יום"><input class="in num" inputmode="numeric" placeholder="חודש" maxlength="2" value="${st.m}" data-in="setup-m" aria-label="חודש"><input class="in num" inputmode="numeric" placeholder="שנה" maxlength="4" value="${st.y}" data-in="setup-y" aria-label="שנה"></div><div class="hint">${ico('check',16)} ככה נדע לשלוח לך מדבקה ביום ההולדת</div></div>
    ${goalFieldHtml(st.goal)}
    ${st.err?`<div class="err-t">${esc(st.err)}</div>`:''}
    <div class="acts" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><button class="btn primary" type="button" data-act="submit">${S.ui.editSetup?'שמירה':'יאללה, מתחילים'} ${GX?'':''}</button>${S.ui.editSetup?`<button class="btn secondary" type="button" data-act="cancel-setup">ביטול</button>`:`<span class="pts">אפשר לשנות הכול אחר כך</span>`}</div>
   </div>
   ${avatarEditHtml(st)}
  </div></div></div></div></div>`;
};
INP['setup-name']=el=>{S.setup.name=el.value;el.classList.toggle('ok',!!el.value.trim())};
INP['setup-d']=el=>{S.setup.d=el.value.replace(/\D/g,'')};INP['setup-m']=el=>{S.setup.m=el.value.replace(/\D/g,'')};INP['setup-y']=el=>{S.setup.y=el.value.replace(/\D/g,'')};
INP['goal-input']=el=>{S.setup.goal=Math.max(0,parseInt(el.value||'0',10)||0)};
function setupRefresh(){const ae=document.activeElement;render(true)}
ACT['goal-step']=el=>{const t=S.popup&&S.popup.type==='settings'?S.popup.d.st:S.setup;t.goal=Math.max(0,(+t.goal||0)+(+el.dataset.n));if(S.popup&&S.popup.type==='settings')renderPopup();else render(true)};
ACT['goal-set']=el=>{const t=S.popup&&S.popup.type==='settings'?S.popup.d.st:S.setup;t.goal=+el.dataset.n;if(S.popup&&S.popup.type==='settings')renderPopup();else render(true)};
ACT['pick-avatar']=()=>{const f=$('#avfile');if(f)f.click()};
ACT['pick-sticker']=el=>{const t=S.popup&&S.popup.type==='settings'?S.popup.d.st:S.setup;t.sticker=el.dataset.id;t.avatar=null;if(S.popup&&S.popup.type==='settings')renderPopup();else render(true)};
INP['avatar-file']=async el=>{const f=el.files&&el.files[0];if(!f)return;try{const url=await resizeImage(f,200,.8);const t=S.popup&&S.popup.type==='settings'?S.popup.d.st:S.setup;t.avatar=url;if(S.popup&&S.popup.type==='settings')renderPopup();else render(true)}catch(e){toast('לא הצלחנו לקרוא את התמונה')}};
function buildProfile(st,old){
  const name=(st.name||'').trim();if(!name)return{err:'צריך לכתוב שם קודם'};
  let birth='';if(st.d||st.m||st.y){const d=+st.d,m=+st.m,y=+st.y;const dt=new Date(y,m-1,d);if(!(y>1900&&y<=new Date().getFullYear()&&m>=1&&m<=12&&d>=1&&dt.getMonth()===m-1))return{err:'תאריך הלידה לא נראה תקין'};birth=`${y}-${pad2(m)}-${pad2(d)}`}
  return{p:Object.assign({hidden:[],blocked:[],noCards:[],created:todayStr(),code:genCode()},old||{},{name,birth,avatar:st.avatar||null,sticker:st.sticker||'flower',stepsGoal:Math.max(0,+st.goal||0)})};
}
SUB['save-setup']=()=>{const r=buildProfile(S.setup,S.profile);if(r.err){S.setup.err=r.err;return render(true)}
  const first=!S.profile;S.profile=r.p;Store.saveProfile();S.ui.editSetup=false;S.setup=null;if(S.mode==='api'&&S.user&&!Social.on){Social=SocialApi;Social.init()}toast(first?'ברוכים הבאים!':'הפרופיל נשמר');go('today')};
ACT['cancel-setup']=()=>{S.ui.editSetup=false;S.setup=null;go('today')};
/* ---------------- today / day ---------------- */
const MSGS=['יום חדש, עמוד חדש — בואו נצבע אותו!','קפה, מוזיקה, ויאללה','כל מדבקה מתחילה בדף ריק','צעד אחרי צעד, מדבקה אחרי מדבקה','היום הולך להיות ממש בסדר','קטן ויציב מנצח גדול ומתיש'];
const canEdit=date=>{const t=todayStr();if(date>=t)return true;if(date===addDays(t,-1)&&new Date().getHours()<4)return true;return false};
const WAVE_I=`<i><svg viewBox="0 0 12 14" width="12" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 0q4 3.5 0 7t0 7"/></svg></i>`;
const moreBtn=(act,id,extra='')=>`<button class="more" data-act="${act}" data-menu data-id="${id}" ${extra} aria-label="אפשרויות"><i></i><i></i><i></i></button>`;
function chipsHtml(c){
  const get=k=>c.parts.find(p=>p.k===k);const t=get('tasks'),s=get('schedule'),f=get('food'),w=get('steps');
  const one=(col,l,v)=>`<span class="chipx" style="background:var(--${col})"><b>${v}</b>${l}</span>`;
  return `<div class="chips">${one('pink','משימות',t?`${t.a}/${t.b}`:'–')}${one('lime','לו״ז',s?`${s.a}/${s.b}`:'–')}${one('lav','אוכל',f?`${f.a}/${f.b}`:'–')}${one('green','צעדים',w?Math.round(w.f*100)+'%':'–')}</div>`;
}
function scoreBig(c){
  if(c.score===100)return `<div class="score-big p100" aria-label="הציון שלי היום: 100. יום מושלם">${GX.flower100()}<div class="in-t"><span class="n n3">100</span></div><div class="p100cap">הציון שלי היום · יום מושלם!</div></div>`;
  const t=tierOf(c.score);const shape=c.score===100?GX.flower100():t==='great'?GX.badge(COL.orange,14):t==='good'?GX.badge(COL.lime,12):t==='soft'?GX.blob(COL.lav,5):`<svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 6"/></svg>`;
  return `<div class="score-big" ${t==='none'?'style="color:var(--ink)"':''}>${shape}<div class="in-t" ${t==='none'?'style="color:var(--ink)"':''}><small>הציון שלי היום</small><span class="n ${c.score===100?'n3':''}">${c.score==null?'—':c.score}<small style="font-size:.3em">${c.score==null?'':'/100'}</small></span><small>${praise(c.score)}</small></div></div>`;
}
function headerHtml(date,ro){
  const d=dayOf(date),c=calc(d,goal());const msg=ro?'ככה נראה היום ההוא':MSGS[(pdate(date).getDate()+pdate(date).getMonth())%MSGS.length];
  return `<div class="hero"><div class="h-title"><span class="fl">${GX.flower(COL.pink,COL.lime)}</span><span class="blob">${GX.blob(COL.pink,2)}</span><h1>היום שלי</h1><div class="datetag">${tapeEl()}${esc(longDate(date))}</div><div class="msg hand"><span style="width:60px">${ico('right',54,1.6)}</span><span>${esc(msg)}</span></div></div>
  <div class="score-cl">${scoreBig(c)}<div class="stack" style="gap:10px">${chipsHtml(c)}<button class="linkbtn" data-act="score-info" data-d="${date}">איך הציון מחושב?<i>i</i></button></div></div></div>`;
}
function tasksHtml(date,ro){
  const d=dayOf(date);
  const rows=d.tasks.map(t=>`<div class="task ${t.done?'done':''}"><button class="ck ${t.done?'on':''}" data-act="toggle-task" data-id="${t.id}" ${ro?'disabled':''} aria-label="${esc(t.title)} — ${t.done?'בוצע':'לא בוצע'}" aria-pressed="${!!t.done}">${t.done?ico('check',22,3):''}</button><span class="lab">${esc(t.title)}</span>${t.done?`<span style="width:22px;display:block;flex:none">${GX.sparkle(COL.pink)}</span>`:''}${ro?'':moreBtn('menu-task',t.id)}</div>`).join('');
  const add=ro?'':(S.ui.addTask?`<div class="addform" data-submit="add-task"><input class="in" data-focus="1" maxlength="80" placeholder="מה צריך לעשות?" aria-label="משימה חדשה"><button class="btn primary" type="button" data-act="submit">${ico('check',20)}</button><button class="icbtn big" type="button" data-act="cancel-add-task" aria-label="ביטול">${ico('x',22)}</button></div>`:`<button class="addrow" data-act="show-add-task"><span class="pl">${ico('plus',22,3)}</span>הוספת משימה</button>`);
  return `<section class="stack" style="gap:30px" aria-label="המשימות שלי"><div>${stitle('pink','המשימות שלי',GX.star(COL.lime))}</div><div class="tlist" style="margin-top:6px">${rows||(ro?'<div class="empty">לא היו משימות ביום הזה</div>':'')}</div>${add}</section>`;
}
ACT['show-add-task']=()=>{S.ui.addTask=true;render(true)};ACT['cancel-add-task']=()=>{S.ui.addTask=false;render(true)};
SUB['add-task']=f=>{const v=$('input',f).value.trim();if(!v){S.ui.addTask=false;return render(true)}const t=todayStr();const d=ensureDay(S.ui.date||t);d.tasks.push({id:rid(),title:v,done:false});Store.saveDay(S.ui.date||t);S.ui.addTask=true;render(true)};
ACT['toggle-task']=el=>{const dt=S.ui.date;if(!canEdit(dt))return;const t=ensureDay(dt).tasks.find(x=>x.id===el.dataset.id);if(t){t.done=!t.done;Store.saveDay(dt);render(true)}};
ACT['menu-task']=el=>openMenu([{act:'edit-task',ic:'pencil',t:'עריכה',data:{id:el.dataset.id}},{act:'ask-del-task',ic:'trash',t:'מחיקה',red:1,data:{id:el.dataset.id}}],el);
function stepsHtml(date,ro){
  const d=dayOf(date),g=goal(),st=d.steps||0,pct=g?Math.min(100,Math.round(st/g*100)):0,full=g&&st>=g;
  return `<div class="steps"><div class="rowb">${ro?'<span></span>':`<button class="btn secondary sm" data-act="steps-popup">עדכון צעדים</button>`}<span class="pt">הצעדים שלי</span></div>
  <div class="rowb"><div class="row" style="align-items:baseline"><span class="suez num">${fmtNum(st)}</span><b>צעדים</b></div><div class="pts">${g?(full?`היעד הושג! +${fmtNum(st-g)}`:`מתוך יעד של ${fmtNum(g)}`):'לא הוגדר יעד'}</div></div>
  <div class="track ${full?'full':''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>`;
}
const sortBlocks=a=>a.slice().sort((x,y)=>(x.start||'').localeCompare(y.start||''));
function blockHtml(b,ro){
  const st=b.status||'planned';
  const ic=st==='done'?ico('check',20,3):st==='missed'?ico('x',20,3):'';
  const lab=st==='done'?'עמדתי בלו״ז':st==='missed'?'לא הפעם':'עוד לא סימנתי';
  return `<div class="block ${st}"><div class="range"><span>${esc(b.start)}</span>${WAVE_I}<span>${esc(b.end)}</span></div><div class="bt"><b>${esc(b.title)}</b>${b.note?`<span class="note-in"><span>${esc(b.note.start)}–${esc(b.note.end)}</span><span>${esc(b.note.title||'הפסקה')}</span></span>`:''}</div><button class="sico ${st}" data-act="cycle-block" data-id="${b.id}" ${ro?'disabled':''} title="${lab}" aria-label="${esc(b.title)}: ${lab}">${ic}</button>${ro?'':moreBtn('menu-block',b.id)}</div>`;
}
function scheduleHtml(date,ro){
  const d=dayOf(date);const sico=(c,i)=>`<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;border:2px ${i==='p'?'solid':'dashed'} var(--ink);background:${c};color:var(--ink-fixed)">${i==='d'?ico('check',14,3):i==='m'?ico('x',14,3):''}</span>`;
  return `<div class="sheetwrap"><section class="sheet" aria-label="הלו״ז שלי">${stitle('lime','הלו״ז שלי',GX.sparkle(COL.pink))}<div class="legend"><span>${sico('var(--green)','d')}עמדתי בלו״ז</span><span>${sico('var(--pink-l)','m')}לא הפעם</span><span>${sico('var(--card)','p')}עוד לא</span></div>
  <div class="blocks">${d.blocks.length?sortBlocks(d.blocks).map(b=>blockHtml(b,ro)).join(''):`<div class="empty">${ro?'לא היו פעילויות ביום הזה':'עדיין אין פעילויות להיום'}</div>`}</div>${ro?'':`<button class="btn primary block big" style="margin-top:18px" data-act="add-block">${ico('plus',22,3)} הוספת פעילות</button>`}</section></div>`;
}
ACT['cycle-block']=el=>{const dt=S.ui.date;if(!canEdit(dt))return;const b=ensureDay(dt).blocks.find(x=>x.id===el.dataset.id);if(!b)return;b.status=b.status==='planned'||!b.status?'done':b.status==='done'?'missed':'planned';Store.saveDay(dt);render(true)};
ACT['menu-block']=el=>openMenu([{act:'edit-block',ic:'pencil',t:'עריכה',data:{id:el.dataset.id}},{act:'edit-block',ic:'cup',t:'הוספת הפסקה',data:{id:el.dataset.id,brk:1}},{act:'ask-del-block',ic:'trash',t:'מחיקה',red:1,data:{id:el.dataset.id}}],el);
function journalHtml(date,ro){return `<div class="journal">${tapeEl('var(--tape)')}<div class="pt">איך היה היום, בפועל?</div><textarea data-in="journal" data-auto placeholder="${ro?'':'כתבו כאן…'}" ${ro?'readonly':''} aria-label="יומן היום">${esc(dayOf(date).journal)}</textarea></div>`}
let jt=null;INP.journal=el=>{const dt=S.ui.date;if(!canEdit(dt))return;ensureDay(dt).journal=el.value;el.style.height='auto';el.style.height=Math.max(el.scrollHeight,200)+'px';clearTimeout(jt);jt=setTimeout(()=>Store.saveDay(dt),900)};
const FLOWERS={breakfast:()=>GX.flower(COL.pink,COL.lime),lunch:()=>GX.flower(COL.lime,COL.pink),dinner:()=>GX.flower(COL.lav,COL.orange),snack:()=>GX.star(COL.pink)};
function foodTotals(day){let k=0,p=0,ai=false,any=false;for(const m of Object.values(day.meals)){const a=m.actual;if(!a)continue;if(a.kcal!=null){k+=+a.kcal;any=true}if(a.protein!=null){p+=+a.protein;any=true}if(a.ai)ai=true}return{k,p,ai,any}}
function foodHtml(date,ro){
  const d=dayOf(date),t=foodTotals(d);
  let wave='M0 34';for(let i=0;i<6;i++)wave+=`q30 -30 60 0t60 0`;
  const meal=([k,name])=>{const m=d.meals[k];const a=m.actual;
    const plan=S.ui.editPlan===k&&!ro?`<div class="slip"><span class="lb">תכנון</span><input class="planin" data-focus="1" data-k="${k}" value="${esc(m.plan)}" maxlength="80" data-in="plan-input" aria-label="תכנון ל${esc(name)}"></div>`
      :`<${ro?'div':'button'} class="slip plan" ${ro?'':`data-act="edit-plan" data-k="${k}"`}><span class="lb">תכנון</span><span class="x">${m.plan?esc(m.plan):`<span style="opacity:.6">${ro?'לא תוכנן':'מה מתכננים לאכול?'}</span>`}</span></${ro?'div':'button'}>`;
    let act='';
    if(a){const fol=a.followed!==false;act=`<div class="slip act ${fol?'fol':'dif'}">${ro?'':moreBtn('menu-meal',k,'style="position:absolute;inset-inline-end:8px;top:8px"')}<span class="lb">בפועל</span><span class="x">${esc(a.text)}</span>${(a.kcal!=null||a.protein!=null)?`<div class="nchips">${a.kcal!=null?`<span class="nchip" style="background:var(--pink)">${a.ai?'≈ ':''}${fmtNum(a.kcal)} קל׳</span>`:''}${a.protein!=null?`<span class="nchip" style="background:var(--lime)">${a.ai?'≈ ':''}${fmtNum(a.protein)} ג׳ חלבון</span>`:''}</div>`:''}<span class="hand" style="font-size:20px;display:flex;gap:6px;align-items:center">${m.plan?(fol?`${ico('check',18,3)} כמו שתכננתי`:`★ קצת אחרת`):''}</span></div>`}
    else act=ro?`<div class="slip empty-act"><span class="lb">בפועל</span><span class="x" style="opacity:.6">לא מולא</span></div>`:`<button class="slip empty-act" data-act="add-food" data-k="${k}"><span class="lb">בפועל</span><span class="x" style="opacity:.6">מה אכלת בפועל?</span></button>`;
    const quick=(!ro&&!a&&m.plan&&m.plan.trim()&&S.ui.editPlan!==k)?`<button class="chip lime-q" style="align-self:flex-start;background:var(--lime);border-style:solid;color:var(--ink-fixed)" data-act="ate-plan" data-k="${k}">${ico('check',16,3)} אכלתי כמו שתכננתי</button>`:'';
    return `<div class="meal"><h3><span style="width:42px;height:42px;display:block;flex:none">${FLOWERS[k]()}</span>${name}</h3>${plan}${quick}${act}</div>`};
  return `<section class="foodband" aria-label="מה אוכלים היום?"><svg class="wave" viewBox="0 0 720 60" preserveAspectRatio="none" aria-hidden="true"><path d="${wave}V70H0Z" fill="var(--green)"/><path d="${wave}" fill="none" stroke="var(--ink)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
  <span class="stitle lav" style="top:30px"><span class="dc">${GX.flower(COL.pink,COL.lime)}</span>מה אוכלים היום?</span>
  <div class="fin"><div class="ftool">
   <div class="ntotal">${tapeEl('var(--tape)')}<div class="rowb"><span class="pt">אכלתי היום</span>${t.ai?`<span class="chip" style="background:var(--lav-l);border-style:solid">כולל הערכות AI</span>`:''}</div>
   <div class="rowb" style="gap:18px;flex-wrap:nowrap"><div class="itm"><span class="stk" style="width:70px;height:70px;transform:rotate(-5deg)">${GX.badge(COL.orange,14)}<span style="font-size:${t.k>9999?18:t.k>999?21:26}px">${t.any||t.k?fmtNum(t.k):'0'}</span></span><div><b>קלוריות</b><div class="pts">עד עכשיו</div></div></div><div class="itm"><span class="stk" style="width:70px;height:70px;transform:rotate(4deg)">${GX.badge(COL.lime,12)}<span style="font-size:26px">${fmtNum(t.p)}</span></span><div><b>גרם חלבון</b><div class="pts">עד עכשיו</div></div></div></div></div>${ro?'<span></span>':`<button class="btn sticker" data-act="add-food">+ הוספת אוכל</button>`}</div>
  <div class="meals">${MEALS.map(meal).join('')}</div>
  <div class="signoff"><span>${GX.flower(COL.lime,COL.pink)}</span>נתראה מחר, עמוד חדש מחכה לנו!<span>${GX.flower(COL.pink,COL.lime)}</span></div></div></section>`;
}
ACT['edit-plan']=el=>{S.ui.editPlan=el.dataset.k;render(true)};
INP['plan-input']=el=>{const k=el.dataset.k;ensureDay(S.ui.date).meals[k].plan=el.value;clearTimeout(INP._pt);INP._pt=setTimeout(()=>Store.saveDay(S.ui.date),700)};
document.addEventListener('focusout',e=>{if(e.target&&e.target.matches&&e.target.matches('.planin')){S.ui.editPlan=null;Store.saveDay(S.ui.date);render(true)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('.planin'))e.target.blur()});
ACT['menu-meal']=el=>openMenu([{act:'add-food',ic:'pencil',t:'עריכה',data:{k:el.dataset.id,edit:1}},{act:'ask-del-meal',ic:'trash',t:'מחיקה',red:1,data:{id:el.dataset.id}}],el);
function dayPage(date){
  S.ui.date=date;const ro=!canEdit(date);const isToday=date===todayStr();
  const banner=(ro?`<div class="arch"><div class="banner lav">${ico('lock',18)} עמוד מהארכיון · נסגר בחצות · לעיון בלבד</div><a class="btn secondary" href="#/calendar">חזרה ללוח השנה</a></div>`:(!isToday?`<div class="arch"><div class="banner lav">${ico('cal',18)} מתכננים יום עתידי</div><a class="btn secondary" href="#/today">חזרה להיום</a></div>`:''));
  return `<main class="page">${verifyBanner()}${S.dbfail&&S.mode==='db'?'<div class="dbwarn">השמירה בענן לא זמינה לך כרגע (אולי יש לך הרשאת צפייה בלבד). הנתונים נשמרים במכשיר הזה.</div>':''}${banner}${headerHtml(date,ro)}
  <div class="cols"><div class="c2 stack">${tasksHtml(date,ro)}${journalHtml(date,ro)}</div><div class="c2 stack" style="gap:40px">${scheduleHtml(date,ro)}${stepsHtml(date,ro)}</div></div></main>${foodHtml(date,ro)}`;
}
PAGES.today=()=>dayPage(todayStr());
PAGES.day=r=>{const d=r.a;if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return dayPage(todayStr());if(d===todayStr())return dayPage(d);return dayPage(d)};
/* ---------------- calendar ---------------- */
PAGES.calendar=()=>{
  const now=new Date();if(!S.cal)S.cal={y:now.getFullYear(),m:now.getMonth()};const {y,m}=S.cal;
  const first=new Date(y,m,1),off=first.getDay(),n=new Date(y,m+1,0).getDate(),rows=Math.ceil((off+n)/7);const t=todayStr();
  let cells='';for(let i=0;i<rows*7;i++){const dn=i-off+1;let s,out=false,num;
    if(dn<1){const d=new Date(y,m,dn);s=dstr(d);num=d.getDate();out=true}else if(dn>n){const d=new Date(y,m,dn);s=dstr(d);num=d.getDate();out=true}else{s=`${y}-${pad2(m+1)}-${pad2(dn)}`;num=dn}
    if(out){cells+=`<div class="cell out"><span class="d">${num}</span></div>`;continue}
    const sc=scoreOf(s);const tr=tierOf(sc);
    if(s===t)cells+=`<button class="cell today" data-act="open-day" data-d="${s}" aria-label="היום, ${num}"><span class="d">${num}</span><span class="stk" style="aspect-ratio:1">${sc===100?GX.flower100():GX.blob(COL.pink,2)}<span class="${sc===100?'n3':''}">${sc==null?'היום':sc}</span></span></button>`;
    else if(s>t)cells+=`<button class="cell fut" data-act="open-day" data-d="${s}" aria-label="${num}, יום עתידי"><span class="d" style="opacity:.55">${num}</span></button>`;
    else if(sc==null)cells+=`<button class="cell emp" data-act="open-day" data-d="${s}" aria-label="${num}, בלי תכנון"><span class="d" style="opacity:.55">${num}</span><span class="ring"></span></button>`;
    else cells+=`<button class="cell" data-act="open-day" data-d="${s}" aria-label="${num}, ציון ${sc}"><span class="d">${num}</span><span class="stk" style="aspect-ratio:1;transform:rotate(${tr==='great'?-6:tr==='good'?5:-4}deg)">${tierShape(tr,sc)}<span class="${sc===100?'n3':''}">${sc}</span></span></button>`;
  }
  const st=monthStats(y,m);const avgT=tierOf(st.avg);const sk=streak();
  const leg=(sh,l,c)=>`<div class="lr"><span class="stk" style="aspect-ratio:1">${sh}</span><span class="grow">${l}</span><span class="suez">${c}</span></div>`;
  return `<main class="page"><div class="calhead"><div class="row" style="gap:14px;flex-wrap:wrap">${stitle('org','לוח השנה שלי',GX.sparkle(COL.lime))}</div><div class="mnav"><button class="icbtn big" data-act="cal-next" aria-label="חודש הבא">${ico('left',24)}</button><span class="suez" id="monthlbl" aria-live="polite">${HMON[m]} ${y}</span><button class="icbtn big" data-act="cal-prev" aria-label="חודש קודם">${ico('right',24)}</button><button class="btn secondary sm" data-act="cal-today">חזרה להיום</button></div></div>
  <div class="cols"><div class="c3"><div class="sheetwrap alt"><div class="sheet white" style="padding:26px 24px 18px;border-radius:56px 20px 56px 20px">${tapeEl('var(--tape)')}<div class="calgrid">${WD.map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div><div class="hint" style="justify-content:flex-start;margin-top:12px">${ico('check',16)} לחצו על יום כדי לפתוח את הדף שלו</div></div></div></div>
  <div class="c1 sumcol"><div style="align-self:center;width:200px;height:200px;position:relative;transform:rotate(-4deg)" aria-label="ממוצע חודשי">${st.avg==null?`<svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 6"/></svg>`:tierShape(avgT,st.avg===100?99:st.avg)}<div class="in-t" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:${st.avg==null?'var(--ink)':'var(--ink-fixed)'}"><small class="hand" style="font-size:18px">ממוצע ${HMON[m]}</small><span class="suez" style="font-size:56px;line-height:1">${st.avg==null?'—':st.avg}</span><small class="hand" style="font-size:18px">${praise(st.avg)}</small></div></div>
  <div class="statn" style="background:var(--lime-l)"><b>${sk}</b>הרצף הנוכחי</div><div class="statn" style="background:var(--pink-l)"><b>${st.best==null?'–':st.best}</b>${st.bd?`היום הכי טוב (${shortDate(st.bd)})`:'היום הכי טוב'}</div><div class="statn" style="background:var(--lav-l)"><b>${st.great}</b>ימים מעולים</div>
  <div class="legbox"><div class="pt" style="font-size:26px">מה אומרות המדבקות?</div>${leg(GX.flower100(),'מושלם · 100',st.perfect)}${leg(GX.badge(COL.orange,14),'מעולה · 85+',st.great)}${leg(GX.badge(COL.lime,12),'טוב · 60–84',st.good)}${leg(GX.blob(COL.lav,3),'רך · עד 59',st.soft)}${leg(`<svg class="g" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" stroke-width="4" stroke-dasharray="8 8"/></svg>`,'חופש · בלי תכנון',st.emp)}</div>
  <a class="btn lime block" href="#/zine">${ico('mail',20)} הגיליון השבועי</a></div></div></main>`;
};
ACT['cal-prev']=()=>{S.cal.m--;if(S.cal.m<0){S.cal.m=11;S.cal.y--}render(true)};
ACT['cal-next']=()=>{S.cal.m++;if(S.cal.m>11){S.cal.m=0;S.cal.y++}render(true)};
ACT['cal-today']=()=>{const n=new Date();S.cal={y:n.getFullYear(),m:n.getMonth()};render(true)};
ACT['open-day']=el=>{const d=el.dataset.d;go(d===todayStr()?'today':'day/'+d)};
