import StyleDictionary from 'style-dictionary';

/**
 * Builds KiND design tokens (W3C DTCG) into platform artifacts.
 * Source of truth: KiND/tokens/kind.tokens.json
 * Run: npm run build:tokens
 */
const sd = new StyleDictionary({
  source: ['KiND/tokens/*.tokens.json'],
  // DTCG files use `$value` / `$type`; opt in so the parser reads them.
  log: { verbosity: 'verbose' },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'kind',
      buildPath: 'KiND/dist/',
      files: [
        {
          destination: 'kind.tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'KiND/dist/',
      files: [
        {
          destination: 'kind.tokens.js',
          format: 'javascript/es6',
        },
        {
          destination: 'kind.tokens.json',
          format: 'json/flat',
        },
      ],
    },
  },
});

await sd.cleanAllPlatforms();
await sd.buildAllPlatforms();
