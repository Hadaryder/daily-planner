# היום שלי — גרסה עצמאית (בלי claude.ai)

**להעלאה לאוויר: ראו `DEPLOY.md` (מדריך צעד צעד ל-Fly.io ול-VPS).**

אתר מלא עם חשבונות משלו: הרשמה וכניסה במייל וסיסמה, שמירת נתונים בשרת, חברים וגלויות, וחישוב AI אופציונלי.
שרת אחד ב-Node 22, בלי תלויות npm. מסד הנתונים הוא SQLite מובנה.

## הרצה מקומית
```bash
node --no-warnings server.mjs        # נדרש Node 22.13 ומעלה
# http://localhost:3000
```

## משתני סביבה
ראו `.env.example`. החשובים:
- `COOKIE_SECURE=1` כשהאתר מאחורי HTTPS (חובה בפרודקשן)
- `DATA_DIR` תיקייה קבועה (volume) שבה נשמר `planner.db`
- `ANTHROPIC_API_KEY` אופציונלי. בלעדיו כפתור "חשבו עם AI" מציג "לא זמין", וכל השאר עובד. החישוב רץ מהשרת, וההגבלה היומית (`AI_DAILY_LIMIT`) מגינה על העלות
- `TRUST_PROXY=1` להפעיל רק מאחורי פרוקסי (Fly, Caddy): נותן זיהוי נכון של כתובת הלקוח להגבלת קצב
- `ALLOW_SIGNUP=0` סוגר הרשמה (אם רוצים רק קבוצה סגורה)

## פריסה
**Docker (כל שירות שתומך בקונטיינרים):**
```bash
docker build -t daily-planner .
docker run -d -p 3000:3000 -v dp-data:/data -e COOKIE_SECURE=1 -e ANTHROPIC_API_KEY=... daily-planner
```
**Fly.io:** `fly launch` (לבחור Dockerfile) ← `fly volumes create dp_data --size 1` ← להוסיף ב-`fly.toml` mount ל-`/data` ← `fly secrets set ANTHROPIC_API_KEY=...` ← `fly deploy`.
**שרת VPS עם HTTPS אוטומטי (Caddy):** להריץ את השרת על פורט 3000 ולהגדיר ב-Caddyfile:
```
planner.example.com { reverse_proxy 127.0.0.1:3000 }
```

## גיבוי
להעתיק את `DATA_DIR/planner.db` (וגם `planner.db-wal` אם קיים), או `sqlite3 planner.db ".backup backup.db"`.

## אבטחה ופרטיות (מה כבר קיים)
סיסמאות ב-scrypt עם salt. עוגיית סשן HttpOnly + SameSite=Lax. בדיקת Origin בכל פעולת שינוי. CSP וכותרות אבטחה.
הגבלת קצב על כניסה, הרשמה, הוספת חברים וגלויות. הציונים מוצגים רק לחברים שאישרו הדדית. משימות, לו״ז, אוכל ויומן לא נחשפים לאף אחד.
כל משתמש יכול לייצא את הנתונים שלו ולמחוק את החשבון (בהגדרות).

## מה עדיין חסר לפני שפותחים לקהל רחב
- שחזור סיסמה ואימות מייל (דורשים שליחת מיילים, כלומר SMTP)
- כניסה עם Google/Apple (דורשת הגדרת OAuth)
- מדיניות פרטיות ותנאי שימוש, והצהרה על מאגר מידע לפי החוק בישראל
- מסד אחד על שרת אחד. מתאים להתחלה, ולא להרבה משתמשים במקביל

## מבנה
`server.mjs` השרת וה-API · `public/index.html` האתר (קובץ אחד) · `frontend/src` קוד המקור של האתר, ובניה מחדש עם `python3 frontend/build.py`
