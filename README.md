# Territory — משחק טריטוריה/מסחר (פרוטוטייפ)

משחק שבו כל שחקן מתחיל עם משבצת אחת בעולם ענק (1000×1000) ומתרחב
לשטח גדול יותר — בעזרת **זמן פעיל** מול המסך (צובר קרדיט) וקנייה/כיבוש
של **משבצות צמודות** בלבד. כל משבצת שבבעלותך ניתנת לעריכה (צבע, תמונה),
בנפרד או כמה משבצות יחד.

## הרצה

פותחים את `index.html` בדפדפן. **אין build step, אין שרת, אין התקנות.**

## איך משחקים

- העולם הוא מטריצה של **1000×1000** משבצות, מצוירת על `<canvas>`.
  **זום** עם גלגל/צביטה או כפתורי +/−, **גרירה** להזזה. כפתור "🌍 כל העולם"
  מראה את כל המפה; "🎯 שלי" חוזר לטריטוריה.
- הטריטוריה **גדלה מעצמה** ככל שנשארים באפליקציה (משבצת צמודה חדשה כל
  כמה שניות) — לא בוחרים איזו משבצת, היא פשוט מתווספת. הטיימר "משבצת הבאה"
  בראש המסך מראה כמה נשאר.
- **אזורים** מיוחדים בנוף — 🌊 ים, 🏙️ עיר, 🚆 רכבת — רב-משבצתיים ולא
  ניתנים לכיבוש; בזום קרוב הם מצוירים בפירוט ובאנימציה אמיתית (גלי ים
  שזזים, בניינים עם חלונות שנדלקים, רכבת שנעה על המסילה).
- **עריכה**: נוגעים במשבצת שלך ומשנים צבע/תמונה (תמונות מוקטנות אוטומטית).
  "בחירה מרובה" מאפשר לשלוט בכמה משבצות כמקשה אחת.
- **מצב לילה** 🌙 — רקע שחור-כמעט-מוחלט לשהייה ארוכה. הבחירה נשמרת.

ההתקדמות נשמרת אוטומטית (localStorage).

## ארכיטקטורה — הפרדה מוחלטת בין לוגיקה לתצוגה

```
src/
  core/        ← לוגיקה ניידת טהורה (PORTABLE) — אין שום גישה ל-DOM
    config.js      קבועי המשחק (גודל עולם, גידול, מצלמה)
    tokens.js      Design Tokens (צבעים/מרווחים/נושאים) — מקור אמת יחיד
    logic.js       חוקים טהורים: גריד/שכנות, גידול אוטומטי, מצלמה, זריעה
    reducer.js     מצב התחלתי + reducer טהור (state, action) -> state
    store.js       Store מרוכז (getState / dispatch / subscribe)
    selectors.js   נתונים נגזרים, כולל scene() — מה לצייר בכל פריים
  platform/    ← אבסטרקציה ל-Browser APIs (PLATFORM-SPECIFIC)
    platform.js    Storage (localStorage), Ticker (זמן פעיל), קריאת/הקטנת תמונה
  ui/          ← שכבת תצוגה דקה (PLATFORM-SPECIFIC) — רינדור + האזנה בלבד
    h.js           hyperscript זעיר (כמו React.createElement)
    theme.js       מזריק את הטוקנים כ-CSS variables
    canvasRenderer.js  ציור המפה על canvas + אנימציות האזורים
    components.js  קומפוננטות סביב המפה (TopBar/Controls/Panel)
    app.js         חיווט: canvas, מצלמה, מחוות (גרירה/זום), לולאת אנימציה
  main.js      ← נקודת כניסה (composition root)
styles.css     ← Flexbox, RTL, נטול ערכים קשיחים (var(--token) בלבד)
index.html
```

> המפה היא `<canvas>` — ההמרה העתידית: `canvasRenderer.js` → `CustomPainter`
> ב-Flutter או Skia/Canvas ב-React Native; שאר הקומפוננטות → widgets/JSX.

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
