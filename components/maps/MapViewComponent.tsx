import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { MapStyleElement, Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';

interface MapViewComponentProps {
  mapRef?: React.RefObject<any>;
  initialRegion: Region;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  customMapStyle?: MapStyleElement[];
  onMapReady?: () => void;
  children?: React.ReactNode;
  style?: object;
}

export function MapViewComponent({
  mapRef,
  initialRegion,
  region,
  onRegionChangeComplete,
  showsUserLocation = true,
  showsMyLocationButton = false,
  showsCompass = true,
  showsScale = true,
  customMapStyle,
  onMapReady,
  children,
  style,
}: MapViewComponentProps) {
  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
      showsCompass={showsCompass}
      showsScale={showsScale}
      customMapStyle={customMapStyle}
      onMapReady={onMapReady}
    >
      {children}
    </MapView>
  );
}

export { Marker, Polyline };

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
