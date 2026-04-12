import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, NativeModules, Platform, Alert } from 'react-native';
import { translations, Language } from './translations';

const LANGUAGE_KEY = '@mobo_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored === 'ar' || stored === 'en') {
        setLanguageState(stored);
        // Ensure I18nManager matches stored language
        const shouldBeRTL = stored === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(shouldBeRTL);
        }
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);

    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);
      // Reload the app to apply RTL changes
      setTimeout(() => {
        if (__DEV__ && NativeModules.DevSettings) {
          NativeModules.DevSettings.reload();
        } else {
          // In production, show restart message
          const title = lang === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required';
          const msg = lang === 'ar'
            ? 'يرجى إعادة تشغيل التطبيق لتطبيق تغيير اتجاه التصميم.'
            : 'Please restart the app to apply the layout direction change.';
          Alert.alert(title, msg);
        }
      }, 100);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language],
  );

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
