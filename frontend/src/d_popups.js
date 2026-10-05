const popHead=(t)=>`<div class="hd"><button class="icbtn big" data-act="close-popup" aria-label="סגירה">${ico('x',22,3)}</button><span class="pt">${esc(t)}</span></div>`;
const popTape=(x)=>`<span class="tape" style="inset-inline-start:${x||'60%'}">${GX.tape()}</span>`;
ACT['close-popup']=()=>closePopup();
const ghostDel=(act)=>`<button class="ghost red" type="button" data-act="${act}">${ico('trash',18)} מחיקה</button>`;
/* ---------- task ---------- */
POP.task={label:'משימה',render:d=>`${popTape()}${popHead('עריכת משימה')}<div data-submit="save-task" class="stack" style="gap:14px"><div class="field"><label for="tt">מה צריך לעשות?</label><input id="tt" class="in" value="${esc(d.title)}" maxlength="80" data-focus="sel" data-in="task-title"></div><div class="acts">${d.id?ghostDel('ask-del-task-pop'):''}<span class="sp"></span><button class="btn secondary" type="button" data-act="close-popup">ביטול</button><button class="btn primary" type="button" data-act="submit">שמירה</button></div></div>`};
ACT['edit-task']=el=>{closeMenu();const t=dayOf(S.ui.date).tasks.find(x=>x.id===el.dataset.id);if(t)openPopup('task',{id:t.id,title:t.title})};
INP['task-title']=el=>{S.popup.d.title=el.value};
SUB['save-task']=()=>{const d=S.popup.d,v=(d.title||'').trim();if(!v)return;const t=ensureDay(S.ui.date).tasks.find(x=>x.id===d.id);if(t)t.title=v;Store.saveDay(S.ui.date);closePopup();render(true)};
/* ---------- confirm delete ---------- */
POP.confirm={label:'אישור מחיקה',render:d=>`${popTape()}<div class="hd"><button class="icbtn big" data-act="close-popup" aria-label="סגירה">${ico('x',22,3)}</button><span class="stk" style="width:64px;height:64px;transform:rotate(-6deg)">${GX.badge(COL.orange,14)}<span>${ico('trash',28)}</span></span></div><div class="pt">${esc(d.title)}</div><p>${esc(d.body)}</p><div class="acts"><span class="sp"></span><button class="btn secondary" data-act="close-popup">ביטול</button><button class="btn danger" data-act="do-confirm" data-focus="1">כן, למחוק ${ico('trash',20)}</button></div>`};
const CONFIRM={
  task:id=>{const d=ensureDay(S.ui.date);d.tasks=d.tasks.filter(t=>t.id!==id);Store.saveDay(S.ui.date)},
  block:id=>{const d=ensureDay(S.ui.date);d.blocks=d.blocks.filter(t=>t.id!==id);Store.saveDay(S.ui.date)},
  meal:k=>{const d=ensureDay(S.ui.date);d.meals[k].actual=null;Store.saveDay(S.ui.date)},
};
const ask=(kind,id,title,body)=>{closeMenu();openPopup('confirm',{kind,id,title,body})};
ACT['ask-del-task']=el=>ask('task',el.dataset.id,'למחוק את המשימה?','הפעולה תסיר אותה מהיום הזה, ואי אפשר לבטל אותה.');
ACT['ask-del-task-pop']=()=>ask('task',S.popup.d.id,'למחוק את המשימה?','הפעולה תסיר אותה מהיום הזה, ואי אפשר לבטל אותה.');
ACT['ask-del-block']=el=>ask('block',el.dataset.id,'למחוק את הפעילות?','הפעולה תסיר אותה מהיום הזה, ואי אפשר לבטל אותה.');
ACT['ask-del-block-pop']=()=>ask('block',S.popup.d.id,'למחוק את הפעילות?','הפעולה תסיר אותה מהיום הזה, ואי אפשר לבטל אותה.');
ACT['ask-del-meal']=el=>ask('meal',el.dataset.id,'למחוק את מה שאכלת?','נמחק רק החלק של "בפועל". התכנון נשאר.');
ACT['do-confirm']=()=>{const c=S.popup.d;CONFIRM[c.kind](c.id);closePopup();render(true);toast('נמחק')};
/* ---------- activity (with break) ---------- */
POP.block={label:'פעילות',cls:'w',render:d=>`${popTape()}<div class="hd"><button class="icbtn big" data-act="close-popup" aria-label="סגירה">${ico('x',22,3)}</button>${d.id?ghostDel('ask-del-block-pop'):''}<span class="pt">${d.id?'עריכת פעילות':'פעילות חדשה'}</span></div>
<div data-submit="save-block" class="stack" style="gap:14px"><div class="field"><label for="bn">מה עושים?</label><input id="bn" class="in" value="${esc(d.title)}" maxlength="60" data-in="b-title" ${d.brk?'':'data-focus="1"'} placeholder="למשל: עבודה על הפרויקט"></div>
<div class="twin"><div class="field"><label for="bs">משעה</label><input id="bs" class="in" type="time" value="${esc(d.start)}" data-in="b-start"></div><div class="field"><label for="be">עד שעה</label><input id="be" class="in" type="time" value="${esc(d.end)}" data-in="b-end"></div></div>
${d.brk?`<div class="stack" style="gap:8px"><div class="row" style="gap:8px">${ico('cup',20)}<b>הפסקה בתוך הפעילות</b></div><div class="note solid" style="background:var(--lav-l);padding:12px;border-style:dashed;display:grid;gap:10px"><div class="field"><label for="bk">שם</label><input id="bk" class="in sm" value="${esc(d.bt)}" maxlength="30" data-in="b-bt" ${d.brk===2?'data-focus="1"':''}></div><div class="twin"><div class="field"><label>משעה</label><input class="in sm" type="time" value="${esc(d.bs)}" data-in="b-bs"></div><div class="field"><label>עד שעה</label><input class="in sm" type="time" value="${esc(d.be)}" data-in="b-be"></div></div><div><button type="button" class="ghost red" data-act="b-rmbrk">${ico('trash',16)} הסרת ההפסקה</button></div></div></div>`
:`<div class="stack" style="gap:6px;align-items:flex-start"><button type="button" class="ghost" data-act="b-addbrk">הוספת הפסקה בתוך הפעילות ${ico('cup',20)}</button><div class="hint">למשל 10:00–10:30 באמצע יום עבודה. אופציונלי</div></div>`}
${d.err?`<div class="err-t" role="alert">${esc(d.err)}</div>`:''}<div class="acts"><span class="sp"></span><button class="btn secondary" type="button" data-act="close-popup">ביטול</button><button class="btn primary" type="button" data-act="submit">שמירה</button></div></div>`};
function blockDefaults(){const n=new Date();const h=Math.min(23,n.getHours()+1);return{start:`${pad2(h)}:00`,end:`${pad2(Math.min(23,h+1))}:00`}}
ACT['add-block']=()=>{const df=blockDefaults();openPopup('block',{id:null,title:'',start:df.start,end:df.end,brk:0,bt:'הפסקה',bs:'',be:'',err:''})};
ACT['edit-block']=el=>{closeMenu();const b=dayOf(S.ui.date).blocks.find(x=>x.id===el.dataset.id);if(!b)return;const n=b.note;openPopup('block',{id:b.id,title:b.title,start:b.start,end:b.end,brk:n||el.dataset.brk?2:0,bt:n?n.title:'הפסקה',bs:n?n.start:'',be:n?n.end:'',err:'',status:b.status})};
INP['b-title']=el=>{S.popup.d.title=el.value};INP['b-start']=el=>{S.popup.d.start=el.value};INP['b-end']=el=>{S.popup.d.end=el.value};INP['b-bt']=el=>{S.popup.d.bt=el.value};INP['b-bs']=el=>{S.popup.d.bs=el.value};INP['b-be']=el=>{S.popup.d.be=el.value};
ACT['b-addbrk']=()=>{const d=S.popup.d;d.brk=2;if(!d.bs&&d.start&&d.end){const [h,m]=d.start.split(':').map(Number);const t=h*60+m+60;d.bs=`${pad2(Math.floor(t/60)%24)}:${pad2(t%60)}`;d.be=`${pad2(Math.floor((t+30)/60)%24)}:${pad2((t+30)%60)}`}renderPopup()};
ACT['b-rmbrk']=()=>{const d=S.popup.d;d.brk=0;d.bs='';d.be='';renderPopup()};
SUB['save-block']=()=>{
  const d=S.popup.d;const title=(d.title||'').trim();
  const fail=m=>{d.err=m;renderPopup()};
  if(!title)return fail('צריך לכתוב מה עושים');
  if(!d.start||!d.end)return fail('צריך לבחור שעות');
  if(d.end<=d.start)return fail('שעת הסיום צריכה להיות אחרי שעת ההתחלה');
  let note=null;
  if(d.brk){if(!d.bs||!d.be)return fail('צריך לבחור שעות להפסקה');if(d.be<=d.bs)return fail('ההפסקה צריכה להסתיים אחרי שהיא מתחילה');if(d.bs<d.start||d.be>d.end)return fail('ההפסקה צריכה להיות בתוך שעות הפעילות');note={title:(d.bt||'').trim()||'הפסקה',start:d.bs,end:d.be}}
  const day=ensureDay(S.ui.date);
  if(d.id){const b=day.blocks.find(x=>x.id===d.id);if(b){b.title=title;b.start=d.start;b.end=d.end;if(note)b.note=note;else delete b.note}}
  else{const b={id:rid(),title,start:d.start,end:d.end,status:'planned'};if(note)b.note=note;day.blocks.push(b)}
  Store.saveDay(S.ui.date);closePopup();render(true);toast(d.id?'הפעילות עודכנה':'הפעילות נוספה');
};
/* ---------- steps ---------- */
POP.steps={label:'עדכון צעדים',render:d=>`${popTape()}${popHead('עדכון צעדים')}<div class="field"><label>כמה צעדים עשית היום?</label><div class="stepper"><button class="icbtn big" type="button" data-act="st-step" data-n="500" aria-label="הוספה">${ico('plus',24)}</button><div class="val" style="background:var(--card);box-shadow:-3px 3px 0 var(--ink)"><input type="number" inputmode="numeric" min="0" step="100" value="${d.val}" data-in="st-input" data-focus="sel" aria-label="צעדים" style="width:7ch"><small>צעדים</small></div><button class="icbtn big" type="button" data-act="st-step" data-n="-500" aria-label="הפחתה">${ico('minus',24)}</button></div></div>
<div class="opts" style="justify-content:flex-start">${[500,1000,2000].map(n=>`<button class="chip pink" type="button" data-act="st-step" data-n="${n}">+${fmtNum(n)}</button>`).join('')}</div>
<div class="hint">${ico('check',16)} היעד: ${goal()?fmtNum(goal()):'לא הוגדר'} · עמידה בו שווה 20% מהציון</div>
<div class="acts"><span class="sp"></span><button class="btn secondary" data-act="close-popup">ביטול</button><button class="btn primary" data-act="st-save">שמירה</button></div>`};
ACT['steps-popup']=()=>openPopup('steps',{val:dayOf(S.ui.date).steps||0});
ACT['st-step']=el=>{const d=S.popup.d;d.val=Math.max(0,(+d.val||0)+(+el.dataset.n));renderPopup()};
INP['st-input']=el=>{S.popup.d.val=Math.max(0,parseInt(el.value||'0',10)||0)};
ACT['st-save']=()=>{const dt=S.ui.date;ensureDay(dt).steps=Math.max(0,+S.popup.d.val||0);Store.saveDay(dt);closePopup();render(true);const g=goal();toast(g&&S.days[dt].steps>=g?'היעד הושג! כל הכבוד':'הצעדים עודכנו')};
/* ---------- score breakdown ---------- */
POP.score={label:'איך נבנה הציון',cls:'w',render:d=>{const c=calc(dayOf(d.date),goal());const t=tierOf(c.score);
  const names={tasks:['משימות',COL.pink,`${'a'}`],schedule:['לו״ז',COL.lime],food:['אוכל',COL.lav],steps:['צעדים',COL.green]};
  const det=p=>p.k==='steps'?`${fmtNum(p.a)} מתוך ${fmtNum(p.b)}`:`${p.a} מתוך ${p.b}`;
  return `${popTape()}${popHead('איך נבנה הציון?')}<div class="rowb" style="flex-wrap:nowrap"><div><div class="pts">סכום החלקים</div><div class="suez" style="font-size:28px">${c.score==null?'עוד אין ציון':`= ${c.score} מתוך 100`}</div></div>${c.score==null?'':stk(t,c.score,92,-5)}</div>
  <div class="stack" style="gap:12px">${['tasks','schedule','food','steps'].map(k=>{const p=c.parts.find(x=>x.k===k);const n=names[k];return `<div class="row" style="gap:12px"><span class="suez" style="min-width:64px;font-size:20px;direction:ltr;text-align:center">${p?`${p.pts}/${p.share}`:'–'}</span><div class="track grow" style="height:18px;border-width:2px"><i style="width:${p?Math.round(p.f*100):0}%;background:${n[1]}"></i></div><div style="text-align:start;min-width:120px"><b>${n[0]} · ${p?p.share+'%':'לא נספר'}</b><div class="pts">${p?det(p):'לא תוכנן'}</div></div><span style="width:30px;height:30px;display:block;flex:none">${GX.blob(n[1],k.length)}</span></div>`}).join('')}</div>
  <p class="pts">כל חלק נספר לפי מה שתכננת, לא לפי כמה תכננת.</p><p class="pts">חלק שלא תכננת (למשל בלי יעד צעדים) לא נספר, והציון מתחלק מחדש.</p>`}};
