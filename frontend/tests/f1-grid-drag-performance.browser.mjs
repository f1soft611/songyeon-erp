import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

for (const width of [375, 768, 1280]) {
  test(`resets a large-data cell range on query at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    try {
      await page.route('**/__f1-grid-drag-performance-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;min-height:100%}*{box-sizing:border-box}</style></head><body><button id="query" type="button">Query</button><div id="root"></div></body></html>',
        }),
      );
      await page.goto(
        'http://127.0.0.1:4173/__f1-grid-drag-performance-test',
      );
      await page.evaluate(async () => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const React = (await import('/node_modules/.vite/deps/react.js')).default;
        const ReactDOM = (
          await import('/node_modules/.vite/deps/react-dom_client.js')
        ).default;
        const { F1Grid } = await import('/src/shared/components/f1-grid/index.ts');
        const rows = Array.from({ length: 10_000 }, (_, index) => ({
          id: `row-${index}`,
          code: `CODE-${index}`,
          name: `Name-${index}`,
        }));
        const columns = [
          { field: 'code', headerName: 'Code', width: 140 },
          { field: 'name', headerName: 'Name', width: 180 },
        ];
        const root = ReactDOM.createRoot(document.getElementById('root'));
        const renderGrid = (loading) =>
          root.render(
            React.createElement(
              'div',
              { style: { width: '100%', height: 560, padding: 8 } },
              React.createElement(F1Grid, {
                rows,
                columns,
                rowKey: 'id',
                showCheckbox: false,
                height: 520,
                rowHeight: 32,
                virtualizeRows: true,
                loading,
              }),
            ),
          );
        document.getElementById('query').addEventListener('click', () => {
          renderGrid(true);
          window.setTimeout(() => renderGrid(false), 500);
        });
        renderGrid(false);
      });

      const grid = page.locator('[role="grid"]');
      try {
        await grid.waitFor({ timeout: 8_000 });
      } catch (error) {
        const body = await page.locator('body').innerText();
        throw new Error(`${error.message}; page errors: ${errors.join(' | ')}; body: ${body}`);
      }
      const bodyScroll = page.getByTestId('f1-grid-body-scroll');
      await bodyScroll.evaluate((element) => {
        element.scrollTop = 160_000;
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      await page.locator('[data-f1-grid-row-id="row-5000"]').waitFor();

      const startCell = page.locator(
        '[data-f1-grid-row-id="row-5000"] [role="gridcell"]',
      ).first();
      const endCell = page.locator(
        '[data-f1-grid-row-id="row-5005"] [role="gridcell"]',
      ).last();
      const startBox = await startCell.boundingBox();
      const endBox = await endCell.boundingBox();
      assert.ok(startBox && endBox, 'virtualized drag endpoints must be visible');

      await page.mouse.move(
        startBox.x + startBox.width / 2,
        startBox.y + startBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        endBox.x + endBox.width / 2,
        endBox.y + endBox.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.locator('[data-range-overlay="drag"]').waitFor();
      assert.equal(await endCell.getAttribute('data-grid-selected'), 'true');
      assert.equal(
        await page.locator('[data-f1-grid-selecting="true"]').count(),
        0,
        'the range drag must finish after releasing the pointer',
      );

      await page.locator('#query').click();
      await page.getByTestId('f1-grid-loading-overlay').waitFor();
      assert.equal(await page.locator('[data-range-overlay]').count(), 0);
      await page
        .getByTestId('f1-grid-loading-overlay')
        .waitFor({ state: 'hidden' });
      assert.equal(await page.locator('[data-range-overlay]').count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        'the page must not overflow horizontally outside the grid scroller',
      );
      assert.deepEqual(errors, [], 'the browser must not report page errors');

      const screenshotDir =
        process.env.F1_GRID_SCREENSHOT_DIR ??
        path.resolve(
          process.cwd(),
          '..',
          'docs',
          'result',
          '20261027',
          'f1grid-range-reset-and-drag-performance',
          'screenshots',
        );
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, `range-reset-${width}.png`),
        fullPage: true,
      });
    } finally {
      await page.close();
    }
  });
}
