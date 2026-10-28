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
  test(`keeps pinned scroll alignment at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    try {
      await page.route('**/__f1-grid-smooth-scroll-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;width:100%;min-height:100%}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
        }),
      );
      await page.goto('http://127.0.0.1:4173/__f1-grid-smooth-scroll-test');
      await page.evaluate(async () => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const { default: React } = await import(
          '/node_modules/.vite/deps/react.js'
        );
        const { default: ReactDOM } = await import(
          '/node_modules/.vite/deps/react-dom_client.js'
        );
        const { F1Grid } = await import('/src/shared/components/f1-grid/index.ts');
        const rows = Array.from({ length: 60 }, (_, rowIndex) => {
          const row = { id: `row-${rowIndex}` };
          for (let columnIndex = 0; columnIndex < 24; columnIndex += 1) {
            row[`field${columnIndex}`] = `Value ${columnIndex}`;
          }
          return row;
        });
        const columns = Array.from({ length: 24 }, (_, index) => ({
          field: `field${index}`,
          headerName: `Column ${index}`,
          width: 160,
          pinned: index === 0 ? 'left' : index === 23 ? 'right' : undefined,
        }));
        window.gridCommitCount = 0;
        const grid = React.createElement(
          React.Profiler,
          {
            id: 'smooth-scroll-grid',
            onRender: () => {
              window.gridCommitCount += 1;
            },
          },
          React.createElement(F1Grid, {
            rows,
            columns,
            rowKey: 'id',
            showCheckbox: false,
            height: 480,
            virtualizeColumns: true,
            columnOverscan: 1,
          }),
        );
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(
            'div',
            { style: { width: '100%', height: 520 } },
            grid,
          ),
        );
      });

      const grid = page.getByRole('grid');
      await grid.waitFor();
      const bodyScroll = page.getByTestId('f1-grid-body-scroll');
      await page.waitForFunction(() => window.gridCommitCount > 0);

      const pinnedLeft = grid.getByRole('columnheader', { name: 'Column 0' });
      const pinnedRight = grid.getByRole('columnheader', { name: 'Column 23' });
      const leftInitial = await pinnedLeft.boundingBox();
      const rightInitial = await pinnedRight.boundingBox();
      assert.ok(leftInitial && rightInitial);

      await bodyScroll.evaluate((element) => {
        element.scrollLeft = 600;
      });
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-testid="f1-grid-body-scroll"]');
        const header = document.querySelector('[role="grid"]')?.firstElementChild;
        return body && header && Math.abs(body.scrollLeft - header.scrollLeft) < 1;
      });
      await grid.getByRole('columnheader', { name: 'Column 5' }).waitFor();

      const headerColumn = await grid
        .getByRole('columnheader', { name: 'Column 5' })
        .boundingBox();
      const bodyCell = await grid
        .locator('[data-f1-grid-row-id="row-0"] [role="gridcell"]')
        .filter({ hasText: 'Value 5' })
        .first()
        .boundingBox();
      assert.ok(headerColumn && bodyCell);
      assert.ok(
        Math.abs(headerColumn.x - bodyCell.x) <= 1,
        `header/body column x offset differs by ${headerColumn.x - bodyCell.x}px`,
      );

      await bodyScroll.evaluate((element) => {
        element.scrollLeft = element.scrollWidth - element.clientWidth;
      });
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-testid="f1-grid-body-scroll"]');
        const header = document.querySelector('[role="grid"]')?.firstElementChild;
        return body && header && Math.abs(body.scrollLeft - header.scrollLeft) < 1;
      });

      const leftFinal = await pinnedLeft.boundingBox();
      const rightFinal = await pinnedRight.boundingBox();
      assert.ok(leftFinal && rightFinal);
      assert.ok(Math.abs(leftInitial.x - leftFinal.x) <= 1);
      assert.ok(Math.abs(rightInitial.x - rightFinal.x) <= 1);
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
          'f1grid-smooth-pinned-scroll',
          'screenshots',
        );
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, `pinned-scroll-${width}.png`),
      });
    } finally {
      await page.close();
    }
  });
}