ACT['score-info']=el=>openPopup('score',{date:el.dataset.d||S.ui.date});
/* ---------- food (AI optional) ---------- */
const spk=(w=16)=>GX.sparkle(COL.lime).replace('class="g "',`class="g" style="width:${w}px;height:${w}px"`);
function recentMeals(k){
  const seen=new Set(),same=[],other=[];const dates=Object.keys(S.days).sort().reverse().slice(0,90);
  for(const dt of dates){const ms=S.days[dt].meals||{};for(const mk of Object.keys(ms)){const a=ms[mk]&&ms[mk].actual;if(!a||!a.text)continue;const key=a.text.trim();if(seen.has(key))continue;seen.add(key);(mk===k?same:other).push({text:a.text,kcal:a.kcal,protein:a.protein,ai:!!a.ai,items:a.items||null})}}
  return same.concat(other).slice(0,6);
}
POP.food={label:'הוספת אוכל',cls:'w',render:d=>{
  const meal=dayOf(S.ui.date).meals[d.k]||{plan:''};const calcing=d.status==='calc';const rec=d.edit?[]:recentMeals(d.k);d.rec=rec;
  const main=d.ai
   ?`<div class="field"><label for="ft">מה אכלת? כתבו הכול ביחד, עם כמויות</label><textarea id="ft" class="in" rows="3" maxlength="400" data-in="f-text" data-focus="1" placeholder="למשל: שניצל אפוי 150 גרם, סלט ירקות, חצי כוס אורז">${esc(d.text)}</textarea><div class="hint">אין צורך לפרק לרכיבים. ה-AI יפרק בעצמו. ככל שיש יותר כמויות, ההערכה מדויקת יותר</div></div>`
   :`<div class="field"><label for="ft">מה אכלת?</label><input id="ft" class="in" value="${esc(d.text)}" maxlength="120" data-in="f-text" data-focus="1" placeholder="${esc(meal.plan||'למשל: שניצל אפוי עם סלט')}"></div><div class="twin"><div class="field"><label>קלוריות (אופציונלי)</label><input class="in sm num" inputmode="numeric" value="${esc(d.kcal)}" data-in="f-kcal"></div><div class="field"><label>חלבון בגרם (אופציונלי)</label><input class="in sm num" inputmode="numeric" value="${esc(d.protein)}" data-in="f-prot"></div></div>`;
  const est=d.est?`<div class="res"><div class="note solid" style="background:var(--pink-l)"><label class="lbl" for="ek">קלוריות</label><div class="row"><span class="suez" style="font-size:26px">≈</span><input id="ek" class="in sm num" style="font-family:'Suez One';font-size:26px" inputmode="numeric" value="${d.est.kcal}" data-in="f-ek"></div></div><div class="note solid" style="background:var(--lime-l)"><label class="lbl" for="ep">חלבון (גרם)</label><div class="row"><span class="suez" style="font-size:26px">≈</span><input id="ep" class="in sm num" style="font-family:'Suez One';font-size:26px" inputmode="numeric" value="${d.est.protein}" data-in="f-ep"></div></div></div>
   <details class="how"><summary>מה ה-AI חישב? ${spk(14)}</summary><ul style="margin:8px 0 2px;padding-inline-start:20px">${d.est.items.map(i=>`<li><b>${esc(i.name)}</b>${i.amount?` · ${esc(i.amount)}`:''} · ${i.kcal} קל׳ · ${i.protein} ג׳ חלבון</li>`).join('')}</ul></details><div class="hint">${spk(16)} זו הערכה. אפשר לתקן כל מספר ידנית</div>`:'';
  return `${popTape()}${popHead(d.edit?'עריכת אוכל':'הוספת אוכל')}
  <div class="opts" style="justify-content:flex-start" role="group" aria-label="איזו ארוחה">${MEALS.map(([k])=>`<button type="button" class="chip ${d.k===k?'on':''}" data-act="f-meal" data-k="${k}">${MEAL_SHORT[k]}</button>`).join('')}</div>
  ${rec.length?`<div class="stack" style="gap:6px"><span class="lbl">הוספה מהירה מארוחות קודמות</span><div class="quick">${rec.map((r,i)=>`<button type="button" class="chip" data-act="f-recent" data-i="${i}" title="${esc(r.text)}">${esc(r.text.length>20?r.text.slice(0,19)+'…':r.text)}${r.kcal!=null?` <small>${fmtNum(r.kcal)}</small>`:''}</button>`).join('')}</div></div>`:''}
  ${main}
  <div class="rowb" style="flex-wrap:nowrap;gap:14px"><div><b>חישוב קלוריות וחלבון עם AI</b><div class="hint">${spk(16)} אופציונלי. אפשר גם לדלג</div></div><button type="button" class="toggle ${d.ai?'on':''}" role="switch" aria-checked="${!!d.ai}" aria-label="חישוב עם AI" data-act="f-ai"><i></i></button></div>
  ${calcing?`<div class="banner lav" role="status"><span class="dots"><i></i><i></i><i></i></span><span class="grow">ה-AI מחשב את ההערכה…</span>${spk(24)}</div>`:''}
  ${d.status==='err'?`<div class="banner pink" role="alert"><span class="grow">${esc(d.errMsg||'לא הצלחנו לחשב עכשיו. אפשר לנסות שוב, או לשמור בלי חישוב.')}</span></div>`:''}
  ${est}
  ${meal.plan&&meal.plan.trim()?`<div class="row" style="gap:8px;flex-wrap:wrap"><b>כמו שתכננת?</b><button type="button" class="chip ${d.followed?'on':''}" data-act="f-fol" data-v="1">כמו שתכננתי</button><button type="button" class="chip ${!d.followed?'on':''}" data-act="f-fol" data-v="0">קצת אחרת</button></div>`:''}
  <div class="acts">${d.ai&&!d.est?'<button type="button" class="ghost" data-act="f-save-nocalc">שמירה בלי חישוב</button>':''}<span class="sp"></span><button class="btn secondary" type="button" data-act="close-popup">ביטול</button>${d.ai&&!d.est?`<button class="btn primary" type="button" data-act="f-calc" ${calcing?'disabled':''}>${d.status==='err'?'נסו שוב':'חשבו עם AI'} ${spk(22)}</button>`:`<button class="btn primary" type="button" data-act="f-save" ${calcing?'disabled':''}>שמירה</button>`}</div>`}};
