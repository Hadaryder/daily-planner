/* ---------- standalone (own server) mode ---------- */
const Api={
  async call(method,path,body,opt){
    const r=await fetch(path,{method,headers:body!==undefined?{'content-type':'application/json'}:{},body:body!==undefined?JSON.stringify(body):undefined,credentials:'same-origin',keepalive:!!(opt&&opt.keepalive)});
    let j=null;try{j=await r.json()}catch(e){}
    if(!r.ok){const err=Object.assign(new Error((j&&j.error)||'http '+r.status),{code:(j&&j.error)||('http'+r.status),status:r.status,data:j});
      if(r.status===401&&!/\/api\/(login|register|me)$/.test(path))authLost();if(err.code==='unverified')toast('צריך לאמת את המייל קודם. בדקו את תיבת הדואר');throw err}
    return j;
  },
  get(p){return this.call('GET',p)},post(p,b){return this.call('POST',p,b===undefined?{}:b)},
  async health(){try{const r=await fetch('/api/health',{credentials:'same-origin'});if(!r.ok)return null;const j=await r.json();return j&&j.app==='daily-planner'?j:null}catch(e){return null}}
};
function authLost(){if(S.mode!=='api'||!S.user)return;S.user=null;S.profile=null;S.days={};Social.on=false;toast('החיבור פג. צריך להתחבר מחדש');go('welcome')}
const AUTH_ERR={bad_credentials:'המייל או הסיסמה לא נכונים',exists:'כבר יש חשבון עם המייל הזה. נסו להתחבר',weak_password:'הסיסמה צריכה להיות באורך 8 תווים לפחות',bad_email:'המייל לא נראה תקין',rate:'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות',signup_closed:'ההרשמה סגורה כרגע',consent_required:'כדי להירשם צריך לאשר את תנאי השימוש ואת מדיניות הפרטיות',mail_disabled:'שחזור סיסמה אינו זמין כרגע',bad_token:'הקישור לא תקף או שפג תוקפו'};
const legalLinks=()=>`<a href="/terms" target="_blank" rel="noopener">תנאי השימוש</a> ו<a href="/privacy" target="_blank" rel="noopener">מדיניות הפרטיות</a>`;
const consentRow=(on,act)=>`<div class="consent"><button type="button" class="ck ${on?'on':''}" role="checkbox" aria-checked="${!!on}" aria-label="אישור תנאים" data-act="${act}">${on?ico('check',20,3):''}</button><span>קראתי ואני מסכימ/ה ל${legalLinks()}</span></div>`;
function authPanel(){
  const a=S.ui.auth||(S.ui.auth={tab:'login',email:'',pass:'',err:'',busy:false,consent:false,sent:false});const reg=a.tab==='register',fg=a.tab==='forgot';
  const emailF=`<div class="field"><label for="em">מייל</label><input id="em" class="in" type="email" dir="ltr" style="text-align:left" autocomplete="${reg?'email':'username'}" value="${esc(a.email)}" data-in="auth-email" data-focus="1"></div>`;
  const passF=`<div class="field"><label for="pw">סיסמה${reg?' (לפחות 8 תווים)':''}</label><input id="pw" class="in" type="password" dir="ltr" style="text-align:left" autocomplete="${reg?'new-password':'current-password'}" value="${esc(a.pass)}" data-in="auth-pass"></div>`;
  const foot=`<div class="pts" style="opacity:.7">${legalLinks()} · גרסה ${VERSION}</div>`;
  if(fg)return `<h2 class="suez" style="font-size:clamp(34px,5vw,52px)">שכחתי סיסמה</h2><p class="ptn">נשלח קישור לאיפוס אל המייל שלך. הוא תקף לשעה אחת.</p>
   ${a.sent?`<div class="banner lav" role="status">${ico('check',20,3)} אם יש חשבון עם המייל הזה, נשלח אליו קישור. כדאי לבדוק גם בספאם.</div>`:`<div data-submit="auth" class="stack" style="gap:12px">${emailF}${a.err?`<div class="err-t" role="alert">${esc(a.err)}</div>`:''}<button class="btn primary big block" type="button" data-act="submit" ${a.busy?'disabled':''}>${ico('mail',22)} ${a.busy?'רגע…':'שלחו לי קישור'}</button></div>`}
   <button class="linkbtn" style="align-self:flex-start" data-act="auth-tab" data-t="login">חזרה לכניסה</button>${foot}`;
  return `<h2 class="suez" style="font-size:clamp(36px,5vw,56px)">${reg?'יוצרים חשבון':'בואו נתחיל'}</h2><p class="ptn">${reg?'חשבון חינמי. הנתונים שלך נשמרים בענן ועובדים בכל מכשיר':'כניסה לדף היומי שלך'}</p>
  <div class="seg" role="tablist"><button class="chip ${!reg?'on':''}" role="tab" aria-selected="${!reg}" data-act="auth-tab" data-t="login">כניסה</button><button class="chip ${reg?'on':''}" role="tab" aria-selected="${reg}" data-act="auth-tab" data-t="register">הרשמה</button></div>
  <div data-submit="auth" class="stack" style="gap:12px">${emailF}${passF}${reg?consentRow(a.consent,'auth-consent'):''}
  ${a.err?`<div class="err-t" role="alert">${esc(a.err)}</div>`:''}<button class="btn primary big block" type="button" data-act="submit" ${a.busy?'disabled':''}>${ico('check',22)} ${a.busy?'רגע…':reg?'הרשמה':'כניסה'}</button></div>
  ${!reg&&S.mail?`<button class="linkbtn" style="align-self:flex-start" data-act="auth-tab" data-t="forgot">שכחתי סיסמה</button>`:''}
  <button class="linkbtn" style="align-self:flex-start" data-act="guest">להמשיך בלי חשבון (נשמר במכשיר הזה בלבד)</button>${foot}`;
}
ACT['auth-tab']=el=>{const a=S.ui.auth;a.tab=el.dataset.t;a.err='';a.sent=false;render(true)};
ACT['auth-consent']=()=>{const a=S.ui.auth;a.consent=!a.consent;if(a.consent)a.err='';render(true)};
INP['auth-email']=el=>{S.ui.auth.email=el.value};INP['auth-pass']=el=>{S.ui.auth.pass=el.value};
const setSession=r=>{S.user=r.user;S.needsConsent=!!r.needsConsent;S.mail=!!r.mail;S.mode='api';S.guest=false};
SUB.auth=async()=>{
  const a=S.ui.auth;if(a.busy)return;
  if(a.tab==='forgot'){
    if(!a.email.trim()){a.err='צריך למלא מייל';return render(true)}
    a.busy=true;a.err='';render(true);
    try{await Api.call('POST','/api/forgot',{email:a.email.trim()});a.sent=true}catch(e){a.err=AUTH_ERR[e.code]||'משהו השתבש. נסו שוב'}
    a.busy=false;return render(true);
  }
  if(!a.email.trim()||!a.pass){a.err='צריך למלא מייל וסיסמה';return render(true)}
  if(a.tab==='register'&&!a.consent){a.err=AUTH_ERR.consent_required;return render(true)}
  a.busy=true;a.err='';render(true);
  try{
    const lc=Store.readLocal();const l=Store.ls();const guestData=l&&l.getItem('dp_guest')==='1'&&lc&&lc.profile?lc:null;
    const r=await Api.call('POST',a.tab==='login'?'/api/login':'/api/register',a.tab==='login'?{email:a.email.trim(),password:a.pass}:{email:a.email.trim(),password:a.pass,consent:true});
    setSession(r);if(l){l.removeItem('dp_guest');l.removeItem('dp1')}
    await Store.loadApi(guestData);a.busy=false;a.pass='';S.setup=null;
    if(S.profile){Social=SocialApi;await Social.init()}
    toast(a.tab==='login'?'ברוכים השבים!':S.mail?'החשבון נוצר. שלחנו לך מייל לאימות':'החשבון נוצר');go(S.profile?(S.ui.pendingJoin?'friends':'today'):'setup');
  }catch(e){a.busy=false;a.err=AUTH_ERR[e.code]||'משהו השתבש. נסו שוב';render(true)}
};
/* ---- איפוס סיסמה (הקישור מגיע במייל: #/reset/TOKEN) ---- */
PAGES.reset=r=>{
  const st=(S.ui.reset&&S.ui.reset.token===r.a)?S.ui.reset:(S.ui.reset={token:r.a,pass:'',err:'',busy:false});
  return welcomeShell(`<h2 class="suez" style="font-size:clamp(34px,5vw,52px)">בחירת סיסמה חדשה</h2><p class="ptn">הקישור שקיבלת במייל תקף לשעה אחת.</p>
  <div data-submit="reset" class="stack" style="gap:12px"><div class="field"><label for="np">סיסמה חדשה (לפחות 8 תווים)</label><input id="np" class="in" type="password" dir="ltr" style="text-align:left" autocomplete="new-password" value="${esc(st.pass)}" data-in="reset-pass" data-focus="1"></div>
  ${st.err?`<div class="err-t" role="alert">${esc(st.err)}</div>`:''}<button class="btn primary big block" type="button" data-act="submit" ${st.busy?'disabled':''}>${ico('check',22)} ${st.busy?'רגע…':'שמירת הסיסמה'}</button></div>
  <a class="linkbtn" href="#/welcome" style="align-self:flex-start">חזרה לכניסה</a>`);
};
INP['reset-pass']=el=>{S.ui.reset.pass=el.value};
SUB.reset=async()=>{
  const st=S.ui.reset;if(st.busy)return;
  if((st.pass||'').length<8){st.err=AUTH_ERR.weak_password;return render(true)}
  st.busy=true;st.err='';render(true);
  try{const r=await Api.call('POST','/api/reset',{token:st.token,password:st.pass});setSession(r);S.ui.reset=null;await Store.loadApi(null);if(S.profile){Social=SocialApi;await Social.init()}toast('הסיסמה עודכנה. התחברת מחדש');go(S.profile?'today':'setup')}
  catch(e){st.busy=false;st.err=e.code==='bad_token'?'הקישור לא תקף או שפג תוקפו. אפשר לבקש קישור חדש במסך הכניסה.':AUTH_ERR[e.code]||'משהו השתבש. נסו שוב';render(true)}
};
/* ---- אימות מייל (#/verify/TOKEN) ---- */
async function doVerify(token){try{await Api.call('POST','/api/verify',{token});S.ui.verify.state='ok';if(S.user)S.user.verified=true}catch(e){S.ui.verify.state=e.code==='bad_token'?'bad':'err'}render(true)}
PAGES.verify=r=>{
  if(!S.ui.verify||S.ui.verify.token!==r.a){S.ui.verify={token:r.a,state:'busy'};doVerify(r.a)}
  const st=S.ui.verify.state;
  const body=st==='busy'?`<h2 class="suez" style="font-size:clamp(34px,5vw,52px)">מאמתים…</h2><p class="ptn">רגע אחד.</p>`
   :st==='ok'?`<h2 class="suez" style="font-size:clamp(34px,5vw,52px)">המייל אומת!</h2><p class="ptn">עכשיו אפשר להוסיף חברים ולשלוח גלויות.</p><a class="btn primary big block" href="#/${S.user?'today':'welcome'}">${ico('check',22)} המשך לאתר</a>`
   :`<h2 class="suez" style="font-size:clamp(34px,5vw,52px)">הקישור לא תקף</h2><p class="ptn">${st==='bad'?'ייתכן שפג תוקפו או שכבר נעשה בו שימוש.':'משהו השתבש.'} אם אתם מחוברים, אפשר לשלוח קישור חדש מההגדרות.</p><a class="btn secondary block" href="#/${S.user?'today':'welcome'}">חזרה לאתר</a>`;
  return welcomeShell(body);
};
const verifyBanner=()=>(S.mode==='api'&&S.user&&S.mail&&!S.user.verified)?`<div class="dbwarn" role="status" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>${ico('mail',18)} אמתו את המייל כדי להוסיף חברים ולשלוח גלויות. שלחנו לכם קישור.</span><button class="btn sm secondary" data-act="resend-verify">שליחה מחדש</button></div>`:'';
ACT['resend-verify']=async()=>{try{const r=await Api.post('/api/verify/resend');toast(r.already?'המייל כבר מאומת':'שלחנו קישור חדש. בדקו גם בספאם');if(r.already&&S.user){S.user.verified=true;render(true)}}catch(e){toast(e.code==='rate'?'כבר שלחנו כמה קישורים. נסו שוב בעוד כשעה':e.code==='mail_disabled'?'שליחת מיילים לא מוגדרת':'לא הצלחנו לשלוח')}};
/* ---- הסכמה למסמכים (משתמשים קיימים / גרסה חדשה) ---- */
POP.consent={label:'אישור תנאים',locked:true,render:d=>`${popTape()}<div class="pt">עדכון תנאים</div><p>כדי להמשיך להשתמש ב״היום שלי״ צריך לאשר את ${legalLinks()}. קראו אותם, וסמנו אם אתם מסכימים.</p>${consentRow(d.ok,'consent-toggle')}${d.err?`<div class="err-t" role="alert">${esc(d.err)}</div>`:''}<div class="acts"><button class="btn secondary" data-act="logout">יציאה מהחשבון</button><span class="sp"></span><button class="btn primary" data-act="consent-accept">מאשר/ת והמשך</button></div>`};
ACT['consent-toggle']=()=>{const d=S.popup.d;d.ok=!d.ok;d.err='';renderPopup()};
ACT['consent-accept']=async()=>{const d=S.popup.d;if(!d.ok){d.err='צריך לסמן שקראתם ומסכימים';return renderPopup()}try{await Api.post('/api/consent',{accept:true});S.needsConsent=false;closePopup();toast('תודה!');render(true)}catch(e){d.err='לא הצלחנו לשמור. נסו שוב';renderPopup()}};
/* ---- שינוי סיסמה (בהגדרות) ---- */
INP['pw-old']=el=>{S.popup.d.pw.old=el.value};INP['pw-new']=el=>{S.popup.d.pw.nw=el.value};
ACT['pw-change']=async()=>{const p=S.popup.d.pw;p.err='';p.ok=false;
  if(!p.old||!p.nw){p.err='צריך למלא את שתי הסיסמאות';return renderPopup()}
  if(p.nw.length<8){p.err=AUTH_ERR.weak_password;return renderPopup()}
  try{await Api.post('/api/password',{oldPassword:p.old,newPassword:p.nw});p.ok=true;p.old='';p.nw='';toast('הסיסמה שונתה')}catch(e){p.err=e.code==='bad_credentials'?'הסיסמה הנוכחית לא נכונה':AUTH_ERR[e.code]||'לא הצלחנו לשנות'}renderPopup()};
