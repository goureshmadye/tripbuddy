import { Colors, FontSizes, FontWeights } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Web fallback - since react-native-maps doesn't support web
// We'll render a placeholder with a link to open in Google Maps

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapViewComponentProps {
  mapRef?: React.RefObject<any>;
  initialRegion: Region;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  customMapStyle?: object[];
  onMapReady?: () => void;
  children?: React.ReactNode;
  style?: object;
}

export function MapViewComponent({
  initialRegion,
  onMapReady,
  style,
}: MapViewComponentProps) {
  React.useEffect(() => {
    // Call onMapReady when component mounts
    onMapReady?.();
  }, [onMapReady]);

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/@${initialRegion.latitude},${initialRegion.longitude},14z`;
    window.open(url, '_blank');
  };

  return (
    <View style={[styles.container, style]}>
      {/* Map placeholder with embedded iframe for web */}
      <iframe
        src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d${initialRegion.latitudeDelta * 111000}!2d${initialRegion.longitude}!3d${initialRegion.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      
      <TouchableOpacity style={styles.openButton} onPress={openGoogleMaps}>
        <Ionicons name="open-outline" size={16} color="#FFFFFF" />
        <Text style={styles.openButtonText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

// Marker stub for web - renders nothing but accepts children
export function Marker({ children }: { children?: React.ReactNode; [key: string]: any }) {
  return null;
}

// Polyline stub for web
export function Polyline(_props: any) {
  return null;
}

export type { Region };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  openButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
});
