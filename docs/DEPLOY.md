# העלאת "היום שלי" לאוויר

> האתר שלך כבר באוויר: **https://dailyplanner.fly.dev** (אפליקציה `dailyplanner`, אזור fra, נפח `dp_data`).
> עדכוני קוד מגיעים אוטומטית דרך GitHub, ראו [CI-CD.md](CI-CD.md). המדריך הזה נועד להקמה ראשונה או להקמה מחדש.


## מה כבר מוכן בשבילך
שרת, מסד נתונים, קובצי הגדרה ל-Fly.io ול-VPS, סקריפט פריסה, כלי גיבוי. עברו בדיקות מול שרת אמיתי ודפדפן אמיתי.
**לא נבדק:** בניית תמונת Docker (אין דוקר בסביבה שבה בניתי), ופריסה בפועל. Fly בונה את התמונה אצלה ולכן לא צריך דוקר אצלך.

## מה רק אתה יכול לעשות
1. ליצור חשבון באירוח ולהזין כרטיס אשראי. Fly דורשת כרטיס לכל חשבון.
2. להריץ את הפקודות למטה בטרמינל שלך.
3. אופציונלי: לקנות דומיין, וליצור מפתח API של Anthropic לחישובי ה-AI.

---
## אפשרות א' (מומלצת): Fly.io
עלות משוערת: כ-2 דולר בחודש לשרת קטן (shared-cpu-1x, 256MB) ועוד 0.15 דולר ל-GB של אחסון קבוע. המחירים משתנים, בדקו ב-fly.io/pricing.

**1. התקנת הכלי** (פעם אחת)
- Mac: `brew install flyctl`
- Linux / Mac בלי brew: `curl -L https://fly.io/install.sh | sh`
- Windows (PowerShell): `iwr https://fly.io/install.ps1 -useb | iex`

**2. חשבון והתחברות** (פתיחת דפדפן והזנת כרטיס): `fly auth signup`  ·  אם כבר יש חשבון: `fly auth login`

**3. פריסה בפקודה אחת** (מתוך תיקיית הפרויקט):
```bash
./scripts/deploy-fly.sh dailyplanner fra
```
(הראשון הוא שם ייחודי שתבחרו, אותיות קטנות ומספרים. השני הוא אזור: `fra` פרנקפורט, הקרוב ביותר לישראל.)
הסקריפט יוצר את האפליקציה ונפח אחסון קבוע של 1GB, ובונה ומעלה. בסוף מודפסת כתובת בסגנון `https://dailyplanner.fly.dev`.
**חייבת להיות מכונה אחת בלבד** (SQLite). הסקריפט כבר מגדיר זאת ב-`--ha=false`.

**4. חישובי AI** (אופציונלי): ליצור מפתח ב-console.anthropic.com ואז:
```bash
ANTHROPIC_API_KEY=sk-ant-... ./scripts/deploy-fly.sh dailyplanner fra
```
או `fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a dailyplanner`. כל משתמש מוגבל ל-30 חישובים ביום (`AI_DAILY_LIMIT`).

**5. בדיקה אחרי העלאה** (5 דקות)
- לפתוח את הכתובת, ללחוץ "הרשמה", ליצור חשבון, להשלים פרופיל
- להוסיף 3 משימות, לרענן את הדף ולוודא שהן נשארו
- לפתוח מטלפון, להתחבר באותו חשבון ולוודא שרואים אותו דבר
- `fly status -a dailyplanner` ו-`fly logs -a dailyplanner` אמורים להראות מכונה אחת בריאה

**6. דומיין משלך** (אופציונלי)
```bash
fly certs add planner.example.com -a dailyplanner
fly certs show planner.example.com -a dailyplanner
```
ב-DNS של הדומיין: רשומת CNAME מ-`planner` אל `dailyplanner.fly.dev` (או הרשומות A/AAAA ש-`certs show` מציג). אחרי כמה דקות ה-HTTPS מוכן.

**7. גיבוי** (גיבויים אוטומטיים יש כבר; פירוט ושחזור ב-[DATA-SAFETY.md](DATA-SAFETY.md))
```bash
fly ssh console -a dailyplanner -C "node backup.mjs"
fly ssh console -a dailyplanner -C "ls -1 /data/backups"
fly ssh sftp get /data/backups/<שם-קובץ> ./planner-backup.db -a dailyplanner
```
Fly גם לוקחת צילומי נפח אוטומטיים (`fly volumes snapshots list -a dailyplanner`).

**8. עדכון גרסה:** לא ידנית. מיזוג ל-main מעלה אוטומטית (ראו CI-CD.md). ידנית, אם צריך: `fly deploy -a dailyplanner --ha=false`.
**9. לסגור הרשמה לחדשים:** `fly secrets set ALLOW_SIGNUP=0 -a dailyplanner`

---
## אפשרות ב': שרת VPS משלך
1. לקנות שרת קטן (Hetzner/DigitalOcean, כ-4–6 דולר בחודש), להתקין Docker, ולכוון רשומת A של הדומיין לכתובת השרת.
2. להעתיק את התיקייה לשרת ולהריץ: `DOMAIN=planner.example.com ANTHROPIC_API_KEY=... docker compose up -d`
3. Caddy מוציא תעודת HTTPS לבד. גיבוי: `docker compose exec app node backup.mjs`
4. אם אתה מעדיף את הקלאסטר שלך: אותה תמונה, Deployment עם replica אחד, אסטרטגיית Recreate ו-PVC על `/data`.

---
## לפני שפותחים לקהל רחב
(פירוט ושלבי עבודה ב-[ROADMAP.md](ROADMAP.md))
- כתבו מדיניות פרטיות ותנאי שימוש (נשמרים מייל, שם, תאריך לידה, תמונות ונתוני בריאות כמו קלוריות וצעדים). אם יש חשש משפטי, כדאי להתייעץ, כולל לגבי רישום מאגר מידע בישראל.
- אין עדיין שחזור סיסמה ואימות מייל. כרגע מי ששכח סיסמה לא יכול לשחזר אותה. מתאים לקבוצה קטנה ומכירה, ולא לציבור רחב.
