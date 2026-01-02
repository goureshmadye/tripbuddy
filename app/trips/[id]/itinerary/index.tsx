import { ScreenHeader } from '@/components/navigation/screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTripItinerary } from '@/hooks/use-trips';
import { ItineraryCategory, ItineraryItem } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type ViewMode = 'timeline' | 'map' | 'list';

const CATEGORY_CONFIG: Record<ItineraryCategory | string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  activity: { icon: 'flash-outline', color: '#8B5CF6' },
  food: { icon: 'restaurant-outline', color: '#F97316' },
  transport: { icon: 'car-outline', color: Colors.primary },
  accommodation: { icon: 'bed-outline', color: Colors.secondary },
  sightseeing: { icon: 'camera-outline', color: Colors.accent },
  other: { icon: 'ellipsis-horizontal-outline', color: '#64748B' },
};

export default function ItineraryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { items, loading, error } = useTripItinerary(id);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedDay, setSelectedDay] = useState(0);

  // Group items by day
  const groupedItems = items.reduce((acc, item) => {
    if (!item.startTime) return acc;
    const dateKey = new Date(item.startTime).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, ItineraryItem[]>);

  const days = Object.keys(groupedItems).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
    });
  };

  const getCategoryConfig = (category?: string | null) => {
    return CATEGORY_CONFIG[category || 'other'] || CATEGORY_CONFIG.other;
  };

  const handleAddItem = () => {
    router.push(`/trips/${id}/itinerary/add`);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/trips/${id}/itinerary/${itemId}`);
  };

  return (
    <ScreenContainer style={styles.container} backgroundColor={colors.background} padded>
      {/* Header */}
      <ScreenHeader title="Itinerary" showBack={false} />

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'timeline' && { backgroundColor: Colors.primary },
          ]}
          onPress={() => setViewMode('timeline')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={viewMode === 'timeline' ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'timeline' ? '#FFFFFF' : colors.textSecondary },
          ]}>Timeline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'map' && { backgroundColor: Colors.primary },
          ]}
          onPress={() => router.push(`/trips/${id}/map`)}
        >
          <Ionicons 
            name="map-outline" 
            size={18} 
            color={viewMode === 'map' ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'map' ? '#FFFFFF' : colors.textSecondary },
          ]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'list' && { backgroundColor: Colors.primary },
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list-outline" 
            size={18} 
            color={viewMode === 'list' ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'list' ? '#FFFFFF' : colors.textSecondary },
          ]}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Day Tabs */}
      {days.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dayTabs}
          contentContainerStyle={styles.dayTabsContent}
        >
          {days.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayTab,
                selectedDay === index && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text style={[
                styles.dayNumber,
                { color: selectedDay === index ? Colors.primary : colors.text },
              ]}>Day {index + 1}</Text>
              <Text style={[
                styles.dayDate,
                { color: selectedDay === index ? Colors.primary : colors.textSecondary },
              ]}>{formatDate(day)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading itinerary...</Text>
          </View>
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Failed to load itinerary"
            description={error.message || "Something went wrong. Please try again."}
            actionLabel="Retry"
            onAction={() => router.replace(`/trips/${id}/itinerary`)}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No activities yet"
            description="Start planning your trip by adding activities, reservations, and places to visit."
            actionLabel="Add Activity"
            onAction={handleAddItem}
          />
        ) : viewMode === 'timeline' ? (
          // Timeline View
          <View style={styles.timeline}>
            {(groupedItems[days[selectedDay]] || [])
              .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
              .map((item, index, arr) => {
                const config = getCategoryConfig(item.category);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.timelineItem}
                    onPress={() => handleItemPress(item.id)}
                    activeOpacity={0.7}
                  >
                    {/* Timeline Line */}
                    <View style={styles.timelineLine}>
                      <View style={[styles.timelineDot, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon} size={16} color="#FFFFFF" />
                      </View>
                      {index < arr.length - 1 && (
                        <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
                      )}
                    </View>

                    {/* Content */}
                    <View style={[
                      styles.timelineContent,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      Shadows.sm,
                    ]}>
                      <View style={styles.timelineHeader}>
                        <Text style={[styles.itemTime, { color: config.color }]}>
                          {formatTime(item.startTime!)}
                          {item.endTime && ` - ${formatTime(item.endTime)}`}
                        </Text>
                      </View>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      {item.description && (
                        <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      {item.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.locationText, { color: colors.textMuted }]}>
                            {item.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        ) : (
          // List View
          <View style={styles.listView}>
            {(groupedItems[days[selectedDay]] || [])
              .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
              .map((item) => {
                const config = getCategoryConfig(item.category);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.listItem,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => handleItemPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.listIcon, { backgroundColor: config.color + '15' }]}>
                      <Ionicons name={config.icon} size={24} color={config.color} />
                    </View>
                    <View style={styles.listContent}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                        {formatTime(item.startTime!)}
                        {item.endTime && ` - ${formatTime(item.endTime)}`}
                      </Text>
                      {item.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                          <Text style={[styles.locationTextSmall, { color: colors.textMuted }]}>
                            {item.location}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg]}
        onPress={handleAddItem}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  dayTabs: {
    maxHeight: 70,
    marginBottom: Spacing.md,
  },
  dayTabsContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
  },
  dayTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  dayNumber: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  dayDate: {
    fontSize: FontSizes.caption,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing['3xl'] + Spacing.xl,
  },
  timeline: {
    paddingTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineLine: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
  },
  timelineHeader: {
    marginBottom: Spacing.xs,
  },
  itemTime: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  itemTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: FontSizes.bodySmall,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: FontSizes.bodySmall,
  },
  locationTextSmall: {
    fontSize: FontSizes.caption,
  },
  listView: {
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  listContent: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing['3xl'],
    right: Spacing.screenPadding,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.body,
  },
});