ACT.guest=()=>{const l=Store.ls();if(l)l.setItem('dp_guest','1');S.mode='local';S.guest=true;S.setup=null;go('setup')};
ACT.logout=async()=>{try{await Api.post('/api/logout')}catch(e){}S.needsConsent=false;S.user=null;S.profile=null;S.days={};S.setup=null;S.ui.auth=null;Social.on=false;closePopup();go('welcome');toast('יצאת מהחשבון')};
POP.delacct={label:'מחיקת חשבון',render:d=>`${popTape()}${popHead('מחיקת החשבון')}<p>כל הנתונים שלך יימחקו לצמיתות: משימות, לו״ז, אוכל, חברים וגלויות. אי אפשר לבטל.</p><div class="field"><label for="dp">סיסמה לאישור</label><input id="dp" class="in" type="password" dir="ltr" style="text-align:left" data-in="del-pass" data-focus="1" autocomplete="current-password"></div>${d.err?`<div class="err-t" role="alert">${esc(d.err)}</div>`:''}<div class="acts"><span class="sp"></span><button class="btn secondary" data-act="close-popup">ביטול</button><button class="btn danger" data-act="del-acct-go">למחוק הכול</button></div>`};
ACT['del-acct']=()=>openPopup('delacct',{pass:'',err:''});INP['del-pass']=el=>{S.popup.d.pass=el.value};
ACT['del-acct-go']=async()=>{const d=S.popup.d;try{await Api.post('/api/account/delete',{password:d.pass});S.user=null;S.profile=null;S.days={};Social.on=false;closePopup();go('welcome');toast('החשבון נמחק')}catch(e){d.err=e.code==='bad_credentials'?'הסיסמה לא נכונה':'לא הצלחנו למחוק';renderPopup()}};
/* ---------- social over the API ---------- */
const SocialApi={on:false,err:false,profiles:{},_f:[],_in:[],_out:[],_ci:[],_co:[],timer:null,last:0,lastPub:'',myCode:'',
  async init(){this.on=true;await this.refresh();clearInterval(this.timer);this.timer=setInterval(()=>{if(document.visibilityState==='visible'&&this.on&&['friends','friend','postcards','zine'].includes(S.route.name))this.refresh()},20000)},
  async refresh(){this.last=Date.now();try{const d=await Api.get('/api/social');const pr={};[...d.friends,...d.incoming,...d.outgoing].forEach(p=>{pr[p.id]=p});this.profiles=pr;this._f=d.friends.map(p=>p.id);this._in=d.incoming.map(p=>p.id);this._out=d.outgoing.map(p=>p.id);this._ci=d.cardsIn;this._co=d.cardsOut;this.myCode=d.me.code;if(S.profile)S.profile.code=d.me.code;this.err=false;this.changed()}catch(e){this.err=true}},
  changed(){if(['friends','friend','postcards','zine'].includes(S.route.name))softRender()},
  me(){return S.user?String(S.user.id):''},mine(){return this._f.concat(this._out)},friendIds(){return this._f},incoming(){return this._in},outgoing(){return this._out},
  cardsIn(){return this._ci},get pcOut(){return this._co},touch(){},
  async addByCode(code){try{const r=await Api.post('/api/friends/add',{code});await this.refresh();return r}catch(e){throw{code:e.code==='nf'?'nf':e.code==='dup'?'dup':e.code==='unverified'?'unverified':'err',name:e.data&&e.data.name}}},
  async accept(id){await Api.post('/api/friends/accept',{id});await this.refresh()},
  async remove(id){await Api.post('/api/friends/remove',{id});await this.refresh()},
  async send(doc){const r=await Api.post('/api/postcards',doc);await this.refresh();return r},
};
Store.loadApi=async function(guestData){
  const d=await Api.get('/api/data');S.profile=d.profile&&d.profile.name?d.profile:null;S.days={};for(const k in d.days)S.days[k]=normDay(d.days[k]);
  if(!S.profile&&guestData&&guestData.profile&&guestData.profile.name){S.profile=Object.assign({},guestData.profile,{code:d.profile&&d.profile.code||guestData.profile.code});S.days={};for(const k in guestData.days||{})S.days[k]=normDay(guestData.days[k]);this.saveProfile();for(const k in S.days)this.saveDay(k)}
};
