import i18n from 'i18n';
import path from 'path';

// Configure i18n
i18n.configure({
  locales: ['en', 'ar', 'fr', 'es'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'),
  register: global,
  autoReload: process.env.NODE_ENV === 'development',
  api: {
    __: 't',
    __n: 'tn',
  },
  syncFiles: true,
  updateFiles: process.env.NODE_ENV === 'development',
});

// Initialize i18n
i18n.init();

export default i18n;
