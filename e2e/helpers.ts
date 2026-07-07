import { type Page, expect } from '@playwright/test';

/**
 * נרשם פרופיל חדש דרך מסך ההרשמה ומגיע למסך הבית.
 * מחזיר את שם המשתמש שנוצר.
 */
export async function registerProfile(
  page: Page,
  username: string,
  password = '1234',
): Promise<string> {
  await page.goto('/login');
  // ללא פרופילים במכשיר, מסך הכניסה מפנה אוטומטית להרשמה. אם בכל זאת מוצג
  // כרטיס "פרופיל חדש" (קיימים פרופילים) — לוחצים עליו.
  const newProfileCard = page.getByText('פרופיל חדש');
  if (await newProfileCard.count()) {
    await newProfileCard.click().catch(() => {});
  }

  await expect(
    page.getByRole('heading', { name: /פרופיל חדש/ }),
  ).toBeVisible();

  await page.getByPlaceholder('שם משתמש').fill(username);
  await page.getByPlaceholder('סיסמה').fill(password);
  await page.getByPlaceholder('התשובה שרק את יודעת').fill('רקסי');
  await page.getByRole('button', { name: 'יוצרים פרופיל!' }).click();

  // הגענו למסך הבית — יומן היום
  await expect(page.getByRole('heading', { name: 'היומן של היום' })).toBeVisible();
  return username;
}

/** מנקה את כל האחסון המקומי (IndexedDB + localStorage) לבידוד בין בדיקות */
export async function clearStorage(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      await Promise.all(
        dbs.map(
          (d) =>
            new Promise<void>((res) => {
              if (!d.name) return res();
              const req = indexedDB.deleteDatabase(d.name);
              req.onsuccess = req.onerror = req.onblocked = () => res();
            }),
        ),
      );
    }
  });
}

/** יוצר שם משתמש ייחודי לכל בדיקה */
export function uniqueName(prefix = 'נועה'): string {
  return `${prefix}${Math.floor(Math.random() * 100000)}`;
}
