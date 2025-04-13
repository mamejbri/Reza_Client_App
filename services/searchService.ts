import { API_BASE_URL } from '@env';

export const getPlacesByCity = async (city?: string, categoryName?: string) => {
    try {
        const placesRes = await fetch(`${API_BASE_URL}/places`);
        const categoriesRes = await fetch(`${API_BASE_URL}/categories`);
        const [places, categories] = await Promise.all([placesRes.json(), categoriesRes.json()]);

        let filteredPlaces = places;

        if (city) {
            filteredPlaces = filteredPlaces.filter(
                (place: any) => place.city.toLowerCase() === city.toLowerCase()
            );
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
        console.error('Error fetching places by city:', error);
        return [];
    }
};

