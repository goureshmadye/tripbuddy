import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getGoogleMapsApiKey = () => {
  // For web, we might not have the API key configured
  if (Platform.OS === 'web') {
    return null;
  }
  
  // Try different ways to access the API key
  return Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
         Constants.manifest?.android?.config?.googleMaps?.apiKey;
};

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

/**
 * Decodes an encoded polyline string into an array of coordinates
 * Source: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  if (!encoded) {
      return [];
  }
  
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
      let b, shift = 0, result = 0;
      do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      const p = {
          latitude: lat / 1e5,
          longitude: lng / 1e5,
      };
      poly.push(p);
  }
  return poly;
};

export interface RouteRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  waypoints?: { latitude: number; longitude: number }[];
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}

export const getDirections = async ({ origin, destination, waypoints = [], mode = 'driving' }: RouteRequest) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not found');
    return [];
  }

  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;
  
  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
  
  if (waypoints.length > 0) {
    const waypointsStr = waypoints
      .map(wp => `${wp.latitude},${wp.longitude}`)
      .join('|');
    url += `&waypoints=optimize:true|${waypointsStr}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      return decodePolyline(data.routes[0].overview_polyline.points);
    } else {
      console.error('Directions API error:', data.status, data.error_message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching directions:', error);
    return [];
  }
};
