import { Request } from 'express';
import { config } from '../config';

export interface Language {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
}

export interface ErrorMessages {
  [key: string]: {
    [key: string]: string;
  };
}

export class LocalizationService {
  private static instance: LocalizationService;
  private currentLanguage: Language;
  private errorMessages: ErrorMessages;
  private onChangeCallbacks: Array<(language: Language) => void> = [];

  private constructor() {
    this.currentLanguage = this.loadLanguage();
    this.errorMessages = this.loadErrorMessages();
  }

  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  private loadLanguage(): Language {
    const savedLanguage = localStorage.getItem('language');
    const languages = config.languages;

    if (savedLanguage && languages[savedLanguage]) {
      return languages[savedLanguage];
    }

    // Fallback to browser language or default
    const browserLanguage = navigator.language.split('-')[0];
    return languages[browserLanguage] || languages[config.defaultLanguage];
  }

  private loadErrorMessages(): ErrorMessages {
    return {
      en: {
        validation: {
          required: 'This field is required',
          email: 'Please enter a valid email address',
          password: 'Password must be at least 8 characters',
          min: 'Minimum value is {min}',
          max: 'Maximum value is {max}',
          pattern: 'Invalid format',
        },
        auth: {
          loginFailed: 'Invalid credentials',
          registrationFailed: 'Registration failed',
          unauthorized: 'Unauthorized access',
          sessionExpired: 'Session expired',
          passwordReset: 'Password reset link sent',
        },
        common: {
          serverError: 'An unexpected error occurred',
          networkError: 'Network connection failed',
          timeout: 'Request timed out',
          notFound: 'Resource not found',
          forbidden: 'Access denied',
        },
      },
      ar: {
        validation: {
          required: 'هذا الحقل مطلوب',
          email: 'الرجاء إدخال عنوان بريد إلكتروني صحيح',
          password: 'يجب أن يكون كلمة المرور 8 أحرف على الأقل',
          min: 'الحد الأدنى هو {min}',
          max: 'الحد الأقصى هو {max}',
          pattern: 'تنسيق غير صحيح',
        },
        auth: {
          loginFailed: 'معلومات تسجيل الدخول غير صحيحة',
          registrationFailed: 'فشل التسجيل',
          unauthorized: 'الوصول غير مصرح به',
          sessionExpired: 'انتهت صلاحية الجلسة',
          passwordReset: 'تم إرسال رابط إعادة تعيين كلمة المرور',
        },
        common: {
          serverError: 'حدث خطأ غير متوقع',
          networkError: 'فشل اتصال الشبكة',
          timeout: 'انتهت مهلة الطلب',
          notFound: 'لم يتم العثور على المورد',
          forbidden: 'الوصول محظور',
        },
      },
    };
  }

  public getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  public getErrorMessage(
    key: string,
    category: string = 'common',
    replacements?: Record<string, string>,
  ): string {
    const baseMessage = this.errorMessages[this.currentLanguage.code][category]?.[key];

    if (!baseMessage) {
      return this.errorMessages[config.defaultLanguage][category]?.[key] || 'An error occurred';
    }

    if (replacements) {
      return Object.entries(replacements).reduce(
        (message, [key, value]) => message.replace(`{${key}}`, value),
        baseMessage,
      );
    }

    return baseMessage;
  }

  public setLanguage(languageCode: string): void {
    const languages = config.languages;
    if (languages[languageCode]) {
      this.currentLanguage = languages[languageCode];
      localStorage.setItem('language', languageCode);
      this.notifyListeners();
    }
  }

  public addChangeListener(callback: (language: Language) => void): void {
    this.onChangeCallbacks.push(callback);
  }

  private notifyListeners(): void {
    this.onChangeCallbacks.forEach((callback) => callback(this.currentLanguage));
  }

  public formatErrorMessage(
    error: Error,
    category: string = 'common',
    replacements?: Record<string, string>,
  ): string {
    if (error instanceof ValidationError) {
      return this.getErrorMessage('validation.required', 'validation');
    }

    if (error instanceof AuthenticationError) {
      return this.getErrorMessage('auth.loginFailed', 'auth');
    }

    if (error instanceof AuthorizationError) {
      return this.getErrorMessage('auth.unauthorized', 'auth');
    }

    if (error instanceof NotFoundError) {
      return this.getErrorMessage('common.notFound', 'common');
    }

    if (error instanceof BadRequestError) {
      return this.getErrorMessage('validation.invalid', 'validation');
    }

    return this.getErrorMessage('common.serverError', 'common');
  }

  public initialize(): void {
    // Set document direction
    document.documentElement.dir = this.currentLanguage.direction;

    // Add language class to body
    document.body.classList.add(`lang-${this.currentLanguage.code}`);
  }
}

export const localizationService = LocalizationService.getInstance();
