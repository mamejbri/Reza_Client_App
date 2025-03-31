export const mockSuggestions: string[] = ['Marrakech', 'Casablanca', 'Fès', 'Agadir'];

export const getNearbySuggestions = (): string[] => {
  // Would use geolocation in real app
  return ['Autour de moi'];
};

export const getPreviousSearches = (): string[] => {
  return ['La Table du Marché', 'Nomad', 'Le Jardin'];
};
