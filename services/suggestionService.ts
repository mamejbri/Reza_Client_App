import { translate } from '../src/i18n/LocaleProvider';

export const mockCities = ['Marrakech', 'Casablanca', 'Fès', 'Agadir'];
export const mockRestaurants = ['La Table du Marché', 'Nomad', 'Le Jardin'];

export const getSuggestions = (query: string): string[] => {
  const lower = query.toLowerCase();
  const cities = mockCities.filter((c) => c.toLowerCase().includes(lower));
  const restos = mockRestaurants.filter((r) => r.toLowerCase().includes(lower));
  return [translate('search.nearby'), ...new Set([...cities, ...restos])];
};
