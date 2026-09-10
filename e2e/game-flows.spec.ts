import { test, type Page } from "@playwright/test";

const BASE = 'http://localhost:4321';

async function waitForHydration(page: Page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.waitForSelector('text=Aprende las banderas del mundo', { timeout: 15000 });
    await page.waitForTimeout(1500);
    const trigger = page.getByRole('button', { name: /Abrir perfil y configuraci/ });
    await trigger.click().catch(() => {});
    try {
      await page.waitForSelector('#user-modal-title', { timeout: 2500 });
      await page.keyboard.press('Escape');
      await page.waitForSelector('#user-modal-title', { state: 'detached', timeout: 3000 }).catch(() => {});
      return;
    } catch {
      await page.reload();
    }
  }
  throw new Error('app never hydrated (Vite 504?)');
}

async function reset(page: Page) {
  await page.goto(BASE);
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
    localStorage.clear();
  });
  await page.reload();
  await waitForHydration(page);
}

async function openConfig(page: Page) {
  const trigger = page.getByRole('button', { name: /Abrir perfil y configuraci/ });
  for (let i = 0; i < 10; i++) {
    await trigger.click().catch(() => {});
    try {
      await page.waitForSelector('#user-modal-title', { timeout: 1500 });
      return;
    } catch {
      await page.waitForTimeout(400);
    }
  }
  throw new Error('config modal did not open');
}

async function setMode(page: Page, mode: string) {
  await openConfig(page);
  await page.getByRole('tab', { name: 'Juego' }).click();
  await page.getByText(mode, { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.waitForSelector('#user-modal-title', { state: 'detached' });
}

function lsData(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('world-flags-learning-data');
    return raw ? JSON.parse(raw) : null;
  });
}

async function gradeUntilFinish(page: Page, endText: string) {
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator('text=' + endText).count()) return;
    const grade = page.getByRole('button', { name: /Bien/ }).first();
    if (await grade.count()) { await grade.click(); await page.waitForTimeout(150); continue; }
    const check = page.getByRole('button', { name: 'Comprobar' });
    if (await check.count()) {
      await page.fill('#country-answer', 'zzz');
      await check.click();
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(150);
  }
}

test.describe.configure({ mode: 'serial' });

test('T1 persistence: practice full continent then reload keeps lock', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  await gradeUntilFinish(page, 'Práctica terminada');
  await page.waitForSelector('text=Práctica terminada', { timeout: 8000 });
  const before = await lsData(page);
  console.log('T1 LPB after finish:', JSON.stringify(before?.lastPracticeByCountry));
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.waitForSelector('text=Aprende las banderas del mundo');
  console.log('T1 Practicado hoy count after finish:', await page.locator('text=Practicado hoy').count());
  await page.reload();
  await page.waitForSelector('text=Aprende las banderas del mundo');
  const after = await lsData(page);
  console.log('T1 LPB after reload:', JSON.stringify(after?.lastPracticeByCountry));
  console.log('T1 Practicado hoy count after reload:', await page.locator('text=Practicado hoy').count());
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForTimeout(400);
  console.log('T1 Ya practicaste visible:', await page.locator('text=/Ya practicaste/').count());
});

test('T2 double-click Comprobar in competitive', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Competitivo');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  const header = page.locator('header p').nth(1);
  console.log('T2 start index:', await header.textContent());
  await page.fill('#country-answer', 'zzz');
  await page.getByRole('button', { name: 'Comprobar' }).dblclick();
  await page.waitForTimeout(2000);
  console.log('T2 after dblclick index:', await header.textContent());
});

test('T3 rapid Enter submit in competitive', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Competitivo');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  const header = page.locator('header p').nth(1);
  await page.fill('#country-answer', 'zzz');
  await page.locator('#country-answer').press('Enter');
  await page.locator('#country-answer').press('Enter');
  await page.locator('#country-answer').press('Enter');
  await page.waitForTimeout(2000);
  console.log('T3 after triple enter index:', await header.textContent());
});

test('T4 double-click grade button in practice', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  await page.fill('#country-answer', 'zzz');
  await page.getByRole('button', { name: 'Comprobar' }).click();
  const progress = page.locator('header p').nth(1);
  console.log('T4 progress before:', await progress.textContent());
  await page.getByRole('button', { name: /Fácil/ }).first().dblclick();
  await page.waitForTimeout(500);
  console.log('T4 progress after dblclick Facil:', await progress.textContent());
  const d = await lsData(page);
  console.log('T4 countryHistory:', JSON.stringify(d?.countryHistory));
});

test('T5 spam keys 1-4 in practice after check', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  await page.fill('#country-answer', 'zzz');
  await page.getByRole('button', { name: 'Comprobar' }).click();
  const progress = page.locator('header p').nth(1);
  console.log('T5 progress before spam:', await progress.textContent());
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.keyboard.press('3');
  await page.keyboard.press('4');
  await page.waitForTimeout(500);
  console.log('T5 progress after spam:', await progress.textContent());
  const d = await lsData(page);
  console.log('T5 countryHistory:', JSON.stringify(d?.countryHistory));
});

test('T6 competitive best time persists on reload', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Competitivo');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  for (let i = 0; i < 3; i++) {
    await page.fill('#country-answer', 'zzz');
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.waitForTimeout(1300);
  }
  await page.waitForSelector('text=Rush terminado', { timeout: 8000 });
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.waitForSelector('text=Aprende las banderas del mundo');
  const before = await lsData(page);
  console.log('T6 regionBestTimes before reload:', JSON.stringify(before?.regionBestTimes));
  await page.reload();
  await page.waitForSelector('text=Aprende las banderas del mundo');
  const after = await lsData(page);
  console.log('T6 regionBestTimes after reload:', JSON.stringify(after?.regionBestTimes));
});

