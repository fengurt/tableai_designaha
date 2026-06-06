/**
 * KiND Tailwind preset — derived from KiND/tokens/kind.tokens.json.
 *
 * Raw palette tokens map to literal hex. Semantic tokens map to CSS
 * variables (defined in kind.css), so utilities like `bg-bg`, `text-text`,
 * and `border-border` follow the active [data-theme] automatically.
 *
 * Usage (tailwind.config.js):
 *   import kind from './KiND/tailwind.preset.js';
 *   export default { presets: [kind], content: [...] };
 * Also link KiND/kind.css (or KiND/dist/kind.tokens.css) so the CSS vars exist.
 */
export default {
  theme: {
    extend: {
      colors: {
        // raw palette
        ink: '#052E28', forest: '#063B33', pine: '#0A5D50', teal: '#0E8C7B',
        jade: '#13A98C', mint: '#2FD0B2', seafoam: '#7FE3CE',
        coral: { DEFAULT: '#E8765A', deep: '#993C1D', tint: '#FAECE7' },
        paper: '#F8FBF9', mist: { DEFAULT: '#E7F4F1', 2: '#D7ECE6' },
        cloud: '#EEF3F1', muted: { DEFAULT: '#52746C', 2: '#6E8C84' },
        'on-ink': { DEFAULT: '#EAF6F2', mut: '#9FC6BC' },
        // semantic (theme-aware via CSS vars from kind.css)
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
        border: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        accent: { DEFAULT: 'var(--accent)', bright: 'var(--accent-bright)' },
      },
      fontFamily: {
        serif: ['Fraunces', 'Noto Serif SC', 'Georgia', 'serif'],
        sans: ['Hanken Grotesk', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        mega: 'clamp(64px,13vw,200px)',
        display: 'clamp(46px,8vw,104px)',
        h1: 'clamp(38px,5.4vw,76px)',
        h2: 'clamp(30px,4vw,52px)',
        h3: 'clamp(22px,2.4vw,30px)',
        h4: '20px',
        lead: 'clamp(18px,1.7vw,22px)',
        body: '17px', sm: '15px', xs: '13px',
        eyebrow: ['12px', { letterSpacing: '0.24em' }],
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px',
        6: '32px', 7: '48px', 8: '64px', 9: '96px', 10: '128px',
        section: 'clamp(72px,11vw,148px)',
      },
      maxWidth: { wrap: '1200px', 'wrap-wide': '1440px' },
      borderRadius: {
        sm: '8px', md: '14px', lg: '20px', xl: '28px', '2xl': '40px', pill: '999px',
      },
      boxShadow: {
        1: '0 1px 2px rgba(6,59,51,.06)',
        2: '0 10px 30px -18px rgba(6,59,51,.30)',
        3: '0 26px 60px -34px rgba(6,59,51,.45)',
        4: '0 40px 90px -50px rgba(6,59,51,.55)',
      },
      transitionTimingFunction: {
        kind: 'cubic-bezier(.2,.7,.2,1)',
        'kind-out': 'cubic-bezier(.16,1,.3,1)',
      },
    },
  },
};
