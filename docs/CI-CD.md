# מסלול השינויים: מקוד לאתר

```
ענף חדש → pull request → [בדיקות רצות אוטומטית] → מיזוג ל-main → [בדיקות שוב] → שומר → פריסה ל-Fly.io
```
- **pull request:** רק בדיקות. שום דבר לא עולה לאוויר.
- **מיזוג ל-main:** בדיקות, ואם עברו: שומר (שם האפליקציה והנפח לא השתנו) ואז `flyctl deploy`. אם משהו אדום, **האתר נשאר כמו שהוא**.
- קובץ ה-workflow: `.github/workflows/deploy.yml`. עותק לקריאה והדבקה: [ci/deploy.workflow.yml](ci/deploy.workflow.yml) (העותק הזה לא רץ, רק הקובץ בתיקיית `.github`).

## טוקנים וסודות (ומה מותר לכל אחד)
| מה | איפה נשמר | מה הוא מאפשר |
|---|---|---|
| `FLY_API_TOKEN` | **רק** ב-GitHub: Settings ← Secrets and variables ← Actions | פריסה של אפליקציה אחת (`dailyplanner`). נוצר עם `fly tokens create deploy -a dailyplanner` |
| טוקן GitHub של Claude (fine-grained) | בצ'אט בלבד, תוקף קצר, ואז מבטלים | לכתוב קוד לענפים ולפתוח pull request בריפו הזה בלבד. **בלי** הרשאת Workflows: אי אפשר לשנות את צינור הפריסה, ולכן גם לא לגשת ל-`FLY_API_TOKEN` |
| `ANTHROPIC_API_KEY` | `fly secrets` בלבד | חישובי AI. לא בקוד ולא ב-GitHub |

שינוי בקובץ ה-workflow מתבצע **רק על ידי הבעלים**, דרך ממשק האתר של GitHub (Add file ← Create new file) או מהטרמינל עם הרשאת `workflow`.
כללי הגנה מומלצים על `main` (Settings ← Rules ← Rulesets): Restrict deletions · Block force pushes · Require a pull request before merging.

## חזרה לגרסה קודמת (rollback)
הנתונים לא תלויים בגרסה, אז חזרה אחורה לא נוגעת בהם.
```bash
fly releases -a dailyplanner            # רשימת גרסאות
fly deploy -a dailyplanner --image <הפניה-לתמונה-מהגרסה-הטובה> --ha=false
```
או: `git revert <commit>` ← pull request ← מיזוג, והצינור מעלה את הגרסה המתוקנת.
**אם הבעיה היא במסד הנתונים** (לא בקוד) ראו שחזור ב-[DATA-SAFETY.md](DATA-SAFETY.md).

## הרצת הבדיקות מקומית
`node --no-warnings tests/api.test.mjs`. הן מפעילות שרת אמיתי על תיקייה זמנית.

## אם הפריסה נכשלה
בטאב Actions בגיטהאב: ה-job `test` אדום = בדיקה שנכשלה (האתר לא השתנה). `deploy` אדום = בעיית פריסה, ובדרך כלל היומן מסביר. כל עוד האתר ב-`https://dailyplanner.fly.dev/healthz` מחזיר `ok`, הוא ממשיך לעבוד.
