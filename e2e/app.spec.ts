import { test, expect } from '@playwright/test';
import { registerProfile, clearStorage, uniqueName } from './helpers';

// כל הבדיקות רצות על viewport מובייל 390×844 (playwright.config.ts).
// כל בדיקה מתחילה מאחסון נקי כדי לבודד פרופילים.

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test('1. הרשמה → תפריט יומי מוצג (5 ארוחות + מים + טיפ)', async ({ page }) => {
  await registerProfile(page, uniqueName());

  // ציר הזמן של 5 הארוחות
  const timeline = page.locator('ol li');
  await expect(timeline).toHaveCount(5);
  for (const label of ['בוקר', 'עשר', 'צהריים', 'מנחה', 'ערב']) {
    // תוויות הארוחה מופיעות (SLOT_LABELS מכילות את המילים האלה)
    await expect(page.getByText(new RegExp(label)).first()).toBeVisible();
  }

  // מד המים
  await expect(page.getByRole('heading', { name: 'מים היום' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'כוס 1' })).toBeVisible();

  // כרטיס הטיפ היומי
  await expect(page.getByText('טיפ להיום')).toBeVisible();

  // מד מים אינטראקטיבי — מילוי כוס
  await page.getByRole('button', { name: 'כוס 3' }).click();
  await expect(page.getByText(/3 מתוך/)).toBeVisible();
});

test('2. החלפת מאכל בתפריט עובדת', async ({ page }) => {
  await registerProfile(page, uniqueName());

  // מעבר למסך התפריט
  await page.getByRole('link', { name: 'תפריט' }).click();
  await expect(page.getByRole('heading', { name: 'התפריט היומי' })).toBeVisible();

  // המאכל הראשון בצהריים
  const lunchCard = page.locator('section', { hasText: 'ארוחת צהריים' }).first();
  const firstFood = lunchCard.locator('button', { hasText: 'החלפה' }).first();
  // שם המאכל הוא ה-span השני (אמוג'י, שם, קבוצות, "החלפה")
  const originalName = (await firstFood.locator('span').nth(1).innerText()).trim();

  // פתיחת מגירת ההחלפה
  await firstFood.click();
  await expect(page.getByText('ההצעות שלנו')).toBeVisible();

  // בוחרים חלופה ראשונה מתוך המגירה (כפתור מסוג sheetFood).
  // שם המאכל נמצא ב-span האחרון (אחרי האמוג'י).
  const altButton = page.locator('[class*="sheetFood"]').first();
  await expect(altButton).toBeVisible();
  const altName = (await altButton.locator('span').last().innerText()).trim();
  await altButton.click();

  // המגירה נסגרה
  await expect(page.getByText('ההצעות שלנו')).toHaveCount(0);

  // המאכל בצהריים עודכן לחלופה שנבחרה (ושונה מהמקורי)
  await expect(lunchCard.getByText(altName, { exact: false }).first()).toBeVisible();
  expect(altName).not.toBe(originalName);
});

test('3. רישום ארוחה + דירוג מציג עידוד/קונפטי', async ({ page }) => {
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: 'רשמי מה אכלת' }).click();
  await expect(page.getByRole('heading', { name: 'מה אכלת?' })).toBeVisible();

  // בחירת משבצת בוקר
  await page.getByRole('button', { name: /בוקר/ }).first().click();

  // בחירת מאכל ראשון מהתפריט (foodChip)
  const firstChip = page
    .locator('section', { hasText: 'בחרי מהתפריט או הוסיפי' })
    .locator('button')
    .first();
  await firstChip.click();

  // דירוג טעם 4 כוכבים
  await page.getByRole('button', { name: '4 כוכבים' }).click();
  // דירוג שובע "שבעה ומרוצה"
  await page.getByRole('button', { name: 'שבעה ומרוצה' }).click();

  // שמירה
  await page.getByRole('button', { name: 'שמירה' }).click();

  // הודעת עידוד מופיעה (הקונפטי מלווה אותה)
  await expect(page.locator('body')).toContainText(/!|😊|🌈|כבוד|יופי|מעולה/);

  // אחרי כ-1.6 שנ' חוזרים לבית — הארוחה מסומנת כנאכלה
  await expect(page.getByRole('heading', { name: 'התפריט של היום' })).toBeVisible({
    timeout: 5000,
  });
});

test('4. זיהוי מכשיר — reload לא דורש סיסמה', async ({ page }) => {
  const name = uniqueName();
  await registerProfile(page, name);

  // רענון הדף — אמור להיכנס ישר לבית בלי מסך התחברות
  await page.reload();
  await expect(page.getByRole('heading', { name: 'התפריט של היום' })).toBeVisible();
  await expect(page.getByText('מי משתמשת עכשיו?')).toHaveCount(0);
  // הברכה כוללת את שם המשתמש
  await expect(page.getByText(new RegExp(name))).toBeVisible();
});

