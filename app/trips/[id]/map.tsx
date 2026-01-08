import { MapViewComponent, Marker, Polyline } from '@/components/maps';
import { ScreenContainer, useScreenPadding } from '@/components/screen-container';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOffline } from '@/hooks/use-offline';
import { useTrip, useTripItinerary } from '@/hooks/use-trips';
import { getDirections } from '@/services/directions';
import { ItineraryItem } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Region type definition for cross-platform compatibility
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const { width, height } = Dimensions.get('window');

// Responsive sizing
const isSmallScreen = width < 375;
const BUTTON_SIZE = isSmallScreen ? 40 : 44;
const MARKER_SIZE = isSmallScreen ? 32 : 38;
const BOTTOM_SHEET_HEIGHT = height * 0.42;

const CATEGORY_COLORS: Record<string, string> = {
  activity: '#8B5CF6',
  food: '#F97316',
  transport: Colors.primary,
  accommodation: Colors.secondary,
  sightseeing: Colors.accent,
  other: '#64748B',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  activity: 'bicycle',
  food: 'restaurant',
  transport: 'car',
  accommodation: 'bed',
  sightseeing: 'camera',
  other: 'location',
};

// Initial region centered on Paris
const INITIAL_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { topMargin, bottom } = useScreenPadding();
  const mapRef = useRef<any>(null);

  const { trip } = useTrip(id);
  const { items, loading, error } = useTripItinerary(id);
  const { isOnline, downloadMapRegion, getCachedMapRegions } = useOffline();
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [isMapSaved, setIsMapSaved] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Check if map region is already saved for this trip
  useEffect(() => {
    const checkSavedMaps = async () => {
      if (id) {
        const savedRegions = await getCachedMapRegions(id);
        setIsMapSaved(savedRegions.length > 0);
      }
    };
    checkSavedMaps();
  }, [id, getCachedMapRegions]);

  // Save map for offline use
  const handleSaveMapForOffline = async () => {
    if (!trip || !region) return;
    
    setSavingMap(true);
    try {
      const result = await downloadMapRegion({
        id: `${id}_${Date.now()}`,
        tripId: id || '',
        name: trip.title || 'Trip Map',
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
        zoomLevel: Math.round(Math.log2(360 / region.longitudeDelta)),
        tileCount: 0,
        sizeInMB: 0,
      });
      
      if (result) {
        setIsMapSaved(true);
        Alert.alert('Map Saved', 'This map region is now available offline.');
      } else {
        Alert.alert('Error', 'Failed to save map for offline use.');
      }
    } catch (error) {
      console.error('Error saving map:', error);
      Alert.alert('Error', 'Failed to save map for offline use.');
    } finally {
      setSavingMap(false);
    }
  };
  
  // Animation values
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const selectedCardAnim = useRef(new Animated.Value(0)).current;
  
  // Animate bottom sheet on mount
  useEffect(() => {
    Animated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [bottomSheetAnim]);
  
  // Animate selected card when item changes
  useEffect(() => {
    if (selectedItem) {
      selectedCardAnim.setValue(0);
      Animated.spring(selectedCardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }, [selectedCardAnim, selectedItem]);
  
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  
  // Update region when trip destination is loaded
  useEffect(() => {
    if (trip?.destinationLat != null && trip?.destinationLng != null) {
      const destinationRegion = {
        latitude: trip.destinationLat,
        longitude: trip.destinationLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(destinationRegion);
      mapRef.current?.animateToRegion(destinationRegion, 500);
    }
  }, [trip?.destinationLat, trip?.destinationLng]);

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  // Group items by day
  const days = [...new Set(items.map(item => 
    item.startTime ? new Date(item.startTime).toDateString() : null
  ).filter(Boolean))].sort((a, b) => 
    new Date(a!).getTime() - new Date(b!).getTime()
  );

  const filteredItems = selectedDay !== null 
    ? items.filter(item => 
        item.startTime && new Date(item.startTime).toDateString() === days[selectedDay]
      )
    : items;

  const getCategoryColor = (category?: string | null) => {
    return CATEGORY_COLORS[category || 'other'] || CATEGORY_COLORS.other;
  };

  const getCategoryIcon = (category?: string | null): keyof typeof Ionicons.glyphMap => {
    return CATEGORY_ICONS[category || 'other'] || CATEGORY_ICONS.other;
  };

  // Calculate straight-line coordinates (fallback)
  const straightLineCoordinates = filteredItems
    .filter(item => item.latitude && item.longitude)
    .map(item => ({
      latitude: item.latitude!,
      longitude: item.longitude!,
    }));

  // Fit map to show all markers
  const fitToMarkers = () => {
    if (mapRef.current && filteredItems.length > 0) {
      const coordinates = filteredItems
        .filter(item => item.latitude && item.longitude)
        .map(item => ({
          latitude: item.latitude!,
          longitude: item.longitude!,
        }));
      
      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    }
  };

  // Center on user location
  const centerOnUser = async () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }
    }
  };

  // Animate to selected marker
  const selectAndFocusItem = (item: ItineraryItem) => {
    setSelectedItem(item);
    if (item.latitude && item.longitude) {
      mapRef.current?.animateToRegion({
        latitude: item.latitude,
        longitude: item.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleOptimizeRoute = async () => {
    const validPoints = filteredItems.filter(item => item.latitude && item.longitude);
    
    if (validPoints.length < 2) {
      Alert.alert('Route Optimization', 'Need at least 2 locations to show a route.');
      return;
    }
    
    setCalculatingRoute(true);
    try {
      const origin = validPoints[0];
      const destination = validPoints[validPoints.length - 1];
      const waypoints = validPoints.slice(1, -1);
      
      const points = await getDirections({
        origin: { latitude: origin.latitude!, longitude: origin.longitude! },
        destination: { latitude: destination.latitude!, longitude: destination.longitude! },
        waypoints: waypoints.map(wp => ({ latitude: wp.latitude!, longitude: wp.longitude! })),
        mode: 'driving'
      });
      
      if (points.length > 0) {
        setRoutePoints(points);
        setShowRoute(true);
        
        // Fit map to route
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
        
        Alert.alert('Route Calculated', 'Showing the driving route between your locations.');
      } else {
        // Fallback to straight lines if API fails
        setRoutePoints(straightLineCoordinates);
        setShowRoute(true);
        fitToMarkers();
        Alert.alert('Route Info', 'Could not fetch exact roads. Showing straight lines instead.');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'Failed to calculate route.');
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleGetDirections = () => {
    if (!selectedItem?.latitude || !selectedItem?.longitude) {
      Alert.alert('No Location Selected', 'Please select a location to get directions.');
      return;
    }

    // Open in native maps app
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${selectedItem.latitude},${selectedItem.longitude}`;
    const label = selectedItem.title;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });

    Linking.openURL(url as string);
  };

  return (
    <ScreenContainer 
      style={{ ...styles.container, backgroundColor: colors.background }}
      withTopPadding={false}
      edges={['left', 'right', 'bottom']}
    >
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          mapRef={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          customMapStyle={undefined}
          onMapReady={fitToMarkers}
        >
          {/* Markers for each itinerary item */}
          {filteredItems.map((item, index) => {
            if (item.latitude == null || item.longitude == null) {
              return null;
            }
            return (
              <Marker
                key={item.id}
                coordinate={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                }}
                title={item.title}
                description={item.location || ''}
                onPress={() => setSelectedItem(item)}
              >
                <View style={[
                  styles.markerContainer,
                  selectedItem?.id === item.id && styles.selectedMarker,
                ]}>
                  <View style={[
                    styles.marker,
                    { backgroundColor: getCategoryColor(item.category) },
                  ]}>
                    <Text style={styles.markerNumber}>{index + 1}</Text>
                  </View>
                  <View style={[
                    styles.markerArrow,
                    { borderTopColor: getCategoryColor(item.category) },
                  ]} />
                </View>
              </Marker>
            );
          })}

          {/* Route polyline */}
          {showRoute && routePoints.length > 1 && (
            <Polyline
              coordinates={routePoints}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          )}
        </MapViewComponent>

        {/* Loading Route Overlay */}
        {calculatingRoute && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Calculating route...</Text>
          </View>
        )}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading itinerary...</Text>
          </View>
        )}

        {/* Error Overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <EmptyState
              icon="alert-circle-outline"
              title="Unable to load itinerary"
              description={error.message || "There was an error loading map markers."}
            />
          </View>
        )}

        {/* Map Header Overlay */}
        <View style={[styles.mapHeader, { top: topMargin }]}>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          {showSearch ? (
            <View style={[styles.searchContainer, { backgroundColor: colors.card }, Shadows.sm]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search places..."
                placeholderTextColor={colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            >
              <Ionicons name="search" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.md]}
            onPress={() => {
              const newDelta = Math.max(region.latitudeDelta * 0.5, 0.002);
              mapRef.current?.animateToRegion({
                ...region,
                latitudeDelta: newDelta,
                longitudeDelta: newDelta,
              }, 300);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.md]}
            onPress={() => {
              const newDelta = Math.min(region.latitudeDelta * 2, 10);
              mapRef.current?.animateToRegion({
                ...region,
                latitudeDelta: newDelta,
                longitudeDelta: newDelta,
              }, 300);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.controlDivider} />
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.md]}
            onPress={centerOnUser}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.md]}
            onPress={fitToMarkers}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {/* Offline Map Save Button */}
          {isOnline && (
            <TouchableOpacity
              style={[
                styles.mapButton, 
                { 
                  backgroundColor: isMapSaved ? Colors.success + '15' : colors.card,
                  borderWidth: isMapSaved ? 1 : 0,
                  borderColor: Colors.success,
                },
                Shadows.md
              ]}
              onPress={handleSaveMapForOffline}
              activeOpacity={0.7}
              disabled={savingMap}
            >
              {savingMap ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons 
                  name={isMapSaved ? 'cloud-done' : 'cloud-download-outline'} 
                  size={20} 
                  color={isMapSaved ? Colors.success : colors.text} 
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet, 
          { backgroundColor: colors.card },
          // Shadows removed as per request
          {
            transform: [{
              translateY: bottomSheetAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [BOTTOM_SHEET_HEIGHT, 0],
              }),
            }],
          },
          { paddingBottom: Math.max(bottom, Spacing.sm) }
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
        </View>
        
        {/* Day Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dayFilter}
          contentContainerStyle={styles.dayFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.dayChip,
              selectedDay === null && { backgroundColor: Colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => { setSelectedDay(null); setTimeout(fitToMarkers, 100); }}
          >
            <Text style={[
              styles.dayChipText,
              { color: selectedDay === null ? '#FFFFFF' : colors.text },
            ]}>All Days</Text>
          </TouchableOpacity>
          {days.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayChip,
                selectedDay === index && styles.dayChipActive,
                { borderColor: selectedDay === index ? Colors.primary : colors.border },
              ]}
              onPress={() => { setSelectedDay(index); setTimeout(fitToMarkers, 100); }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayChipText,
                { color: selectedDay === index ? '#FFFFFF' : colors.text },
              ]}>Day {index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              showRoute ? styles.actionButtonActive : { backgroundColor: Colors.primary + '12' },
            ]}
            onPress={handleOptimizeRoute}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={showRoute ? "checkmark-circle" : "git-branch-outline"}
              size={18} 
              color={showRoute ? '#FFFFFF' : Colors.primary} 
            />
            <Text style={[
              styles.actionText, 
              { color: showRoute ? '#FFFFFF' : Colors.primary },
            ]}>
              {showRoute ? 'Route Shown' : 'Show Route'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.secondary + '12' }]}
            onPress={handleGetDirections}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-outline" size={18} color={Colors.secondary} />
            <Text style={[styles.actionText, { color: Colors.secondary }]}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Item Card */}
        {selectedItem && (
          <Animated.View 
            style={[
              styles.selectedCard, 
              { backgroundColor: colors.background, borderColor: Colors.primary + '40' },
              {
                opacity: selectedCardAnim,
                transform: [{
                  scale: selectedCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                }],
              },
            ]}
          >
            <View style={[styles.cardIcon, { backgroundColor: getCategoryColor(selectedItem.category) + '15' }]}>
              <Ionicons 
                name={getCategoryIcon(selectedItem.category)} 
                size={22} 
                color={getCategoryColor(selectedItem.category)} 
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{selectedItem.title}</Text>
              <Text style={[styles.cardLocation, { color: colors.textSecondary }]} numberOfLines={1}>{selectedItem.location}</Text>
            </View>
            <TouchableOpacity
              style={styles.cardAction}
              onPress={() => router.push(`/trips/${id}/itinerary/${selectedItem.id}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Places List */}
        <View style={styles.placesListContainer}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
              {filteredItems.length} {filteredItems.length === 1 ? 'Place' : 'Places'}
            </Text>
            {selectedItem && (
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Text style={[styles.clearSelection, { color: Colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView 
            style={styles.placesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.placesListContent}
          >
            {filteredItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.placeItem,
                  { 
                    backgroundColor: selectedItem?.id === item.id ? Colors.primary + '08' : 'transparent',
                    borderColor: selectedItem?.id === item.id ? Colors.primary + '30' : colors.borderLight,
                  },
                ]}
                onPress={() => selectAndFocusItem(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.placeNumber, { backgroundColor: getCategoryColor(item.category) }]}>
                  <Text style={styles.placeNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.placeContent}>
                  <Text style={[styles.placeTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.placeLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
                <View style={[styles.placeArrow, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.listFooter} />
          </ScrollView>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mapHeader: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerPlaceholder: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  mapButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    height: BUTTON_SIZE,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.md,
    top: '20%',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    ...Shadows.md,
  },
  controlDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: Spacing.xs / 2,
  },
  markerContainer: {
    alignItems: 'center',
  },
  selectedMarker: {
    transform: [{ scale: 1.15 }],
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerNumber: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  bottomSheet: {
    borderTopLeftRadius: BorderRadius.xxlarge,
    borderTopRightRadius: BorderRadius.xxlarge,
    paddingTop: 0,
    maxHeight: BOTTOM_SHEET_HEIGHT,
    overflow: 'hidden',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  dayFilter: {
    marginBottom: Spacing.sm,
    maxHeight: 44,
  },
  dayFilterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dayChip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
  },
  dayChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionButtonActive: {
    backgroundColor: Colors.primary,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  cardLocation: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  cardAction: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  placesListContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  placesList: {
    flex: 1,
  },
  placesListContent: {
    paddingHorizontal: Spacing.md,
  },
  listTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearSelection: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  placeNumber: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeNumberText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  placeContent: {
    flex: 1,
  },
  placeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  placeLocation: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  },
  placeArrow: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooter: {
    height: Spacing.lg,
  },
});