test('T7 empty scope blocks with message', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Todo el mundo', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForTimeout(300);
  console.log('T7 empty scope msg:', await page.locator('text=/Elige al menos un continente/').count());
});

test('T8 answer field limits', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  const check = page.getByRole('button', { name: 'Comprobar' });
  await page.fill('#country-answer', '     ');
  console.log('T8 disabled only spaces:', await check.isDisabled());
  await page.fill('#country-answer', 'a');
  console.log('T8 disabled single char:', await check.isDisabled());
  await page.fill('#country-answer', 'z'.repeat(10000));
  await check.click();
  await page.waitForTimeout(300);
  console.log('T8 after 10k answer session present:', await page.locator('#country-answer').count());
});

test('T9 reload mid-practice', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  await page.fill('#country-answer', 'zzz');
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: /Fácil/ }).first().click();
  await page.waitForTimeout(500);
  const mid = await lsData(page);
  console.log('T9 LPB mid-session:', JSON.stringify(mid?.lastPracticeByCountry));
  await page.reload();
  await page.waitForSelector('text=Aprende las banderas del mundo');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForTimeout(500);
  const present = await page.locator('#country-answer').count();
  const progress = present ? await page.locator('header p').nth(1).textContent() : null;
  console.log('T9 restarted present:', present, 'progress:', progress);
});

test('T10 Repetir practica after finish', async ({ page }) => {
  await reset(page);
  await setMode(page, 'Práctica');
  await page.getByText('Norteamérica', { exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar práctica' }).click();
  await page.waitForSelector('#country-answer');
  await gradeUntilFinish(page, 'Práctica terminada');
  await page.waitForSelector('text=Práctica terminada');
  await page.getByRole('button', { name: 'Repetir práctica' }).click();
  await page.waitForTimeout(800);
  console.log('T10 session present:', await page.locator('#country-answer').count());
  console.log('T10 back at config:', await page.locator('text=Aprende las banderas del mundo').count());
  console.log('T10 blocked message:', await page.locator('text=/Ya practicaste|Vuelve mañana/').count());
  console.log('T10 still on results:', await page.locator('text=Práctica terminada').count());
});

test('T11 modal a11y escape + outside click', async ({ page }) => {
  await reset(page);
  const trigger = page.getByRole('button', { name: /Abrir perfil y configuraci/ });
  await trigger.click();
  await page.waitForSelector('#user-modal-title');
  const f1 = await page.evaluate(() => {
    const ae = document.activeElement as HTMLElement | null;
    return { tag: ae && ae.tagName, inDialog: !!(ae && ae.closest('[role="dialog"]')) };
  });
  console.log('T11 focus on open:', JSON.stringify(f1));
  await page.keyboard.press('Escape');
  await page.waitForSelector('#user-modal-title', { state: 'detached' });
  const f2 = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
  console.log('T11 focus aria-label after escape:', f2);
  await trigger.click();
  await page.waitForSelector('#user-modal-title');
  await page.mouse.click(3, 3);
  await page.waitForTimeout(400);
  console.log('T11 modal still open after outside click:', await page.locator('#user-modal-title').count());
});

test('T12 tabs keyboard arrows', async ({ page }) => {
  await reset(page);
  await page.getByRole('button', { name: /Abrir perfil y configuraci/ }).click();
  await page.waitForSelector('#user-modal-title');
  const accountTab = page.getByRole('tab', { name: 'Usuario' });
  await accountTab.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const sel = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    return tabs.map((t) => ({ txt: t.textContent, selected: t.getAttribute('aria-selected') }));
  });
  console.log('T12 tabs after ArrowRight:', JSON.stringify(sel));
});

test('T13 two tabs practice same continent', async ({ browser }) => {
  const ctx = await browser.newContext();
  const p1 = await ctx.newPage();
  await reset(p1);
  await setMode(p1, 'Práctica');
  const p2 = await ctx.newPage();
  await p2.goto(BASE);
  await p2.waitForSelector('text=Aprende las banderas del mundo');
  await p1.getByText('Norteamérica', { exact: true }).click();
  await p1.getByRole('button', { name: 'Comenzar práctica' }).click();
  await p1.waitForSelector('#country-answer');
  await gradeUntilFinish(p1, 'Práctica terminada');
  await p1.waitForSelector('text=Práctica terminada');
  await p2.getByText('Norteamérica', { exact: true }).click();
  await p2.getByRole('button', { name: 'Comenzar práctica' }).click();
  await p2.waitForTimeout(600);
  console.log('T13 p2 session present (stale):', await p2.locator('#country-answer').count());
  console.log('T13 p2 blocked msg:', await p2.locator('text=/Ya practicaste/').count());
  const p2ls = await lsData(p2);
  console.log('T13 p2 LPB:', JSON.stringify(p2ls?.lastPracticeByCountry));
  await ctx.close();
});

test('T14 theme persists + FOUC check', async ({ page }) => {
  await reset(page);
  await page.getByRole('button', { name: /Abrir perfil y configuraci/ }).click();
  await page.waitForSelector('#user-modal-title');
  await page.getByRole('tab', { name: 'Juego' }).click();
  await page.getByText('Oscuro', { exact: true }).click();
  await page.waitForTimeout(200);
  console.log('T14 data-theme after pick dark:', await page.evaluate(() => document.documentElement.dataset.theme));
  console.log('T14 localStorage theme:', await page.evaluate(() => localStorage.getItem('theme')));
  await page.reload();
  await page.waitForTimeout(50);
  console.log('T14 data-theme right after reload (t+50ms):', await page.evaluate(() => document.documentElement.dataset.theme));
  await page.waitForTimeout(500);
  console.log('T14 data-theme after hydration:', await page.evaluate(() => document.documentElement.dataset.theme));
});
