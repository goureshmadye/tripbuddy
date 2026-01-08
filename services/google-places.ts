import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getGooglePlacesApiKey = () => {
  // For web, we might not have the API key configured
  if (Platform.OS === 'web') {
    return null;
  }
  
  // Try different ways to access the API key
  return Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
         Constants.manifest?.android?.config?.googleMaps?.apiKey ||
         process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
};

const GOOGLE_PLACES_API_KEY = getGooglePlacesApiKey();

if (!GOOGLE_PLACES_API_KEY && Platform.OS !== 'web') {
  throw new Error('Google Places API key not found in app.json android.config.googleMaps.apiKey');
}

export interface PlaceSuggestion {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export const autocompletePlaces = async (query: string): Promise<PlaceSuggestion[]> => {
  if (!query.trim() || !GOOGLE_PLACES_API_KEY) return [];

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&types=(cities)`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Autocomplete error:', data.error_message);
      return [];
    }

    return data.predictions;
  } catch (error) {
    console.error('Autocomplete fetch error:', error);
    return [];
  }
};

export const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
  if (!GOOGLE_PLACES_API_KEY) return null;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=place_id,formatted_address,geometry,address_components`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Place details error:', data.error_message);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error('Place details fetch error:', error);
    return null;
  }
};