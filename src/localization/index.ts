import bg from './bg';
import en from './en';

export type Language = 'bg' | 'en';
export type Translations = typeof bg;

const translations = {
  bg,
  en,
};

let currentLanguage: Language = 'bg'; // Default to Bulgarian

export const setLanguage = (language: Language): void => {
  currentLanguage = language;
};

export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: keyof Translations): string => {
  const translation = translations[currentLanguage];
  return translation[key] || key;
};

// Helper function to get nested translations
export const getNestedTranslation = (
  category: keyof Translations,
  key: string
): string => {
  const translation = translations[currentLanguage];
  const categoryTranslation = translation[category];
  
  if (typeof categoryTranslation === 'object' && categoryTranslation !== null) {
    return (categoryTranslation as any)[key] || key;
  }
  
  return key;
};

// Helper function for template variables replacement
export const formatMessage = (
  template: string,
  variables: Record<string, string>
): string => {
  let formatted = template;
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return formatted;
};

export { bg, en };
export default translations;

