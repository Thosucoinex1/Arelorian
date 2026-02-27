import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [
        react(),
        tailwindcss({
          config: {
            content: [
              './index.html',
              './{src,components,certs/UI}/**/*.{js,ts,jsx,tsx}',
            ],
            theme: {
              extend: {
                spacing: {
                  'arl-xs': 'var(--sp-xs)',
                  'arl-sm': 'var(--sp-sm)',
                  'arl-md': 'var(--sp-md)',
                  'arl-lg': 'var(--sp-lg)',
                  'arl-xl': 'var(--sp-xl)',
                  'arl-2xl': 'var(--sp-2xl)',
                },
                borderRadius: {
                  'arl-sm': 'var(--r-sm)',
                  'arl-md': 'var(--r-md)',
                  'arl-lg': 'var(--r-lg)',
                  'arl-xl': 'var(--r-xl)',
                },
                colors: {
                  'arl-void': 'var(--arl-void)',
                  'arl-deep': 'var(--arl-deep)',
                  'arl-surface': 'var(--arl-surface)',
                  'arl-elevated': 'var(--arl-elevated)',
                  'arl-panel': 'var(--arl-panel)',
                  'arl-border': 'var(--arl-border)',
                  'arl-border-glow': 'var(--arl-border-glow)',
                  'arl-gold': 'var(--arl-gold)',
                  'arl-gold-dim': 'var(--arl-gold-dim)',
                  'arl-gold-glow': 'var(--arl-gold-glow)',
                  'arl-amber': 'var(--arl-amber)',
                  'arl-amber-glow': 'var(--arl-amber-glow)',
                  'arl-arcane': 'var(--arl-arcane)',
                  'arl-arcane-mid': 'var(--arl-arcane-mid)',
                  'arl-arcane-glow': 'var(--arl-arcane-glow)',
                  'arl-teal': 'var(--arl-teal)',
                  'arl-teal-dim': 'var(--arl-teal-dim)',
                  'arl-teal-glow': 'var(--arl-teal-glow)',
                  'arl-blood': 'var(--arl-blood)',
                  'arl-blood-dim': 'var(--arl-blood-dim)',
                  'arl-sage': 'var(--arl-sage)',
                  'arl-sage-bright': 'var(--arl-sage-bright)',
                  'arl-text-primary': 'var(--arl-text-primary)',
                  'arl-text-secondary': 'var(--arl-text-secondary)',
                  'arl-text-muted': 'var(--arl-text-muted)',
                  'arl-text-code': 'var(--arl-text-code)',
                  'arl-ok': 'var(--arl-ok)',
                  'arl-warn': 'var(--arl-warn)',
                  'arl-danger': 'var(--arl-danger)',
                  'arl-ghost': 'var(--arl-ghost)',
                },
                fontFamily: {
                  display: ['var(--font-display)', 'serif'],
                  heading: ['var(--font-heading)', 'serif'],
                  body: ['var(--font-body)', 'serif'],
                  code: ['var(--font-code)', 'monospace'],
                },
                boxShadow: {
                  'arl-arcane-glow': '0 0 12px var(--arl-arcane-glow)',
                  'arl-arcane-glow-lg': '0 0 20px var(--arl-arcane-glow)',
                },
                transitionDuration: {
                  'fast': 'var(--t-fast)',
                  'mid': 'var(--t-mid)',
                  'slow': 'var(--t-slow)',
                },
              },
            },
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@services': path.resolve(__dirname, './services'),
        }
      }
    };
});
