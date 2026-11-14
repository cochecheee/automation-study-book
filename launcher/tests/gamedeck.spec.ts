import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let app: ElectronApplication;
let page: Page;

test.beforeEach(async () => {
  // A throw-away profile per test: localStorage (the library) starts from the sample data every time.
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gamedeck-'));
  app = await electron.launch({ args: ['.', `--user-data-dir=${userData}`] });
  page = await app.firstWindow();
});

test.afterEach(async () => {
  await app.close();
});

test('search and add a game (same steps as the Live Demo)', async () => {
  await page.getByPlaceholder('Search your library').fill('sword');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await page.getByPlaceholder('Search your library').fill('');

  await page.getByRole('button', { name: 'Add a game' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Name').fill('Retro Racer');
  await page.getByLabel('Executable path').fill('D:\\Games\\RetroRacer\\racer.exe');
  await page.getByRole('button', { name: 'Add game', exact: true }).click();

  await expect(page.getByRole('listitem', { name: 'Retro Racer' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('added to your library');
});

test('remove a game, then undo', async () => {
  await page.getByRole('listitem', { name: 'Fish Frenzy' }).click();
  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('menuitem', { name: 'Remove from library' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('listitem', { name: 'Fish Frenzy' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('listitem', { name: 'Fish Frenzy' })).toHaveCount(1);
});

// Only possible with Electron: talk to the MAIN process, not just the page.
test('main process: the window is frameless and 1280x720', async () => {
  const info = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const { width, height } = win.getBounds();
    return { width, height, title: win.getTitle() };
  });
  expect(info.width).toBe(1280);
  expect(info.height).toBe(720);
});

test('window controls go through IPC to the main process', async () => {
  await page.getByRole('button', { name: 'Minimize' }).click();
  const minimized = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized());
  expect(minimized).toBe(true);
});