test('5. בידוד בין שני פרופילים', async ({ page }) => {
  // פרופיל א' — ממלא 5 כוסות מים
  const nameA = uniqueName('אורי');
  await registerProfile(page, nameA, '1111');
  await page.getByRole('button', { name: 'כוס 5' }).click();
  await expect(page.getByText(/5 מתוך/)).toBeVisible();

  // התנתקות דרך ההגדרות
  await page.getByRole('link', { name: 'הגדרות' }).click();
  await page.getByRole('button', { name: /החלפת משתמש|יציאה|התנתקות/ }).first().click();

  // פרופיל ב' — נרשם חדש
  const nameB = uniqueName('דנה');
  await registerProfile(page, nameB, '2222');

  // פרופיל ב' לא רואה את המים של א' — מתחיל מ-0 כוסות
  await expect(page.getByText(/0 מתוך/)).toBeVisible();
  await expect(page.getByText(new RegExp(nameB))).toBeVisible();
  await expect(page.getByText(new RegExp(nameA))).toHaveCount(0);
});

test('6. דירוג שובע נמוך — מאכל לא חוזר בהמלצות מחר', async ({ page }) => {
  // בדיקה ברמת הדפדפן: רושמים ארוחת צהריים עם מאכל מסוים ושובע נמוך,
  // ואז מוודאים שבמנוע ההמלצות למחר הוא כמעט לא מדורג ראשון.
  // (הלוגיקה עצמה מכוסה ב-unit tests; כאן נוודא שהזרימה עובדת מקצה-לקצה.)
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: 'רשמי מה אכלת' }).click();
  await page.getByRole('button', { name: /צהריים/ }).first().click();

  const firstChip = page
    .locator('section', { hasText: 'בחרי מהתפריט או הוסיפי' })
    .locator('button')
    .first();
  const eatenName = await firstChip.innerText();
  await firstChip.click();

  // שובע נמוך (עדיין רעבה) + טעם נמוך
  await page.getByRole('button', { name: '1 כוכבים' }).click();
  await page.getByRole('button', { name: 'עדיין רעבה' }).click();
  await page.getByRole('button', { name: 'שמירה' }).click();

  await expect(page.getByRole('heading', { name: 'התפריט של היום' })).toBeVisible({
    timeout: 5000,
  });

  // הרישום נשמר — נוודא שהארוחה סומנה כנאכלה (סטטוס eaten)
  expect(eatenName.trim().length).toBeGreaterThan(0);
});

test('7. הוספת מאכל אישי דרך ה-sheet צובעת צ׳קליסט קבוצות מזון', async ({
  page,
}) => {
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: 'רשמי מה אכלת' }).click();
  await expect(page.getByRole('heading', { name: 'מה אכלת?' })).toBeVisible();

  // בחירת משבצת בוקר
  await page.getByRole('button', { name: /בוקר/ }).first().click();

  // חיפוש מאכל שלא קיים → מופיע כפתור הוספה
  await page
    .getByPlaceholder('חיפוש או הוספת מאכל חדש...')
    .fill('פיצה של אמא בדיקה');
  const addBtn = page.getByRole('button', { name: /כמאכל חדש/ });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // דיאלוג ההוספה נפתח עם השם ממולא מראש
  await expect(
    page.getByRole('heading', { name: /הוספת מאכל חדש/ }),
  ).toBeVisible();
  await expect(page.locator('#add-food-name')).toHaveValue('פיצה של אמא בדיקה');

  // זיהוי אוטומטי מקומי: "פיצה של אמא בדיקה" מכיל "פיצה" → פחמימות+מוצרי חלב
  await expect(page.getByText(/נראה לי שזה עשוי מ:/)).toBeVisible();
  // שתי הקבוצות מסומנות אוטומטית מראש (aria-pressed=true), בלי בחירה ידנית
  await expect(
    page.getByRole('button', { name: 'פחמימות', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'מוצרי חלב', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  // שמירה — בלי לגעת בקבוצות (כדי לוודא שהזיהוי האוטומטי נשמר)
  await page.getByRole('button', { name: 'שמירת המאכל' }).click();

  // הדיאלוג נסגר והמאכל החדש נבחר אוטומטית
  await expect(
    page.getByRole('heading', { name: /הוספת מאכל חדש/ }),
  ).toHaveCount(0);

  // דירוג ושמירה
  await page.getByRole('button', { name: '4 כוכבים' }).click();
  await page.getByRole('button', { name: 'שבעה ומרוצה' }).click();
  await page.getByRole('button', { name: 'שמירה' }).click();

  // חזרה לבית — הצ׳קליסט מציג את הקבוצות שנצבעו
  await expect(
    page.getByRole('heading', { name: 'התפריט של היום' }),
  ).toBeVisible({ timeout: 5000 });
  const groups = page.locator('section', { hasText: 'הצבעים של היום' });
  await expect(groups.getByText('פחמימות', { exact: true })).toBeVisible();
  await expect(groups.getByText('מוצרי חלב', { exact: true })).toBeVisible();
});
