import pt from '../locales/pt.json';

// TODO: Integrar uma biblioteca de i18n como next-intl quando 
// precisarmos dar suporte a multiplos idiomas através da URL (/pt, /en).
// Por enquanto, isso atende ao requisito de manter todo o texto isolado.

export const dictionaries = {
  pt,
};

export function getDictionary(locale: keyof typeof dictionaries = 'pt') {
  return dictionaries[locale];
}
