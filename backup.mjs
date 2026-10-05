// גיבוי עקבי של מסד הנתונים (בטוח גם כשהשרת רץ). שימוש:  node backup.mjs [נתיב-יעד]
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const dir = process.env.DATA_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), 'data');
const out = process.argv[2] || path.join(dir, 'backup.db');
const db = new DatabaseSync(path.join(dir, 'planner.db'));
try { fs.rmSync(out, { force: true }); db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`); console.log('הגיבוי נשמר ב-' + out + ' (' + fs.statSync(out).size + ' בתים)'); }
finally { db.close(); }
