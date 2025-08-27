import { PlaceCategory } from '@/types/places';

export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: 'restaurant',
    name: '음식점',
    icon: '🍽️',
    color: '#FF6B35',
    googleTypes: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bakery']
  },
  {
    id: 'cafe',
    name: '카페',
    icon: '☕',
    color: '#8B4513',
    googleTypes: ['cafe', 'coffee_shop']
  },
  {
    id: 'convenience_store',
    name: '편의점',
    icon: '🏪',
    color: '#4CAF50',
    googleTypes: ['convenience_store', 'supermarket', 'grocery_or_supermarket']
  },
  {
    id: 'gas_station',
    name: '주유소',
    icon: '⛽',
    color: '#FF9800',
    googleTypes: ['gas_station', 'fuel']
  },
  {
    id: 'shopping',
    name: '쇼핑',
    icon: '🛍️',
    color: '#E91E63',
    googleTypes: ['shopping_mall', 'clothing_store', 'store', 'department_store', 'shoe_store', 'electronics_store']
  },
  {
    id: 'tourist_attraction',
    name: '관광명소',
    icon: '🏛️',
    color: '#9C27B0',
    googleTypes: ['tourist_attraction', 'museum', 'art_gallery', 'amusement_park', 'zoo']
  },
  {
    id: 'park',
    name: '공원',
    icon: '🌳',
    color: '#4CAF50',
    googleTypes: ['park', 'natural_feature', 'campground']
  },
  {
    id: 'hospital',
    name: '병원',
    icon: '⚕️',
    color: '#F44336',
    googleTypes: ['hospital', 'pharmacy', 'doctor', 'dentist', 'veterinary_care']
  },
  {
    id: 'bank',
    name: '은행',
    icon: '🏦',
    color: '#2196F3',
    googleTypes: ['bank', 'atm', 'finance', 'accounting']
  },
  {
    id: 'accommodation',
    name: '숙박',
    icon: '🏨',
    color: '#607D8B',
    googleTypes: ['lodging', 'hotel', 'motel', 'rv_park']
  }
];

export const DEFAULT_CATEGORIES: string[] = [];

export const getCategoryByType = (types: string[]): PlaceCategory | undefined => {
  const priorityOrder = ['cafe', 'gas_station', 'convenience_store', 'bank', 'hospital', 'restaurant', 'shopping', 'tourist_attraction', 'park', 'accommodation'];
  
  for (const categoryId of priorityOrder) {
    const category = PLACE_CATEGORIES.find(cat => cat.id === categoryId);
    if (category && types.some(type => category.googleTypes.includes(type))) {
      return category;
    }
  }
  
  return PLACE_CATEGORIES[0];
};

export const getCategoryById = (id: string): PlaceCategory | undefined => {
  return PLACE_CATEGORIES.find(category => category.id === id);
};