ACT['add-food']=el=>{closeMenu();const dt=S.ui.date;const k=el.dataset.k||(MEALS.find(([x])=>!dayOf(dt).meals[x].actual)||MEALS[0])[0];const m=dayOf(dt).meals[k];const a=m.actual;const edit=!!(el.dataset.edit&&a);const ai=!!(edit&&a&&a.ai);
  openPopup('food',{k,edit,ai,text:a?a.text:'',kcal:a&&a.kcal!=null&&!a.ai?a.kcal:'',protein:a&&a.protein!=null&&!a.ai?a.protein:'',followed:a?a.followed!==false:true,est:ai&&a.items?{items:a.items,kcal:a.kcal,protein:a.protein}:null,status:'idle'})};
ACT['f-meal']=el=>{S.popup.d.k=el.dataset.k;renderPopup()};
INP['f-text']=el=>{const d=S.popup.d;d.text=el.value;if(d.ai&&d.est){d.est=null;d.status='idle';renderPopup();const t=$('#ft');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}}};
INP['f-kcal']=el=>{S.popup.d.kcal=el.value};INP['f-prot']=el=>{S.popup.d.protein=el.value};
INP['f-ek']=el=>{S.popup.d.est.kcal=Math.max(0,Math.round(+el.value||0))};INP['f-ep']=el=>{S.popup.d.est.protein=Math.max(0,Math.round(+el.value||0))};
ACT['f-ai']=()=>{const d=S.popup.d;d.ai=!d.ai;d.est=null;d.status='idle';renderPopup()};
ACT['f-fol']=el=>{S.popup.d.followed=el.dataset.v==='1';renderPopup()};
function saveFood(withEst){
  const d=S.popup.d;const day=ensureDay(S.ui.date);const meal=day.meals[d.k];
  const text=(d.text||'').trim()||(!d.ai?(meal.plan||'').trim():'');
  if(!text){toast('צריך לכתוב מה אכלת');return}
  let kcal=null,protein=null,ai=false,items=null;
  if(d.ai&&withEst&&d.est){ai=true;kcal=d.est.kcal;protein=d.est.protein;items=d.est.items}
  else if(!d.ai){if(d.kcal!==''&&d.kcal!=null)kcal=Math.max(0,Math.round(+d.kcal||0));if(d.protein!==''&&d.protein!=null)protein=Math.max(0,Math.round(+d.protein||0))}
  const followed=meal.plan&&meal.plan.trim()?!!d.followed:true;
  meal.actual={text,kcal,protein,ai,followed};if(items)meal.actual.items=items;
  Store.saveDay(S.ui.date);closePopup();render(true);toast('נשמר');
}
ACT['f-save']=()=>saveFood(true);ACT['f-save-nocalc']=()=>saveFood(false);
ACT['f-recent']=el=>{const d=S.popup.d;const r=(d.rec||[])[+el.dataset.i];if(!r)return;const meal=dayOf(S.ui.date).meals[d.k];const plan=(meal.plan||'').trim();
  const day=ensureDay(S.ui.date);const a={text:r.text,kcal:r.kcal!=null?r.kcal:null,protein:r.protein!=null?r.protein:null,ai:r.ai,followed:plan?plan===r.text.trim():true};if(r.items)a.items=r.items;
  day.meals[d.k].actual=a;Store.saveDay(S.ui.date);closePopup();render(true);toast(`נוסף: ${r.text.length>22?r.text.slice(0,21)+'…':r.text}`)};
