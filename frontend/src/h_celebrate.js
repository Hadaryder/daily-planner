/* ---------- חגיגת ציון 100 ----------
   דסקטופ (עכבר): כוכבים בסגנון המדבקות יוצאים מהסמן ועוקבים אחריו 15 שניות. נולדים קטנים, גדלים בתנועה ונמוגים.
   מגע (טאבלט/מובייל): התפרצות כוכבים מהפרח. מכבד prefers-reduced-motion (אז רק הודעה). */
const Celebrate=(()=>{
  const C={history:[],active:false,live:0,DURATION:15000};
  let mx=-1,my=-1,have=false;
  window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;mx=e.clientX;my=e.clientY;have=true},{passive:true});
  const reduce=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mouseMode=()=>!!(window.matchMedia&&matchMedia('(hover: hover) and (pointer: fine)').matches);
  const cssv=(n,fb)=>{try{return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||fb}catch(e){return fb}};
  let starPath='M',sparkP=null,starP=null;
  for(let i=0;i<10;i++){const r=i%2?19:46,t=-Math.PI/2+i*Math.PI/5;starPath+=(i?'L':'')+(50+r*Math.cos(t)).toFixed(1)+' '+(50+r*Math.sin(t)).toFixed(1)}starPath+='Z';
  const SPARK='M50 4Q54 46 96 50Q54 54 50 96Q46 54 4 50Q46 46 50 4Z';
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const easeOutBack=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
  const scaleAt=t=>{const g=t<.3?.12+.88*easeOutBack(t/.3):1;const f=t>.65?Math.max(0,1-Math.pow((t-.65)/.35,1.6)):1;return g*f};
  function drawShape(ctx,kind,fill,ink,lw){
    ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=ink;ctx.fillStyle=fill;
    if(kind==='flower'){for(let k=0;k<8;k++){ctx.save();ctx.translate(50,50);ctx.rotate(k*Math.PI/4);ctx.beginPath();ctx.ellipse(0,-23,11,20,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}ctx.fillStyle=cssv('--lime','#cbf03a');ctx.beginPath();ctx.arc(50,50,12,0,Math.PI*2);ctx.fill();ctx.stroke();return}
    const p=kind==='spark'?sparkP:starP;ctx.fill(p);ctx.stroke(p);
  }
  function start(mode){
    if(C.active)return 'busy';
    const cv=document.createElement('canvas');cv.id='celebrate';cv.setAttribute('aria-hidden','true');
    cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:300';
    const dpr=Math.min(window.devicePixelRatio||1,2);let W=innerWidth,H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    const ctx=cv.getContext&&cv.getContext('2d');if(!ctx||!ctx.save||typeof Path2D==='undefined')return 'nocanvas';
    sparkP=new Path2D(SPARK);starP=new Path2D(starPath);
    document.body.appendChild(cv);C.active=true;
    const onResize=()=>{W=innerWidth;H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)};window.addEventListener('resize',onResize);
    const ink=cssv('--ink','#1f1a2e');const pal=['--pink','--lime','--lav','--orange','--tape','--green'].map((n,i)=>cssv(n,['#ff9ccb','#cbf03a','#b9a4f7','#ff5b2e','#ffe27a','#16b04a'][i]));
    const P=[];const add=o=>{if(P.length<260)P.push(Object.assign({age:0,rot:rnd(0,6.28),vr:rnd(-4,4),kind:Math.random()<.6?'star':Math.random()<.8?'spark':'flower',col:pal[(Math.random()*pal.length)|0]},o))};
    const trail=(x,y,vx,vy,speed)=>add({x,y,vx:vx*.22+rnd(-80,80),vy:vy*.22+rnd(-80,60)-18,life:rnd(.8,1.4),size:Math.min(52,rnd(16,26)+speed*.022),drag:.25,g:40});
    const burst=(x,y,n,v0,v1)=>{for(let i=0;i<n;i++){const a=rnd(0,6.283),v=rnd(v0,v1);add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-120,life:rnd(1.1,2.1),size:rnd(18,46),drag:.18,g:520})}};
    const t0=performance.now();let last=t0,idle=0;
    let px=have?mx:W/2,py=have?my:H/3;let lx=px,ly=py;
    if(mode==='follow'){burst(px,py,28,120,420)}
    else{const el=document.querySelector('.score-big');const r=el?el.getBoundingClientRect():null;const cx=r&&r.bottom>0&&r.top<H?r.left+r.width/2:W/2,cy=r&&r.bottom>0&&r.top<H?r.top+r.height/2:H/2;px=cx;py=cy;burst(cx,cy,64,220,720);setTimeout(()=>burst(cx,cy,42,180,620),260);setTimeout(()=>burst(cx,cy,34,160,560),620);setTimeout(()=>burst(cx,cy,24,140,480),1000)}
    const endAt=t0+(mode==='follow'?C.DURATION:1500);
    const finish=()=>{window.removeEventListener('resize',onResize);cv.remove();C.active=false;C.live=0};
    const frame=now=>{
      const dt=Math.min((now-last)/1000,.05);last=now;
      if(mode==='follow'&&now<endAt){
        const fac=now>endAt-2000?(endAt-now)/2000:1;const cx=have?mx:px,cy=have?my:py;const dx=cx-lx,dy=cy-ly,dist=Math.hypot(dx,dy);
        if(dist>1&&dt>0){const n=Math.min(5,Math.ceil(dist/16));for(let i=0;i<n;i++)if(Math.random()<fac){const f=(i+1)/n;trail(lx+dx*f,ly+dy*f,dx/dt,dy/dt,dist/dt)}}
        else{idle+=dt;if(idle>.1/Math.max(.25,fac)){idle=0;trail(cx,cy,0,0,40)}}
        lx=cx;ly=cy;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
      for(let i=P.length-1;i>=0;i--){
        const p=P[i];p.age+=dt;if(p.age>=p.life){P.splice(i,1);continue}
        const k=Math.pow(p.drag,dt);p.vx*=k;p.vy=p.vy*k+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
        const t=p.age/p.life,s=p.size*scaleAt(t)/100;if(s<.002)continue;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.scale(s,s);ctx.translate(-50,-50);ctx.globalAlpha=t>.8?Math.max(0,(1-t)/.2):1;
        ctx.save();ctx.translate(-4,5);drawShape(ctx,p.kind,ink,ink,3);ctx.restore();   // צל קשיח כמו במדבקות האתר
        drawShape(ctx,p.kind,p.col,ink,3);ctx.restore();
      }
      C.live=P.length;
      if(now>=endAt&&P.length===0){finish();return}
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);return 'started';
  }
  C.fire=(force)=>{
    const mode=mouseMode()?'follow':'burst';C.history.push({mode,at:Date.now(),reduced:reduce()});
    if(typeof toast==='function')toast('יום מושלם! הגעת ל-100');
    if(reduce())return 'reduced';return start(mode);
  };
  C.start=start;
  return C;
})();
function checkCelebrate(){
  try{
    const r=S.route.name;if(!(r==='today'||r==='day')||!S.ui.date)return;const date=S.ui.date;if(!canEdit(date))return;
    const sc=scoreOf(date);const m=S.ui.prevScore||(S.ui.prevScore={});const had=date in m,prev=m[date];m[date]=sc;
    // חוגגים רק כשהמשתמש/ת עצמו/ה הגיע/ה ל-100 (לא כשפותחים עמוד שכבר ב-100), ופעם אחת ליום בכל ביקור
    const done=S.ui.celebrated||(S.ui.celebrated={});
    if(had&&prev!==100&&sc===100&&!done[date]&&Date.now()-lastDown<4000){done[date]=true;Celebrate.fire()}
  }catch(e){console.error(e)}
}
ACT['celebrate-preview']=()=>{closePopup();Celebrate.fire(true)};
