import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Trip } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  style?: ViewStyle;
}

export function TripCard({ trip, onPress, style }: TripCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const formatDateRange = (start: Date, end: Date): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
  };

  const getDaysUntilTrip = (): string => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const end = new Date(trip.endDate);
      if (now <= end) return 'Ongoing';
      return 'Completed';
    }
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getTripIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (trip.transportationMode?.toLowerCase()) {
      case 'flight':
      case 'plane':
        return 'airplane-outline';
      case 'car':
      case 'road':
        return 'car-outline';
      case 'train':
        return 'train-outline';
      case 'bus':
        return 'bus-outline';
      case 'cruise':
      case 'boat':
        return 'boat-outline';
      default:
        return 'location-outline';
    }
  };

  const getStatusColor = (): string => {
    const status = getDaysUntilTrip();
    if (status === 'Ongoing') return Colors.success;
    if (status === 'Completed') return colors.textMuted;
    if (status === 'Today' || status === 'Tomorrow') return Colors.accent;
    return Colors.primary;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        Shadows.md,
        style,
      ]}
    >
      {/* Trip Icon */}
      <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name={getTripIcon()} size={28} color={Colors.primary} />
      </View>

      {/* Trip Info */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {trip.title}
        </Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>
        {trip.tripType && (
          <View style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              {trip.tripType}
            </Text>
          </View>
        )}
      </View>

      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getDaysUntilTrip()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  dateText: {
    fontSize: FontSizes.sm,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
});
