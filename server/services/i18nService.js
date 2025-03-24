const i18n = require('i18n');
const path = require('path');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');

const i18nService = {
  supportedLocales: [
    'en-US', // English (United States)
    'ar-SA', // Arabic (Saudi Arabia)
    'fr-FR', // French (France)
    'es-ES', // Spanish (Spain)
    'de-DE', // German (Germany)
    'zh-CN', // Chinese (China)
    'ru-RU', // Russian (Russia)
    'pt-BR', // Portuguese (Brazil)
    'it-IT', // Italian (Italy)
    'ja-JP',  // Japanese (Japan)
    'hi-IN',  // Hindi (India)
    'ber-MA'  // Amazigh (Morocco)
  ],

  defaultLocale: 'en-US',

  initialize: async () => {
    try {
      // Initialize i18n
      i18n.configure({
        locales: this.supportedLocales,
        defaultLocale: this.defaultLocale,
        directory: path.join(__dirname, '../../locales'),
        register: global,
        autoReload: true,
        updateFiles: true,
        syncFiles: true,
        api: {
          '__': 't',
          '__n': 'tn',
          '__f': 'tf',
          '__h': 'th'
        }
      });

      // Initialize translation management
      await this.initializeTranslationManagement();

      // Initialize locale detection
      await this.initializeLocaleDetection();

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'I18N_INITIALIZATION_FAILED',
        resource: 'I18N',
        resourceId: null,
        success: false,
        ip: null,
        userAgent: null,
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  initializeTranslationManagement: async () => {
    try {
      // Create translation management configuration
      this.translationConfig = {
        providers: {
          google: {
            enabled: process.env.GOOGLE_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
          },
          microsoft: {
            enabled: process.env.MICROSOFT_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.MICROSOFT_TRANSLATE_API_KEY
          },
          aws: {
            enabled: process.env.AWS_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.AWS_TRANSLATE_API_KEY
          }
        },
        storage: {
          type: 'database',
          model: User,
          table: 'translations'
        },
        validation: {
          required: true,
          minLength: 1,
          maxLength: 1000,
          allowedChars: /^[\w\s\p{P}\p{S}]+$/u
        }
      };

      // Initialize translation providers
      await this.initializeTranslationProviders();

      return true;
    } catch (error) {
      throw error;
    }
  },

  initializeTranslationProviders: async () => {
    try {
      // Initialize Google Translate
      if (this.translationConfig.providers.google.enabled) {
        const { Translate } = require('@google-cloud/translate').v2;
        this.googleTranslate = new Translate({
          projectId: process.env.GOOGLE_PROJECT_ID,
          keyFilename: process.env.GOOGLE_CREDENTIALS_FILE
        });
      }

      // Initialize Microsoft Translator
      if (this.translationConfig.providers.microsoft.enabled) {
        const { Translator } = require('@microsoft/translator');
        this.microsoftTranslator = new Translator({
          apiKey: this.translationConfig.providers.microsoft.apiKey
        });
      }

      // Initialize AWS Translate
      if (this.translationConfig.providers.aws.enabled) {
        const { TranslateClient } = require('@aws-sdk/client-translate');
        this.awsTranslate = new TranslateClient({
          region: process.env.AWS_REGION
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  initializeLocaleDetection: async () => {
    try {
      // Create locale detection configuration
      this.localeConfig = {
        sources: [
          'query',
          'cookie',
          'header',
          'session',
          'browser'
        ],
        order: [
          'query',
          'cookie',
          'header',
          'session',
          'browser'
        ],
        fallback: this.defaultLocale,
        storage: {
          type: 'cookie',
          name: 'locale',
          maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        }
      };

      // Initialize locale detection middleware
      this.localeMiddleware = (req, res, next) => {
        try {
          // Get locale from query
          const queryLocale = req.query.locale;
          if (queryLocale && this.supportedLocales.includes(queryLocale)) {
            req.locale = queryLocale;
            return next();
          }

          // Get locale from cookie
          const cookieLocale = req.cookies.locale;
          if (cookieLocale && this.supportedLocales.includes(cookieLocale)) {
            req.locale = cookieLocale;
            return next();
          }

          // Get locale from header
          const headerLocale = req.headers['accept-language'];
          if (headerLocale) {
            const locales = headerLocale.split(',');
            for (const locale of locales) {
              const [code, quality] = locale.split(';');
              if (this.supportedLocales.includes(code.trim())) {
                req.locale = code.trim();
                return next();
              }
            }
          }

          // Get locale from session
          const sessionLocale = req.session.locale;
          if (sessionLocale && this.supportedLocales.includes(sessionLocale)) {
            req.locale = sessionLocale;
            return next();
          }

          // Get locale from browser
          const browserLocale = navigator.language || navigator.userLanguage;
          if (browserLocale) {
            const locales = browserLocale.split(',');
            for (const locale of locales) {
              const [code, quality] = locale.split(';');
              if (this.supportedLocales.includes(code.trim())) {
                req.locale = code.trim();
                return next();
              }
            }
          }

          // Fallback to default locale
          req.locale = this.defaultLocale;
          next();
        } catch (error) {
          req.locale = this.defaultLocale;
          next();
        }
      };

      return true;
    } catch (error) {
      throw error;
    }
  },

  translate: async (text, options = {}) => {
    try {
      // Get source and target languages
      const source = options.source || this.defaultLocale;
      const target = options.target || this.defaultLocale;

      // Get translation providers
      const providers = [];
      if (this.translationConfig.providers.google.enabled) {
        providers.push('google');
      }
      if (this.translationConfig.providers.microsoft.enabled) {
        providers.push('microsoft');
      }
      if (this.translationConfig.providers.aws.enabled) {
        providers.push('aws');
      }

      // Get translations from providers
      const translations = await Promise.all(
        providers.map(async (provider) => {
          try {
            switch (provider) {
              case 'google':
                return await this.translateWithGoogle(text, source, target);
              case 'microsoft':
                return await this.translateWithMicrosoft(text, source, target);
              case 'aws':
                return await this.translateWithAWS(text, source, target);
              default:
                throw new Error(`Unknown provider: ${provider}`);
            }
          } catch (error) {
            return null;
          }
        })
      );

      // Get best translation
      const bestTranslation = translations.find(t => t !== null);
      if (!bestTranslation) {
        throw new Error('No translation available');
      }

      // Validate translation
      if (!this.validateTranslation(bestTranslation)) {
        throw new Error('Invalid translation');
      }

      // Save translation
      await this.saveTranslation(text, bestTranslation, source, target);

      return bestTranslation;
    } catch (error) {
      throw error;
    }
  },

  translateWithGoogle: async (text, source, target) => {
    try {
      const [translation] = await this.googleTranslate.translate(text, source, target);
      return translation;
    } catch (error) {
      throw error;
    }
  },

  translateWithMicrosoft: async (text, source, target) => {
    try {
      const translation = await this.microsoftTranslator.translate(text, source, target);
      return translation;
    } catch (error) {
      throw error;
    }
  },

  translateWithAWS: async (text, source, target) => {
    try {
      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: source,
        TargetLanguageCode: target
      });
      const response = await this.awsTranslate.send(command);
      return response.TranslatedText;
    } catch (error) {
      throw error;
    }
  },

  validateTranslation: (translation) => {
    try {
      // Check required
      if (!translation) {
        return false;
      }

      // Check min length
      if (translation.length < this.translationConfig.validation.minLength) {
        return false;
      }

      // Check max length
      if (translation.length > this.translationConfig.validation.maxLength) {
        return false;
      }

      // Check allowed chars
      if (!this.translationConfig.validation.allowedChars.test(translation)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  saveTranslation: async (text, translation, source, target) => {
    try {
      // Create translation ID
      const translationId = crypto.randomUUID();

      // Create translation context
      const context = {
        id: translationId,
        text,
        translation,
        source,
        target,
        timestamp: new Date(),
        status: 'APPROVED'
      };

      // Save to database
      await User.createTranslation(context);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TRANSLATION_CREATED',
        resource: 'I18N',
        resourceId: translationId,
        success: true,
        ip: null,
        userAgent: null,
        metadata: {
          translation: context
        }
      });

      return translationId;
    } catch (error) {
      throw error;
    }
  },

  getTranslation: async (text, source, target) => {
    try {
      // Get translation from database
      const translation = await User.getTranslation(text, source, target);
      if (translation) {
        return translation;
      }

      // Get translation from providers
      return await this.translate(text, { source, target });
    } catch (error) {
      throw error;
    }
  },

  getLocale: (req) => {
    try {
      // Get locale from query
      const queryLocale = req.query.locale;
      if (queryLocale && this.supportedLocales.includes(queryLocale)) {
        return queryLocale;
      }

      // Get locale from cookie
      const cookieLocale = req.cookies.locale;
      if (cookieLocale && this.supportedLocales.includes(cookieLocale)) {
        return cookieLocale;
      }

      // Get locale from header
      const headerLocale = req.headers['accept-language'];
      if (headerLocale) {
        const locales = headerLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.supportedLocales.includes(code.trim())) {
            return code.trim();
          }
        }
      }

      // Get locale from session
      const sessionLocale = req.session.locale;
      if (sessionLocale && this.supportedLocales.includes(sessionLocale)) {
        return sessionLocale;
      }

      // Get locale from browser
      const browserLocale = navigator.language || navigator.userLanguage;
      if (browserLocale) {
        const locales = browserLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.supportedLocales.includes(code.trim())) {
            return code.trim();
          }
        }
      }

      // Fallback to default locale
      return this.defaultLocale;
    } catch (error) {
      return this.defaultLocale;
    }
  },

  setLocale: (req, res, locale) => {
    try {
      // Validate locale
      if (!this.supportedLocales.includes(locale)) {
        throw new Error(`Unsupported locale: ${locale}`);
      }

      // Set locale in query
      req.query.locale = locale;

      // Set locale in cookie
      res.cookie('locale', locale, {
        maxAge: this.localeConfig.storage.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Set locale in header
      res.setHeader('Content-Language', locale);

      // Set locale in session
      req.session.locale = locale;

      // Set locale in browser
      navigator.language = locale;

      return locale;
    } catch (error) {
      throw error;
    }
  },

  getSupportedLocales: () => this.supportedLocales,

  getDefaultLocale: () => this.defaultLocale,

  getLocaleMiddleware: () => this.localeMiddleware
};

module.exports = i18nService;
