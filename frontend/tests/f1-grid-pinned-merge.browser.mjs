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
  for (const pinned of [undefined, 'left', 'right']) {
    test(`merged order links and physical row selection: ${width}px, ${pinned ?? 'unpinned'}`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 720 } });
      try {
        await page.route('**/__pinned-merge-test', (route) => route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}</style></head><body style="margin:0"><div id="root"></div></body></html>',
        }));
        await page.goto('http://127.0.0.1:4173/__pinned-merge-test');
        await page.evaluate(async ({ pinned }) => {
          const { default: RefreshRuntime } = await import('/@react-refresh');
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => (type) => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          const { default: React } = await import('/node_modules/.vite/deps/react.js');
          const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
          const { F1Grid } = await import('/src/shared/components/f1-grid/index.ts');
          const { createSalesOrderStatusColumns } = await import('/src/pages/sales/order/status/data/salesOrderStatusColumns.tsx');
          const rows = [2, 3].flatMap((span, group) =>
            Array.from({ length: span }, (_, index) => ({
              salesOrderId: group + 1,
              salesOrderDetailId: group * 10 + index + 1,
              orderNo: `SO-TEST-${group + 1}`,
              materialName: `Sample item ${group + 1}-${index + 1}`,
              lineNo: index + 1,
            })),
          );
          window.openedOrders = [];
          const columns = createSalesOrderStatusColumns({
            onOpenOrder: (row) => window.openedOrders.push(row.salesOrderId),
          }).filter((column) =>
            ['salesOrderDetailId', 'orderNo', 'materialName'].includes(column.field),
          ).map((column) => column.field === 'orderNo'
            ? { ...column, pinned }
            : column.field === 'materialName'
              ? { ...column, width: 1400 }
              : column);
          const root = ReactDOM.createRoot(document.getElementById('root'));
          window.setGridSelectionMode = (selectionMode) => root.render(
            React.createElement('div', { style: { width: '100%', height: 500 } },
              React.createElement(F1Grid, {
                rows,
                columns,
                rowKey: 'salesOrderDetailId',
                showCheckbox: false,
                selectionMode,
                rowHeight: 40,
              }),
            ),
          );
          window.setGridSelectionMode('row');
        }, { pinned });
        const grid = page.getByRole('grid');
        await grid.waitFor();
        const links = grid.getByRole('button', { name: /SO-TEST-.* / });
        await links.first().waitFor();

        for (const [group, rowIds] of [[1, [1, 2]], [2, [11, 12, 13]]]) {
          const link = links.nth(group - 1);
          const box = await link.boundingBox();
          assert.ok(box);
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          assert.deepEqual(await page.evaluate(() => window.openedOrders), Array.from({ length: group }, (_, i) => i + 1));

          const mergedCell = link.locator('..').locator('xpath=ancestor-or-self::*[@role="gridcell"][1]');
          const cellBox = await mergedCell.boundingBox();
          assert.ok(cellBox);
          for (let index = 0; index < rowIds.length; index += 1) {
            await page.mouse.click(cellBox.x + 3, cellBox.y + 40 * index + 8);
            assert.equal(
              await grid.locator(`[data-f1-grid-row-id="${rowIds[index]}"]`).getAttribute('aria-selected'),
              'true',
              `blank space must select physical row ${rowIds[index]}`,
            );
            assert.equal(await grid.locator('[aria-selected="true"][data-f1-grid-row-id]').count(), 1);
          }
        }

        if (pinned) {
          await grid.getByTestId('f1-grid-body-scroll').evaluate((element) => { element.scrollLeft = 200; });
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="f1-grid-body-scroll"]').scrollLeft === 200,
          );
          const link = links.first();
          const box = await link.boundingBox();
          assert.ok(box && box.x >= 0 && box.x + box.width <= width);
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          assert.deepEqual(await page.evaluate(() => window.openedOrders), [1, 2, 1]);
        }

        assert.equal(await page.evaluate(() =>
          document.documentElement.scrollWidth <= window.innerWidth,
        ), true, 'the page must not overflow horizontally');
        if (process.env.F1_GRID_SCREENSHOT_DIR) {
          await mkdir(process.env.F1_GRID_SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({
            path: path.join(process.env.F1_GRID_SCREENSHOT_DIR, `${width}-${pinned ?? 'unpinned'}.png`),
          });
        }

        await page.evaluate(() => window.setGridSelectionMode('cell'));
        await page.waitForFunction(() => !document.querySelector('[data-row-selection-overlay]'));
        const mergedCell = links.last().locator('xpath=ancestor::*[@role="gridcell"][1]');
        const cellBox = await mergedCell.boundingBox();
        assert.ok(cellBox);
        await page.mouse.move(cellBox.x + 3, cellBox.y + 8);
        await page.mouse.down();
        await page.mouse.move(cellBox.x + 3, cellBox.y + 88, { steps: 8 });
        await page.mouse.up();
        assert.ok(await grid.locator('[data-range-overlay]').count() > 0,
          'blank merged space must still support cell range dragging');
      } finally {
        await page.close();
      }
    });
  }
}
