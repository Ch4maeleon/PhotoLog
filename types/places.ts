export interface PlaceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  googleTypes: string[];
}

export interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  permanently_closed?: boolean;
  category?: PlaceCategory;
  distance?: number;
}

export interface PlaceDetails extends Place {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  reviews?: {
    author_name: string;
    author_url?: string;
    language: string;
    profile_photo_url?: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
  }[];
}

export interface PlacesSearchParams {
  location: {
    lat: number;
    lng: number;
  };
  radius?: number;
  type?: string;
  keyword?: string;
  categories?: string[];
}

export interface PlacesResponse {
  results: Place[];
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST';
  next_page_token?: string;
}

export interface SearchOptions {
  maxResults?: number;
  pageToken?: string;
}