// The languages of videos: their flag, canonical code (several codes name one
// language) and name.
export const LANG_FLAG = {
  en: '🇬🇧', eng: '🇬🇧', 'en-US': '🇬🇧', 'en-GB': '🇬🇧',
  it: '🇮🇹', ita: '🇮🇹', IT: '🇮🇹',
  pt: '🇵🇹', 'pt-BR': '🇵🇹', 'pt-PT': '🇵🇹',
  de: '🇩🇪',
  es: '🇪🇸', 'es-419': '🇪🇸',
  fr: '🇫🇷',
  hi: '🇮🇳',
  pl: '🇵🇱',
  ja: '🇯🇵', jp: '🇯🇵',
}
export const LANG_CANONICAL = {
  en: 'en', eng: 'en', 'en-US': 'en', 'en-GB': 'en',
  it: 'it', ita: 'it', IT: 'it',
  pt: 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
  de: 'de',
  es: 'es', 'es-419': 'es',
  fr: 'fr',
  hi: 'hi',
  pl: 'pl',
  ja: 'ja', jp: 'ja',
}
// Whether a language (any of its codes) is among those picked; none picked: all
export const languageAllowed = (picked, code) => picked.size === 0 || picked.has(LANG_CANONICAL[code] ?? code)
export const LANG_NAME = {
  en: 'English',
  it: 'Italian',
  pt: 'Portuguese',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  pl: 'Polish',
  ja: 'Japanese',
}
