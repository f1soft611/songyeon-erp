import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            },
            {
              name: 'vendor-emotion',
              test: /[\\/]node_modules[\\/]@emotion[\\/]/,
            },
            {
              name: 'vendor-mui-icons',
              test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/,
            },
            {
              name: 'vendor-mui-x',
              test: /[\\/]node_modules[\\/]@mui[\\/]x-[^\\/]+[\\/]/,
            },
            {
              name: 'vendor-mui',
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
            },
            {
              name: 'vendor-exceljs',
              test: /[\\/]node_modules[\\/]exceljs[\\/]/,
            },
          ],
        },
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    reporters: [
      'default',
      ['json', { outputFile: '.artifacts/vitest/report.json' }],
    ],
    outputFile: '.artifacts/vitest/report.json',

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
    ],
  },
});
