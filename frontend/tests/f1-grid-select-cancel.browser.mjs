import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

for (const width of [375, 768, 1280]) {
  test(`cancels select editing without a drag at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height: 720 } });
    try {
      await page.route('**/__select-edit-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>',
        }),
      );
      await page.goto('http://127.0.0.1:4173/__select-edit-test');
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
        window.gridRef = React.createRef();
        window.endEditCount = 0;
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
          React.createElement(
            'div',
            { style: { width: '100%', height: 500 } },
            React.createElement(F1Grid, {
              ref: window.gridRef,
              rows: [
                { id: 'line-1', code: 101, name: 'Target A' },
                { id: 'line-2', code: 102, name: 'Target B' },
              ],
              columns: [
                {
                  field: 'code',
                  headerName: 'Code',
                  type: 'select',
                  editable: true,
                  options: [
                    { value: 101, label: 'Original code' },
                    { value: 102, label: 'Another code' },
                  ],
                },
                { field: 'name', headerName: 'Name' },
              ],
              rowKey: 'id',
              showCheckbox: false,
              editorPlugins: [
                { endEdit: () => { window.endEditCount += 1; } },
              ],
            }),
          ),
        );
      });

      const grid = page.getByRole('grid');
      await grid.waitFor();
      await grid.getByRole('gridcell', { name: 'Original code' }).dblclick();
      await page.getByRole('combobox').click();
      await page.getByRole('listbox').waitFor();

      const target = page
        .locator('[role="gridcell"]')
        .filter({ hasText: 'Target B' });
      const targetBox = await target.boundingBox();
      assert.ok(targetBox);
      await page.mouse.click(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
      );

      if (process.env.F1_GRID_SCREENSHOT_DIR) {
        await mkdir(process.env.F1_GRID_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env.F1_GRID_SCREENSHOT_DIR,
            `select-cancel-${width}.png`,
          ),
          fullPage: true,
        });
      }

      assert.equal(await page.getByRole('combobox').count(), 0);
      assert.equal(await page.locator('[data-range-overlay="drag"]').count(), 0);
      assert.equal(await page.evaluate(() => window.endEditCount), 1);
      assert.deepEqual(
        await page.evaluate(() => window.gridRef.current.getChanges()),
        { insertedRows: [], updatedRows: [], deletedRows: [] },
      );
      assert.equal(
        await grid.getByRole('gridcell', { name: 'Original code' }).count(),
        1,
      );
    } finally {
      await browser.close();
    }
  });
}
