# בונה את public/index.html מקבצי המקור. הרצה:  python3 frontend/build.py
import os
here=os.path.dirname(os.path.abspath(__file__));src=os.path.join(here,'src')
css=open(os.path.join(src,'styles.css'),encoding='utf-8').read()
order=['a_gfx.js','b_core.js','c_screens.js','d_popups.js','e_social.js','g_api.js','h_celebrate.js','f_main.js']
js=''.join(open(os.path.join(src,f),encoding='utf-8').read()+'\n' for f in order)
html=f'''<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>היום שלי</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gveret+Levin&family=Heebo:wght@500;700;800&family=Suez+One&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div id="app"></div><div id="menu"></div><div id="popup"></div><div id="toast" class="toast" role="status" aria-live="polite"></div>
<script>{js}</script></body></html>'''
out=os.path.join(here,'..','public','index.html');os.makedirs(os.path.dirname(out),exist_ok=True)
open(out,'w',encoding='utf-8').write(html);print('נבנה',out,len(html),'bytes')
