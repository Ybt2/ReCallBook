import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import ptPT from "../locales/pt-PT.json";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en,
    "pt-PT": ptPT,
  },
});

export function mapUserLanguageToLocale(userLanguage) {
  if (userLanguage === "Portuguese") return "pt-PT";
  return "en";
}

export default i18n;