ACT['ate-plan']=el=>{const dt=S.ui.date;if(!canEdit(dt))return;const m=ensureDay(dt).meals[el.dataset.k];if(!m.plan||!m.plan.trim())return;m.actual={text:m.plan.trim(),kcal:null,protein:null,ai:false,followed:true};Store.saveDay(dt);render(true);toast('נרשם: אכלת כמו שתכננת')};
async function estimateFood(text){
  if(S.mode==='api'){try{return await Api.post('/api/estimate',{text})}catch(e){throw{code:e.code==='ai_unavailable'?'unavailable':e.code==='ai_limit'?'limit':'err'}}}
  const sample=window.claude&&window.claude.use?await window.claude.use('sample'):null;
  if(!sample)throw{code:'unavailable'};
  const prompt=`אתה עוזר תזונה. המשתמש תיאר ארוחה בטקסט חופשי. פרק אותה לרכיבים והערך לכל רכיב קלוריות וחלבון (בגרמים) לפי הכמות שצוינה. אם לא צוינה כמות, הנח מנה סבירה וכתוב אותה בשדה amount. היה ריאליסטי ועגל למספרים שלמים.\nהתיאור: "${text.replace(/"/g,"'")}"\n\nהחזר JSON בלבד, בלי טקסט נוסף, בפורמט: {"items":[{"name":"","amount":"","kcal":0,"protein":0}]}. עד 12 רכיבים.`;
  const r=await sample.json(prompt,{modelTier:'quick',cache:false});
  if(!r||!Array.isArray(r.items)||!r.items.length||r.items.length>12)throw{code:'bad_shape'};
  const num=v=>{v=Math.round(+v);if(!isFinite(v)||v<0||v>6000)throw{code:'bad_value'};return v};
  const its=r.items.map(x=>({name:String(x.name||'').slice(0,60)||'רכיב',amount:String(x.amount||'').slice(0,40),kcal:num(x.kcal),protein:num(x.protein)}));
  return{items:its,kcal:its.reduce((s,x)=>s+x.kcal,0),protein:its.reduce((s,x)=>s+x.protein,0)};
}
ACT['f-calc']=async()=>{
  const d=S.popup.d;const text=(d.text||'').trim();
  if(text.length<2){toast('צריך לכתוב מה אכלת');return}
  d.status='calc';d.est=null;renderPopup();const pp=S.popup;
  try{const est=await estimateFood(text);if(S.popup!==pp)return;d.est=est;d.status='idle'}
  catch(e){if(S.popup!==pp)return;d.status='err';d.errMsg=e&&e.code==='not_granted'?'לא אושרה הגישה ל-AI. אפשר לאשר אותה ולנסות שוב, או לשמור בלי חישוב.':e&&e.code==='limit'?'הגעת למכסה היומית של חישובי AI. אפשר לשמור בלי חישוב, ומחר ננסה שוב.':e&&e.code==='unavailable'?'ה-AI לא זמין כרגע. אפשר לשמור בלי חישוב.':'לא הצלחנו לחשב עכשיו. אפשר לנסות שוב, או לשמור בלי חישוב.'}
  renderPopup();
};
/* ---------- settings / profile ---------- */
POP.settings={label:'הפרופיל שלי',cls:'w',render:d=>{const st=d.st;return `${popTape()}${popHead('הפרופיל שלי')}<div data-submit="save-settings" class="stack" style="gap:16px">${avatarEditHtml(st)}
 <div class="field"><label for="nm">איך קוראים לך?</label><input id="nm" class="in ${st.name?'ok':''}" value="${esc(st.name)}" maxlength="24" data-in="setup-name"></div>
 <div class="field"><label>תאריך לידה (אופציונלי)</label><div class="twin" style="grid-template-columns:1fr 1fr 1.3fr;gap:10px"><input class="in num" inputmode="numeric" placeholder="יום" maxlength="2" value="${st.d}" data-in="setup-d" aria-label="יום"><input class="in num" inputmode="numeric" placeholder="חודש" maxlength="2" value="${st.m}" data-in="setup-m" aria-label="חודש"><input class="in num" inputmode="numeric" placeholder="שנה" maxlength="4" value="${st.y}" data-in="setup-y" aria-label="שנה"></div></div>
 ${goalFieldHtml(st.goal)}${st.err?`<div class="err-t" role="alert">${esc(st.err)}</div>`:''}
 <div class="acts" style="gap:10px"><button type="button" class="ghost" data-act="export-data">${ico('up',18)} ייצוא הנתונים שלי</button><span class="sp"></span><button class="btn secondary" type="button" data-act="close-popup">ביטול</button><button class="btn primary" type="button" data-act="submit">שמירה</button></div>
 ${S.mode==='api'?`<div class="stack" style="gap:8px;border-top:2px dashed var(--ink);padding-top:12px"><b>החשבון</b><div class="row" style="gap:8px;flex-wrap:wrap"><span>${esc(S.user?S.user.email:'')}</span>${S.mail?(S.user&&S.user.verified?`<span class="chip on">${ico('check',14,3)} מאומת</span>`:`<span class="chip pink">לא מאומת</span><button type="button" class="ghost" data-act="resend-verify">שליחת קישור</button>`):''}</div>
<div class="twin"><div class="field"><label for="po">סיסמה נוכחית</label><input id="po" class="in sm" type="password" dir="ltr" style="text-align:left" autocomplete="current-password" data-in="pw-old"></div><div class="field"><label for="pn">סיסמה חדשה</label><input id="pn" class="in sm" type="password" dir="ltr" style="text-align:left" autocomplete="new-password" data-in="pw-new"></div></div>
${d.pw&&d.pw.err?`<div class="err-t" role="alert">${esc(d.pw.err)}</div>`:''}${d.pw&&d.pw.ok?`<div class="hint">${ico('check',16)} הסיסמה שונתה</div>`:''}<div><button type="button" class="btn secondary sm" data-act="pw-change">שינוי סיסמה</button></div></div>`:''}
<div class="pts">${typeof legalLinks==='function'?legalLinks():''} · גרסה ${VERSION}</div><div class="pts">מצב אחסון: ${S.mode==='api'?`חשבון ${esc(S.user?S.user.email:'')}. נשמר בענן`:S.mode==='db'?(S.dbfail?'במכשיר הזה בלבד (אין הרשאת כתיבה בענן)':'ענן. הנתונים נשמרים בחשבון שלך'):'מקומי, במכשיר הזה בלבד'}</div>${S.mode==='api'?`<div class="acts" style="gap:10px"><button type="button" class="btn secondary sm" data-act="logout">יציאה מהחשבון</button><span class="sp"></span><button type="button" class="ghost red" data-act="del-acct">מחיקת החשבון</button></div>`:(S.guest&&S.apiAvail?`<div><button type="button" class="btn lime sm" data-act="make-account">יצירת חשבון כדי לשמור בענן</button></div>`:'')}</div>`}};
ACT['make-account']=()=>{closePopup();S.ui.auth={tab:'register',email:'',pass:'',err:'',busy:false};S.mode='api';S.user=null;go('welcome');render(true)};
ACT.settings=()=>{initSetup();openPopup('settings',{st:S.setup,pw:{old:'',nw:'',err:'',ok:false}})};
SUB['save-settings']=()=>{const st=S.popup.d.st;const r=buildProfile(st,S.profile);if(r.err){st.err=r.err;return renderPopup()}S.profile=r.p;Store.saveProfile();S.setup=null;closePopup();render(true);toast('הפרופיל נשמר')};
ACT['export-data']=async()=>{const data=JSON.stringify({exported:new Date().toISOString(),profile:S.profile,days:S.days},null,1);try{await saveFile('היום-שלי-גיבוי.json',new Blob([data],{type:'application/json'}));toast('הקובץ מוכן')}catch(e){toast('לא הצלחנו לייצא')}};
