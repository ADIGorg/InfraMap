import type { Config } from 'tailwindcss';
import tokens from './src/shared/theme/design-tokens.json';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: tokens.color.brand.primary.$value,
          dark: tokens.color.brand['primary-dark'].$value,
          secondary: tokens.color.brand.secondary.$value,
          accent: tokens.color.brand.accent.$value,
        },
        surface: {
          page: tokens.color.surface.page.$value,
          card: tokens.color.surface.card.$value,
          input: tokens.color.surface.input.$value,
          info: tokens.color.surface['notice-info'].$value,
        },
        ink: {
          primary: tokens.color.text.primary.$value,
          secondary: tokens.color.text.secondary.$value,
          inverse: tokens.color.text.inverse.$value,
        },
        line: {
          DEFAULT: tokens.color.border.default.$value,
          subtle: tokens.color.border.subtle.$value,
        },
        status: {
          received: tokens.color.status.received.$value,
          analysis: tokens.color.status['under-analysis'].$value,
          confirmed: tokens.color.status.confirmed.$value,
          service: tokens.color.status['in-service'].$value,
          resolved: tokens.color.status.resolved.$value,
          rejected: tokens.color.status.rejected.$value,
        },
      },
      fontFamily: { sans: ['Inter', 'Arial', 'sans-serif'] },
      boxShadow: { card: '0 4px 15px rgba(28, 40, 51, 0.06)' },
    },
  },
  plugins: [],
};

export default config;
