/* ---------- standalone (own server) mode ---------- */
const Api={
  async call(method,path,body,opt){
    const r=await fetch(path,{method,headers:body!==undefined?{'content-type':'application/json'}:{},body:body!==undefined?JSON.stringify(body):undefined,credentials:'same-origin',keepalive:!!(opt&&opt.keepalive)});
    let j=null;try{j=await r.json()}catch(e){}
    if(!r.ok){const err=Object.assign(new Error((j&&j.error)||'http '+r.status),{code:(j&&j.error)||('http'+r.status),status:r.status,data:j});
      if(r.status===401&&!/\/api\/(login|register|me)$/.test(path))authLost();throw err}
    return j;
  },
  get(p){return this.call('GET',p)},post(p,b){return this.call('POST',p,b===undefined?{}:b)},
  async health(){try{const r=await fetch('/api/health',{credentials:'same-origin'});if(!r.ok)return null;const j=await r.json();return j&&j.app==='daily-planner'?j:null}catch(e){return null}}
};
function authLost(){if(S.mode!=='api'||!S.user)return;S.user=null;S.profile=null;S.days={};Social.on=false;toast('החיבור פג. צריך להתחבר מחדש');go('welcome')}
const AUTH_ERR={bad_credentials:'המייל או הסיסמה לא נכונים',exists:'כבר יש חשבון עם המייל הזה. נסו להתחבר',weak_password:'הסיסמה צריכה להיות באורך 8 תווים לפחות',bad_email:'המייל לא נראה תקין',rate:'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות',signup_closed:'ההרשמה סגורה כרגע'};
function authPanel(){
  const a=S.ui.auth||(S.ui.auth={tab:'login',email:'',pass:'',err:'',busy:false});const reg=a.tab==='register';
  return `<h2 class="suez" style="font-size:clamp(36px,5vw,56px)">${reg?'יוצרים חשבון':'בואו נתחיל'}</h2><p class="ptn">${reg?'חשבון חינמי. הנתונים שלך נשמרים בענן ועובדים בכל מכשיר':'כניסה לדף היומי שלך'}</p>
  <div class="seg" role="tablist"><button class="chip ${!reg?'on':''}" role="tab" aria-selected="${!reg}" data-act="auth-tab" data-t="login">כניסה</button><button class="chip ${reg?'on':''}" role="tab" aria-selected="${reg}" data-act="auth-tab" data-t="register">הרשמה</button></div>
  <div data-submit="auth" class="stack" style="gap:12px"><div class="field"><label for="em">מייל</label><input id="em" class="in" type="email" dir="ltr" style="text-align:left" autocomplete="${reg?'email':'username'}" value="${esc(a.email)}" data-in="auth-email" data-focus="1"></div>
  <div class="field"><label for="pw">סיסמה${reg?' (לפחות 8 תווים)':''}</label><input id="pw" class="in" type="password" dir="ltr" style="text-align:left" autocomplete="${reg?'new-password':'current-password'}" value="${esc(a.pass)}" data-in="auth-pass"></div>
  ${a.err?`<div class="err-t" role="alert">${esc(a.err)}</div>`:''}<button class="btn primary big block" type="button" data-act="submit" ${a.busy?'disabled':''}>${ico('check',22)} ${a.busy?'רגע…':reg?'הרשמה':'כניסה'}</button></div>
  <button class="linkbtn" style="align-self:flex-start" data-act="guest">להמשיך בלי חשבון (נשמר במכשיר הזה בלבד)</button><div class="pts" style="opacity:.6">גרסה ${VERSION}</div>`;
}
ACT['auth-tab']=el=>{const a=S.ui.auth;a.tab=el.dataset.t;a.err='';render(true)};
INP['auth-email']=el=>{S.ui.auth.email=el.value};INP['auth-pass']=el=>{S.ui.auth.pass=el.value};
SUB.auth=async()=>{
  const a=S.ui.auth;if(a.busy)return;if(!a.email.trim()||!a.pass){a.err='צריך למלא מייל וסיסמה';return render(true)}
  a.busy=true;a.err='';render(true);
  try{
    const lc=Store.readLocal();const l=Store.ls();const guestData=l&&l.getItem('dp_guest')==='1'&&lc&&lc.profile?lc:null;
    const r=await Api.call('POST',a.tab==='login'?'/api/login':'/api/register',{email:a.email.trim(),password:a.pass});
    S.user=r.user;S.mode='api';S.guest=false;if(l){l.removeItem('dp_guest');l.removeItem('dp1')}
    await Store.loadApi(guestData);a.busy=false;a.pass='';S.setup=null;
    if(S.profile){Social=SocialApi;await Social.init()}
    toast(a.tab==='login'?'ברוכים השבים!':'החשבון נוצר');go(S.profile?(S.ui.pendingJoin?'friends':'today'):'setup');
  }catch(e){a.busy=false;a.err=AUTH_ERR[e.code]||'משהו השתבש. נסו שוב';render(true)}
};
ACT.guest=()=>{const l=Store.ls();if(l)l.setItem('dp_guest','1');S.mode='local';S.guest=true;S.setup=null;go('setup')};
ACT.logout=async()=>{try{await Api.post('/api/logout')}catch(e){}S.user=null;S.profile=null;S.days={};S.setup=null;S.ui.auth=null;Social.on=false;closePopup();go('welcome');toast('יצאת מהחשבון')};
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
  async addByCode(code){try{const r=await Api.post('/api/friends/add',{code});await this.refresh();return r}catch(e){throw{code:e.code==='nf'?'nf':e.code==='dup'?'dup':'err',name:e.data&&e.data.name}}},
  async accept(id){await Api.post('/api/friends/accept',{id});await this.refresh()},
  async remove(id){await Api.post('/api/friends/remove',{id});await this.refresh()},
  async send(doc){const r=await Api.post('/api/postcards',doc);await this.refresh();return r},
};
Store.loadApi=async function(guestData){
  const d=await Api.get('/api/data');S.profile=d.profile&&d.profile.name?d.profile:null;S.days={};for(const k in d.days)S.days[k]=normDay(d.days[k]);
  if(!S.profile&&guestData&&guestData.profile&&guestData.profile.name){S.profile=Object.assign({},guestData.profile,{code:d.profile&&d.profile.code||guestData.profile.code});S.days={};for(const k in guestData.days||{})S.days[k]=normDay(guestData.days[k]);this.saveProfile();for(const k in S.days)this.saveDay(k)}
};
