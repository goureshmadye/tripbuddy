import { MapViewComponent, Marker, Polyline } from '@/components/maps';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ItineraryItem } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    Platform,
    SafeAreaView,
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
  const mapRef = useRef<any>(null);

  const [items] = useState<ItineraryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);

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

  // Calculate route coordinates for polyline
  const routeCoordinates = filteredItems
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

  const handleOptimizeRoute = () => {
    if (filteredItems.length < 2) {
      Alert.alert('Route Optimization', 'Need at least 2 locations to optimize route.');
      return;
    }
    
    setShowRoute(true);
    fitToMarkers();
    Alert.alert('Route Optimized', 'Showing the optimized route between all locations.');
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

  // Custom map style for dark mode
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
          customMapStyle={isDark ? darkMapStyle : undefined}
          onMapReady={fitToMarkers}
        >
          {/* Markers for each itinerary item */}
          {filteredItems.map((item, index) => (
            item.latitude && item.longitude && (
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
            )
          ))}

          {/* Route polyline */}
          {showRoute && routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={Colors.primary}
              strokeWidth={3}
              lineDashPattern={[1]}
            />
          )}
        </MapViewComponent>

        {/* Map Header Overlay */}
        <View style={styles.mapHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
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
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={() => {
              const newDelta = Math.max(region.latitudeDelta * 0.5, 0.002);
              mapRef.current?.animateToRegion({
                ...region,
                latitudeDelta: newDelta,
                longitudeDelta: newDelta,
              }, 200);
            }}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={() => {
              const newDelta = Math.min(region.latitudeDelta * 2, 10);
              mapRef.current?.animateToRegion({
                ...region,
                latitudeDelta: newDelta,
                longitudeDelta: newDelta,
              }, 200);
            }}
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={centerOnUser}
          >
            <Ionicons name="locate" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={fitToMarkers}
          >
            <Ionicons name="expand" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.card }, Shadows.lg]}>
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
                selectedDay === index && { backgroundColor: Colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => { setSelectedDay(index); setTimeout(fitToMarkers, 100); }}
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
              { backgroundColor: showRoute ? Colors.primary : Colors.primary + '15' },
            ]}
            onPress={handleOptimizeRoute}
          >
            <Ionicons 
              name="git-branch-outline" 
              size={20} 
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
            style={[styles.actionButton, { backgroundColor: Colors.secondary + '15' }]}
            onPress={handleGetDirections}
          >
            <Ionicons name="navigate-outline" size={20} color={Colors.secondary} />
            <Text style={[styles.actionText, { color: Colors.secondary }]}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Item Card */}
        {selectedItem && (
          <View style={[styles.selectedCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.cardIcon, { backgroundColor: getCategoryColor(selectedItem.category) + '20' }]}>
              <Ionicons 
                name={getCategoryIcon(selectedItem.category)} 
                size={24} 
                color={getCategoryColor(selectedItem.category)} 
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{selectedItem.title}</Text>
              <Text style={[styles.cardLocation, { color: colors.textSecondary }]}>{selectedItem.location}</Text>
            </View>
            <TouchableOpacity
              style={[styles.cardAction, { backgroundColor: Colors.primary }]}
              onPress={() => router.push(`/trips/${id}/itinerary/${selectedItem.id}`)}
            >
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Places List */}
        <ScrollView 
          style={styles.placesList}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
            {filteredItems.length} Places
          </Text>
          {filteredItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.placeItem,
                { borderColor: colors.border },
                selectedItem?.id === item.id && { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
              ]}
              onPress={() => selectAndFocusItem(item)}
            >
              <View style={[styles.placeNumber, { backgroundColor: getCategoryColor(item.category) }]}>
                <Text style={styles.placeNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.placeContent}>
                <Text style={[styles.placeTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.placeLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
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
  mapHeader: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.sm,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.lg,
    top: '25%',
    gap: Spacing.xs,
  },
  markerContainer: {
    alignItems: 'center',
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerNumber: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  bottomSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    maxHeight: height * 0.45,
  },
  dayFilter: {
    marginBottom: Spacing.sm,
  },
  dayFilterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  dayChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  cardLocation: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  cardAction: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placesList: {
    paddingHorizontal: Spacing.lg,
  },
  listTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  placeNumber: {
    width: 28,
    height: 28,
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
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  placeLocation: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
