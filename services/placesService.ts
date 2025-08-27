import { Place, PlaceDetails, PlacesSearchParams, PlacesResponse } from '@/types/places';
import { getCategoryByType } from '@/constants/placeCategories';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBYYmvRNzwhr7AE_ksKDNRs9IeMQeg52IM'; // app.json의 Google Maps API 키 사용

class PlacesService {
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  async searchNearbyPlaces(params: PlacesSearchParams): Promise<Place[]> {
    try {
      const { location, radius = 1500, categories = [] } = params;
      const allPlaces: Place[] = [];

      // 카테고리별로 검색 (더 정확한 결과를 위해)
      for (const categoryId of categories) {
        const categoryPlaces = await this.searchByCategory(location, radius, categoryId);
        allPlaces.push(...categoryPlaces);
      }

      // 중복 제거 (place_id 기준)
      const uniquePlaces = allPlaces.filter((place, index, self) =>
        index === self.findIndex(p => p.place_id === place.place_id)
      );

      // 거리 계산 후 정렬
      const placesWithDistance = uniquePlaces.map(place => ({
        ...place,
        distance: this.calculateDistance(
          location.lat,
          location.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        )
      }));

      return placesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      return [];
    }
  }

  private async searchByCategory(
    location: { lat: number; lng: number },
    radius: number,
    categoryId: string
  ): Promise<Place[]> {
    try {
      const typeMap: { [key: string]: string } = {
        restaurant: 'restaurant',
        cafe: 'cafe',
        convenience_store: 'convenience_store',
        gas_station: 'gas_station',
        shopping: 'shopping_mall',
        tourist_attraction: 'tourist_attraction',
        park: 'park',
        hospital: 'hospital',
        bank: 'bank',
        accommodation: 'lodging'
      };

      const type = typeMap[categoryId] || categoryId;
      const url = `${this.baseUrl}/nearbysearch/json`;
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        type: type,
        key: GOOGLE_PLACES_API_KEY,
        language: 'ko'
      });

      const response = await fetch(`${url}?${params}`);
      const data: PlacesResponse = await response.json();
      

      if (data.status === 'OK') {
        return data.results.map(place => {
          const category = getCategoryByType(place.types);
          return {
            ...place,
            category: category
          };
        });
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const url = `${this.baseUrl}/details/json`;
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        language: 'ko',
        fields: [
          'name',
          'formatted_address',
          'formatted_phone_number',
          'international_phone_number',
          'website',
          'url',
          'rating',
          'user_ratings_total',
          'reviews',
          'photos',
          'opening_hours',
          'price_level',
          'business_status',
          'types',
          'geometry'
        ].join(',')
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return {
          ...data.result,
          category: getCategoryByType(data.result.types)
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // 미터 단위로 변환
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // 텍스트 검색
  async searchPlacesByText(query: string, location?: { lat: number; lng: number }): Promise<Place[]> {
    try {
      const url = `${this.baseUrl}/textsearch/json`;
      const params = new URLSearchParams({
        query: query,
        key: GOOGLE_PLACES_API_KEY,
        language: 'ko'
      });

      if (location) {
        params.append('location', `${location.lat},${location.lng}`);
        params.append('radius', '5000');
      }

      const response = await fetch(`${url}?${params}`);
      const data: PlacesResponse = await response.json();

      if (data.status === 'OK') {
        return data.results.map(place => ({
          ...place,
          category: getCategoryByType(place.types),
          distance: location ? this.calculateDistance(
            location.lat,
            location.lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          ) : undefined
        }));
      }

      return [];
    } catch (error) {
      return [];
    }
  }
}

export const placesService = new PlacesService();
export default placesService;