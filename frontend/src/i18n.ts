import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 한국어
import koCommon from './locales/ko/common.json';
import koMenu from './locales/ko/menu.json';
import koDashboard from './locales/ko/dashboard.json';
import koOperations from './locales/ko/operations.json';
import koTrading from './locales/ko/trading.json';
import koAccounting from './locales/ko/accounting.json';
import koAnalytics from './locales/ko/analytics.json';

// 영어
import enCommon from './locales/en/common.json';
import enMenu from './locales/en/menu.json';
import enDashboard from './locales/en/dashboard.json';
import enOperations from './locales/en/operations.json';
import enTrading from './locales/en/trading.json';
import enAccounting from './locales/en/accounting.json';
import enAnalytics from './locales/en/analytics.json';

// 베트남어
import viCommon from './locales/vi/common.json';
import viMenu from './locales/vi/menu.json';
import viDashboard from './locales/vi/dashboard.json';
import viOperations from './locales/vi/operations.json';
import viTrading from './locales/vi/trading.json';
import viAccounting from './locales/vi/accounting.json';
import viAnalytics from './locales/vi/analytics.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: {
        common: koCommon,
        menu: koMenu,
        dashboard: koDashboard,
        operations: koOperations,
        trading: koTrading,
        accounting: koAccounting,
        analytics: koAnalytics,
      },
      en: {
        common: enCommon,
        menu: enMenu,
        dashboard: enDashboard,
        operations: enOperations,
        trading: enTrading,
        accounting: enAccounting,
        analytics: enAnalytics,
      },
      vi: {
        common: viCommon,
        menu: viMenu,
        dashboard: viDashboard,
        operations: viOperations,
        trading: viTrading,
        accounting: viAccounting,
        analytics: viAnalytics,
      },
    },
    fallbackLng: 'ko',
    defaultNS: 'common',
    ns: ['common', 'menu', 'dashboard', 'operations', 'trading', 'accounting', 'analytics'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
