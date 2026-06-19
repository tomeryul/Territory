# Territory — משחק טריטוריה/מסחר (פרוטוטייפ)

משחק שבו כל שחקן מתחיל עם משבצת אחת בעולם ענק (1000×1000) ומתרחב
לשטח גדול יותר — בעזרת **זמן פעיל** מול המסך (צובר קרדיט) וקנייה/כיבוש
של **משבצות צמודות** בלבד. כל משבצת שבבעלותך ניתנת לעריכה (צבע, תמונה),
בנפרד או כמה משבצות יחד.

## הרצה

פותחים את `index.html` בדפדפן. **אין build step, אין שרת, אין התקנות.**

## איך משחקים

- העולם הוא מטריצה של **1000×1000** משבצות. מתחילים עם משבצת אחת במרכז.
- **קרדיט** נצבר אוטומטית כל עוד האפליקציה פעילה על המסך (1 לשנייה) —
  זו הדרך היחידה כרגע להתרחב.
- **כיבוש** משבצת פנויה צמודה לטריטוריה שלך — עולה קרדיט.
- **אזורים** מיוחדים פזורים בנוף — 🌊 ים, 🏙️ עיר, 🚆 רכבת — רב-משבצתיים
  ולא ניתנים לכיבוש; מתרחבים סביבם.
- **עריכה**: בוחרים משבצת שלך ומשנים צבע/תמונה (תמונות מוקטנות אוטומטית).
  כפתור "בחירה מרובה" מאפשר לשלוט בכמה משבצות כמקשה אחת.
- **מצב לילה** 🌙 — רקע שחור-כמעט-מוחלט לשהייה ארוכה. הבחירה נשמרת.

ההתקדמות נשמרת אוטומטית (localStorage).

## ארכיטקטורה — הפרדה מוחלטת בין לוגיקה לתצוגה

```
src/
  core/        ← לוגיקה ניידת טהורה (PORTABLE) — אין שום גישה ל-DOM
    config.js      קבועי המשחק (גודל עולם, כלכלה, viewport)
    tokens.js      Design Tokens (צבעים/מרווחים/נושאים) — מקור אמת יחיד
    logic.js       חוקי המשחק כפונקציות טהורות (שכנוּת, ולידציות, זריעה)
    reducer.js     מצב התחלתי + reducer טהור (state, action) -> state
    store.js       Store מרוכז (getState / dispatch / subscribe)
    selectors.js   נתונים נגזרים לרינדור (כולל מטריצת ה-viewport)
  platform/    ← אבסטרקציה ל-Browser APIs (PLATFORM-SPECIFIC)
    platform.js    Storage (localStorage), Ticker (זמן פעיל), קריאת קבצים
  ui/          ← שכבת תצוגה דקה (PLATFORM-SPECIFIC) — רינדור + האזנה בלבד
    h.js           hyperscript זעיר (כמו React.createElement)
    theme.js       מזריק את הטוקנים כ-CSS variables
    components.js  קומפוננטות (פונקציה לכל אזור במסך)
    app.js         חיווט ה-store לרינדור
  main.js      ← נקודת כניסה (composition root)
styles.css     ← Flexbox בלבד, RTL, נטול ערכים קשיחים (var(--token) בלבד)
index.html
```

### עקרונות (כמיפוי עתידי)

| עיקרון | מימוש כאן | בעתיד |
|---|---|---|
| State מרוכז | `store.js` + reducer טהור | Redux / Zustand / Bloc |
| לוגיקה ללא DOM | כל `src/core/` | מועתק כמעט 1:1 |
| UI כקומפוננטות | פונקציות ב-`components.js` | קומפוננטות React / widgets |
| Browser API עטוף | `platform/platform.js` | AsyncStorage / shared_preferences |
| Design tokens | `tokens.js` | ThemeProvider / ThemeData |
| Layout | Flexbox בלבד | React Native / Flutter |
| `h(tag, props, kids)` | `ui/h.js` | `<tag {...props}>` ב-React |

הערות בקוד מסומנות במפורש: **`[לוגיקה ניידת / PORTABLE LOGIC]`** מול
**`[UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]`**.

## להמרה ל-React/React Native/Flutter

1. `src/core/*` עוברים כמעט כמו שהם (החלפת ה-namespace ב-`import/export`).
2. מחליפים את `src/platform/platform.js` במימוש הנייטיב.
3. מחליפים את `src/ui/*` בקומפוננטות הפלטפורמה — לפי אותו פירוק לאזורים.
