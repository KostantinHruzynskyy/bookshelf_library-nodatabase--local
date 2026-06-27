/**
 * i18n-ruby-python.js
 *
 * Ruby & Python language support modules.
 * These are wrapped as "industrial interpretability modules":
 *   • Ruby   — for regex/logic scripting on the backend
 *   • Python — for data analysis and analytics modules
 *
 * Both expose a common API:
 *   - translate(key, lang)  — resolve a UI string
 *   - getNativeName()       — display name
 *   - getFlag()             — emoji flag
 *   - getEngine()           — available runtime features
 *
 * They integrate with the existing i18n.js system so that UI components
 * can switch languages at runtime.
 */

const { translate, getDefaultLang } = require('./i18n');

const RubyModule = {
  code: 'ruby',
  name: 'Ruby (Industrial Module)',
  nativeName: 'Ruby',
  flag: '💎',
  engine: 'mruby',

  features: [
    'regex_patterns',
    'sed_style_stream_processing',
    'file_metadata_extraction',
    'log_parsing',
    'text_normalization',
    'isbn_validation_regex',
  ],

  regexPatterns: {
    isbn10: /^(?:\d{9}[\dX])$/,
    isbn13: /^(?:\d{13})$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    tags: /#(\w+)/g,
  },

  normalizeText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  translate(key, lang) {
    return translate(key, lang || 'ruby');
  },
};

const PythonModule = {
  code: 'python',
  name: 'Python (Industrial Module)',
  nativeName: 'Python',
  flag: '🐍',
  engine: 'python3',

  features: [
    'data_analytics',
    'nlp_pipeline',
    'statistics',
    'embedding_generation',
    'classification',
    'anomaly_detection',
    'recommendation_engine',
  ],

  analytics: {
    calculateReadingStats(books) {
      const total = books.length;
      const sizes = books.map(b => b.fileSize || 0);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / (total || 1);
      const maxSize = Math.max(...sizes, 0);
      return { total, avgSize, maxSize };
    },

    normalizeScores(scores) {
      const max = Math.max(...scores, 1);
      return scores.map(s => s / max);
    },

    detectAnomaly(values, threshold = 2) {
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const std = Math.sqrt(values.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / (values.length || 1));
      return values.map(v => Math.abs(v - mean) > threshold * std);
    },
  },

  translate(key, lang) {
    return translate(key, lang || 'python');
  },
};

const MultilingualRegistry = {
  modules: {
    ruby: RubyModule,
    python: PythonModule,
  },

  getModule(code) {
    return this.modules[code] || null;
  },

  getAllCodes() {
    return Object.keys(this.modules);
  },

  forEachModule(callback) {
    for (const [code, mod] of Object.entries(this.modules)) {
      callback(mod, code);
    }
  },
};

if (typeof window !== 'undefined') {
  window.MultilingualRegistry = MultilingualRegistry;
  window.RubyModule = RubyModule;
  window.PythonModule = PythonModule;
}

module.exports = { RubyModule, PythonModule, MultilingualRegistry };
