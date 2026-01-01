import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrip, useTripCollaborators, useTripExpenses, useTripItinerary } from '@/hooks/use-trips';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'itinerary', icon: 'calendar-outline', label: 'Itinerary', color: Colors.primary, route: 'itinerary' },
  { id: 'map', icon: 'map-outline', label: 'Map', color: Colors.secondary, route: 'map' },
  { id: 'expenses', icon: 'wallet-outline', label: 'Expenses', color: Colors.accent, route: 'expenses' },
  { id: 'documents', icon: 'document-outline', label: 'Documents', color: Colors.info, route: 'documents' },
  { id: 'collaborators', icon: 'people-outline', label: 'Team', color: '#8B5CF6', route: 'collaborators' },
];

export default function TripOverviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Auth and user data
  const { user } = useAuth();

  // Fetch trip data from Firestore
  const { trip, loading: tripLoading, error: tripError } = useTrip(id);
  const { items: itinerary, loading: itineraryLoading } = useTripItinerary(id);
  const { collaborators, loading: collabLoading } = useTripCollaborators(id);
  const { expenses, totalExpenses, loading: expensesLoading } = useTripExpenses(id);

  // Get currency - prefer trip currency, fall back to user's default currency
  const currency = trip?.currency || user?.defaultCurrency || 'USD';

  const formatDateRange = (start: Date, end: Date): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const getDurationDays = (start: Date, end: Date): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleQuickAction = (action: QuickAction) => {
    router.push(`/trips/${id}/${action.route}`);
  };

  // Format currency using trip's currency or user's default
  const formatCurrency = (amount: number) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${currency} ${formattedAmount}`;
  };

  // Loading state
  if (tripLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading trip...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (tripError || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip not found"
          description={tripError?.message || "We couldn't find this trip. It may have been deleted."}
        />
      </SafeAreaView>
    );
  }

  // Get today's items
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todaysItems = itinerary.filter(item => {
    if (!item.startTime) return false;
    const itemDate = new Date(item.startTime);
    return itemDate >= todayStart && itemDate < todayEnd;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Trip Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.tripIcon, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="airplane" size={40} color={Colors.primary} />
          </View>
          <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
          <View style={styles.tripMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>
                {getDurationDays(trip.startDate, trip.endDate)} days
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  Shadows.sm,
                ]}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => router.push(`/trips/${id}/itinerary`)}>
              <Text style={[styles.seeAllText, { color: Colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {itineraryLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : todaysItems.length === 0 ? (
            <View style={[styles.emptySchedule, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyScheduleText, { color: colors.textSecondary }]}>
                No activities scheduled for today
              </Text>
              <TouchableOpacity onPress={() => router.push(`/trips/${id}/itinerary/add`)}>
                <Text style={[styles.addActivityText, { color: Colors.primary }]}>
                  Add an activity
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaysItems.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.scheduleItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(`/trips/${id}/itinerary/${item.id}`)}
              >
                <View style={[styles.scheduleTime, { backgroundColor: Colors.primary + '10' }]}>
                  <Text style={[styles.timeText, { color: Colors.primary }]}>
                    {item.startTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.scheduleContent}>
                  <Text style={[styles.scheduleTitle, { color: colors.text }]}>{item.title}</Text>
                  {item.location && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Trip Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trip Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="list-outline" size={24} color={Colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{itinerary.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Activities</Text>
            </View>
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/trips/${id}/collaborators`)}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={24} color={Colors.secondary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {collabLoading ? '...' : collaborators.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Travelers</Text>
            </TouchableOpacity>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={24} color={Colors.accent} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {expensesLoading ? '...' : formatCurrency(totalExpenses)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expenses</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-outline" size={24} color={Colors.info} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{expenses.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Records</Text>
            </View>
          </View>
        </View>

        {/* Travelers Section */}
        {!collabLoading && collaborators.length > 0 && (
          <View style={styles.travelersSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Travelers</Text>
              <TouchableOpacity onPress={() => router.push(`/trips/${id}/collaborators`)}>
                <Text style={[styles.seeAllText, { color: Colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.travelersScrollContent}
            >
              {collaborators.map((collab) => (
                <View key={collab.id} style={[styles.travelerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.travelerAvatar, { backgroundColor: Colors.secondary + '20' }]}>
                    {collab.user?.profilePhoto ? (
                      <View style={styles.avatarImage}>
                        <Text style={styles.avatarFallback}>
                          {collab.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.avatarInitial, { color: Colors.secondary }]}>
                        {collab.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    )}
                  </View>
                  <Text 
                    style={[styles.travelerName, { color: colors.text }]} 
                    numberOfLines={1}
                  >
                    {collab.user?.name || 'Unknown'}
                  </Text>
                  <Text style={[styles.travelerRole, { color: colors.textMuted }]}>
                    {collab.role === 'owner' ? 'Organizer' : collab.role === 'editor' ? 'Editor' : 'Viewer'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
  },
  tripIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  tripTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.bodySmall,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.chip,
  },
  badgeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  quickActionsSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionCard: {
    width: (width - Spacing.screenPadding * 2 - Spacing.sm * 2) / 3,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  scheduleSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  scheduleTime: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.chip,
    marginRight: Spacing.md,
  },
  timeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: FontSizes.bodySmall,
  },
  statsSection: {
    paddingHorizontal: Spacing.screenPadding,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: (width - Spacing.screenPadding * 2 - Spacing.sm) / 2,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: 4,
  },
  statNumber: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    fontSize: FontSizes.caption,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.body,
  },
  emptySchedule: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyScheduleText: {
    fontSize: FontSizes.bodySmall,
    textAlign: 'center',
  },
  addActivityText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  travelersSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.lg,
  },
  travelersScrollContent: {
    gap: Spacing.md,
    paddingRight: Spacing.screenPadding,
  },
  travelerCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    width: 90,
    gap: Spacing.xs,
  },
  travelerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  avatarFallback: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
    color: Colors.secondary,
  },
  travelerName: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  travelerRole: {
    fontSize: FontSizes.micro,
    textAlign: 'center',
  },
});
