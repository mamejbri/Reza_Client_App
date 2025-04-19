import { API_BASE_URL } from '@env';

export const getPlacesByQuery = async (query?: string, categoryName?: string) => {
    try {
        const placesRes = await fetch(`${API_BASE_URL}/places`);
        const categoriesRes = await fetch(`${API_BASE_URL}/categories`);
        const [places, categories] = await Promise.all([placesRes.json(), categoriesRes.json()]);

        let filteredPlaces = places;

        if (query?.trim()) {
            const queryLower = query.toLowerCase().trim();

            filteredPlaces = filteredPlaces.filter((place: any) => {
                const cityMatch = place.city.toLowerCase() === queryLower;

                const fullNameMatch = place.name.toLowerCase() === queryLower;

                const nameWords = place.name.toLowerCase().split(/\s+/);
                const nameWordMatch = nameWords.some(word =>
                    word === queryLower || (word.startsWith(queryLower) && queryLower.length >= 4)
                );

                return cityMatch || fullNameMatch || nameWordMatch;
            });
        }

        if (categoryName) {
            const matchingCategory = categories.find(
                (cat: any) => cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (matchingCategory) {
                filteredPlaces = filteredPlaces.filter(
                    (place: any) => place.category_id === matchingCategory.id
                );
            }
        }

        return filteredPlaces;
    } catch (error) {
        console.error('Error fetching places by query:', error);
        return [];
    }
};

