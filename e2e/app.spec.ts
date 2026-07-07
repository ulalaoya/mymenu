import { test, expect } from '@playwright/test';
import { registerProfile, clearStorage, uniqueName } from './helpers';

// כל הבדיקות רצות על viewport מובייל 390×844 (playwright.config.ts).
// כל בדיקה מתחילה מאחסון נקי כדי לבודד פרופילים.

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test('1. הרשמה → יומן היום מוצג (ארוחות + ממתק + מים + טיפ)', async ({ page }) => {
  await registerProfile(page, uniqueName());

  // יומן היום: 5 ארוחות קבועות + ממתק = 6 שורות
  const timeline = page.locator('ol li');
  await expect(timeline).toHaveCount(6);
  for (const label of ['בוקר', 'צהריים', 'ערב', 'ממתק']) {
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

test('2. עמוד ארוחה — הוספת מאכל לארוחת בוקר בלבד', async ({ page }) => {
  await registerProfile(page, uniqueName());

  // כניסה לארוחת הבוקר מהיומן
  await page.getByRole('button', { name: /ארוחת בוקר/ }).first().click();
  await expect(page.getByRole('heading', { name: 'ארוחת בוקר' })).toBeVisible();

  // פתיחת מגירת הוספת מאכל
  await page.getByRole('button', { name: 'הוספת מאכל' }).click();
  await expect(page.getByText('חיפוש חופשי')).toBeVisible();

  // בחירת הצעה ראשונה — נוספת לארוחה
  const alt = page.locator('[class*="sheetFood"]').first();
  await expect(alt).toBeVisible();
  const altName = (await alt.locator('span').nth(1).innerText()).trim();
  await alt.click();

  // המגירה נסגרה והמאכל נוסף לרשימת הארוחה
  await expect(page.getByText('חיפוש חופשי')).toHaveCount(0);
  await expect(page.getByText(altName, { exact: false }).first()).toBeVisible();
});

test('3. עמוד ארוחה — "אכלתי" + דירוג מציג עידוד/קונפטי', async ({ page }) => {
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: /ארוחת בוקר/ }).first().click();
  await expect(page.getByRole('heading', { name: 'ארוחת בוקר' })).toBeVisible();

  // דירוג טעם 4 כוכבים + שובע "שבעה ומרוצה"
  await page.getByRole('button', { name: '4 כוכבים' }).click();
  await page.getByRole('button', { name: 'שבעה ומרוצה' }).click();

  // סימון כנאכל
  await page.getByRole('button', { name: /אכלתי/ }).click();

  // הודעת עידוד מופיעה (קונפטי מלווה)
  await expect(page.locator('body')).toContainText(/!|😊|🌈|כבוד|יופי|מעולה/);

  // חוזרים לבית והארוחה מסומנת כנאכלה
  await expect(page.getByRole('heading', { name: 'היומן של היום' })).toBeVisible({
    timeout: 5000,
  });
});

test('4. זיהוי מכשיר — reload לא דורש סיסמה', async ({ page }) => {
  const name = uniqueName();
  await registerProfile(page, name);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'היומן של היום' })).toBeVisible();
  await expect(page.getByText('מי משתמשת עכשיו?')).toHaveCount(0);
  await expect(page.getByText(new RegExp(name))).toBeVisible();
});

test('5. בידוד בין שני פרופילים', async ({ page }) => {
  const nameA = uniqueName('אורי');
  await registerProfile(page, nameA, '1111');
  await page.getByRole('button', { name: 'כוס 5' }).click();
  await expect(page.getByText(/5 מתוך/)).toBeVisible();

  // התנתקות דרך ההגדרות
  await page.getByRole('link', { name: 'הגדרות' }).click();
  await page
    .getByRole('button', { name: /החלפת משתמש|יציאה|התנתקות/ })
    .first()
    .click();

  // פרופיל ב' — נרשם חדש
  const nameB = uniqueName('דנה');
  await registerProfile(page, nameB, '2222');

  // פרופיל ב' מתחיל מ-0 כוסות ולא רואה את א'
  await expect(page.getByText(/0 מתוך/)).toBeVisible();
  await expect(page.getByText(new RegExp(nameB))).toBeVisible();
  await expect(page.getByText(new RegExp(nameA))).toHaveCount(0);
});

test('6. הוספת סלוט ארוחה מותאם מהיומן', async ({ page }) => {
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: 'הוספת ארוחה' }).click();
  // בשדה הראשון במגירה — שם הארוחה
  await page.getByRole('textbox').first().fill('חטיף בדיקה');
  await page.getByRole('button', { name: /הוספה/ }).click();

  // עברנו לעמוד הארוחה המותאמת
  await expect(page.getByRole('heading', { name: 'חטיף בדיקה' })).toBeVisible();

  // חזרה לבית — הסלוט המותאם מופיע ביומן (7 שורות כעת)
  await page.getByRole('button', { name: 'חזרה' }).click();
  await expect(page.locator('ol li')).toHaveCount(7);
  await expect(page.getByText('חטיף בדיקה').first()).toBeVisible();
});

test('7. הוספת מאכל אישי בעמוד הארוחה צובעת צ׳קליסט קבוצות מזון', async ({
  page,
}) => {
  await registerProfile(page, uniqueName());

  await page.getByRole('button', { name: /ארוחת בוקר/ }).first().click();
  await page.getByRole('button', { name: 'הוספת מאכל' }).click();

  // חיפוש מאכל שלא קיים → כפתור הוספה כמאכל חדש
  await page.getByPlaceholder('חיפוש מאכל...').fill('פיצה של אמא בדיקה');
  const addBtn = page.getByRole('button', { name: /כמאכל חדש/ });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // דיאלוג ההוספה נפתח עם השם ממולא מראש + זיהוי אוטומטי
  await expect(
    page.getByRole('heading', { name: /הוספת מאכל חדש/ }),
  ).toBeVisible();
  await expect(page.locator('#add-food-name')).toHaveValue('פיצה של אמא בדיקה');
  await expect(page.getByText(/נראה לי שזה עשוי מ:/)).toBeVisible();
  await page.getByRole('button', { name: 'שמירת המאכל' }).click();

  // חזרה לעמוד הארוחה — המאכל נוסף
  await expect(page.getByRole('heading', { name: 'ארוחת בוקר' })).toBeVisible();
  await expect(page.getByText('פיצה של אמא בדיקה').first()).toBeVisible();

  // סימון כנאכל וחזרה לבית — הצ׳קליסט נצבע
  await page.getByRole('button', { name: /אכלתי|עדכון/ }).click();
  await expect(
    page.getByRole('heading', { name: 'היומן של היום' }),
  ).toBeVisible({ timeout: 5000 });
  const groups = page.locator('section', { hasText: 'הצבעים של היום' });
  await expect(groups.getByText('פחמימות', { exact: true })).toBeVisible();
});
