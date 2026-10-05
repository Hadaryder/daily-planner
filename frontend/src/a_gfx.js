'use strict';
const INK='var(--ink)';
const svgw=(inner,vb='0 0 100 100',cls='')=>`<svg class="g ${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
const midp=(a,b)=>`${((a[0]+b[0])/2).toFixed(1)} ${((a[1]+b[1])/2).toFixed(1)}`;
const GX={
  badge(fill,n=14){let d='';for(let i=0;i<=240;i++){const t=i/240*Math.PI*2,r=42+5*Math.cos(n*t);d+=(i?'L':'M')+(50+r*Math.cos(t)).toFixed(1)+' '+(50+r*Math.sin(t)).toFixed(1)}return svgw(`<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`)},
  blob(fill,seed=1){const n=8,pts=[];let s=seed*9301+7;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};for(let i=0;i<n;i++){const t=i/n*Math.PI*2,r=34+rnd()*12;pts.push([50+r*Math.cos(t),50+r*Math.sin(t)])}let d='M'+midp(pts[n-1],pts[0]);for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];d+=`Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${midp(p,q)}`}return svgw(`<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>`)},
  flower(petal,center){let p='';for(let k=0;k<8;k++)p+=`<ellipse cx="50" cy="27" rx="11" ry="20" fill="${petal}" stroke="${INK}" stroke-width="3" transform="rotate(${k*45} 50 50)"/>`;return svgw(p+`<circle cx="50" cy="50" r="12" fill="${center}" stroke="${INK}" stroke-width="3"/>`)},
  star(fill){let pts='';for(let i=0;i<10;i++){const r=i%2?19:46,t=-Math.PI/2+i*Math.PI/5;pts+=(50+r*Math.cos(t)).toFixed(1)+','+(54+r*Math.sin(t)).toFixed(1)+' '}return svgw(`<polygon points="${pts}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`)},
  sparkle(fill){return svgw(`<path d="M50 4Q54 46 96 50Q54 54 50 96Q46 54 4 50Q46 46 50 4Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`)},
  flower100(){let p='';for(let k=0;k<10;k++)p+=`<ellipse cx="50" cy="22" rx="10" ry="19" fill="${COL.pink}" stroke="${INK}" stroke-width="3" transform="rotate(${k*36} 50 50)"/>`;return svgw(p+`<circle cx="50" cy="50" r="22" fill="var(--tape)" stroke="${INK}" stroke-width="3"/>`,'0 0 100 100','flower100')},
  squig(c='var(--ink)'){return svgw(`<path d="M2 12q9 -14 18 0t18 0t18 0t18 0t18 0t18 0" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,'0 0 120 24','sq')},
  tape(c='var(--tape)'){return svgw(`<path d="M2 2L8 6L2 10L8 14L2 18L8 22L2 26H98L92 22L98 18L92 14L98 10L92 6L98 2Z" fill="${c}" fill-opacity=".9"/>`,'0 0 100 28','tp')},
};
const IC={check:'M5 13l4 4L19 7',x:'M5 5l14 14M19 5L5 19',plus:'M12 5v14M5 12h14',minus:'M5 12h14',
 trash:'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',pencil:'M5 19l1-4L16.5 4.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L9 18 5 19zM14 7l3 3',
 cup:'M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5V9zM16 10h1.4a2.4 2.4 0 010 4.8H16M8.5 3.5v2.5M12 3.5v2.5',camera:'M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1.5 1.5 0 011.5 1.5v8A1.5 1.5 0 0120 19.5H4A1.5 1.5 0 012.5 18v-8A1.5 1.5 0 014 8.5zM12 17a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2z',
 image:'M4 5h16a1.5 1.5 0 011.5 1.5v11A1.5 1.5 0 0120 19H4a1.5 1.5 0 01-1.5-1.5v-11A1.5 1.5 0 014 5zM3 16l5-5 4 4 3-3 6 6',copy:'M9 9h10v11H9zM5 15V4h10',share:'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
 chev:'M6 9l6 6 6-6',left:'M20 12H5M11 5.5L4.5 12 11 18.5',right:'M4 12h15M13 5.5l6.5 6.5-6.5 6.5',lock:'M7 11V8a5 5 0 0110 0v3M5.5 11h13V20h-13z',
 sun:'M12 7.8a4.2 4.2 0 100 8.4 4.2 4.2 0 000-8.4zM12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7',
 cal:'M5 5h14a1.5 1.5 0 011.5 1.5V19A1.5 1.5 0 0119 20.5H5A1.5 1.5 0 013.5 19V6.5A1.5 1.5 0 015 5zM3.5 10h17M8 3v4M16 3v4',
 people:'M9 5.3a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zM3 20c0-3.6 2.7-5.8 6-5.8s6 2.2 6 5.8M17.5 7.1a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zM17 14.4c2.6 0 4.5 1.7 4.5 4.6',
 mail:'M4 5.5h16A1.5 1.5 0 0121.5 7v10a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 17V7A1.5 1.5 0 014 5.5zM3.8 7.5l8.2 6 8.2-6',up:'M12 19V5M6 11l6-6 6 6'};
const ico=(n,s=22,w=2.4)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[n]}"/></svg>`;
const COL={pink:'var(--pink)',lime:'var(--lime)',lav:'var(--lav)',orange:'var(--orange)',green:'var(--green)',limel:'var(--lime-l)',pinkl:'var(--pink-l)',lavl:'var(--lav-l)'};
// sticker by tier: great=orange scalloped, good=lime scalloped, soft=lavender blob
function tierShape(t,seed=1){if(+seed===100)return GX.flower100();return t==='great'?GX.badge(COL.orange,14):t==='good'?GX.badge(COL.lime,12):GX.blob(COL.lav,seed)}
function stk(t,txt,size,rot){return `<span class="stk" style="width:${size}px;height:${size}px;${rot?`transform:rotate(${rot}deg)`:''}">${tierShape(t,+txt||((txt|0)+3))}<span style="font-size:${Math.round(size*(String(txt).length>=3?.27:.36))}px">${txt}</span></span>`}
const STICKERS=[['flower',()=>GX.flower(COL.pink,COL.lime)],['flower2',()=>GX.flower(COL.lav,COL.orange)],['star',()=>GX.star(COL.pink)],['badge',()=>GX.badge(COL.orange,14)],['blob',()=>GX.blob(COL.green,4)]];
const stickerSvg=id=>{const f=STICKERS.find(s=>s[0]===id);return f?f[1]():GX.flower(COL.pink,COL.lime)};
