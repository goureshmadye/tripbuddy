import { ScreenContainer } from '@/components/screen-container';
import { TripCard } from '@/components/trips/trip-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrips } from '@/hooks/use-trips';
import { acceptInvitation, getInvitationByCode } from '@/services/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom navigation height for proper content padding
const BOTTOM_NAV_HEIGHT = 80;

export default function MyTripsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { user, isAuthenticated } = useAuth();
  const { trips, loading, error, refresh } = useTrips();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [tripCode, setTripCode] = useState('');
  const [joiningTrip, setJoiningTrip] = useState(false);
  
  // Calculate bottom padding to avoid overlap with bottom navigation
  const bottomPadding = Math.max(insets.bottom, Spacing.lg) + BOTTOM_NAV_HEIGHT;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [refresh]);

  const filteredTrips = trips.filter((trip) => {
    const now = new Date();
    const endDate = new Date(trip.endDate);
    const startDate = new Date(trip.startDate);
    
    switch (filter) {
      case 'upcoming':
        return startDate > now;
      case 'past':
        return endDate < now;
      default:
        return true;
    }
  });

  const handleTripPress = (tripId: string) => {
    router.push(`/trips/${tripId}`);
  };

  const handleCreateTrip = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    router.push('/trips/create');
  };

  const handleJoinWithCode = async () => {
    const code = tripCode.trim().toUpperCase();
    
    if (!code) {
      Alert.alert('Error', 'Please enter a trip code');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert('Error', 'You must be logged in to join a trip');
      setJoiningTrip(false);
      return;
    }

    setJoiningTrip(true);
    try {
      // Look up the invitation by code
      const invitation = await getInvitationByCode(code);
      
      if (!invitation) {
        Alert.alert('Error', 'Invalid trip code. Please check and try again.');
        return;
      }

      // Check if invitation is expired
      if (new Date() > invitation.expiresAt) {
        Alert.alert('Error', 'This invitation has expired. Please ask the trip owner for a new code.');
        return;
      }

      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        Alert.alert('Error', 'This invitation has already been used.');
        return;
      }

      // Accept the invitation (this adds the user as a collaborator)
      await acceptInvitation(invitation.id, user.id);
      
      // Refresh the trips list
      refresh();
      
      Alert.alert(
        'Success!',
        'You\'ve joined the trip successfully.',
        [{ text: 'View Trip', onPress: () => {
          setJoinModalVisible(false);
          setTripCode('');
          router.push(`/trips/${invitation.tripId}`);
        }},
        { text: 'OK', onPress: () => {
          setJoinModalVisible(false);
          setTripCode('');
          router.push(`/trips/${invitation.tripId}`);
        }}]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join trip. Please try again.');
    } finally {
      setJoiningTrip(false);
    }
  };

  // Show loading state with skeleton
  if (loading && trips.length === 0) {
    return (
      <ScreenContainer style={styles.container} edges={['top']} bottomPadding={0}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View>
            <Skeleton width={100} height={14} style={{ marginBottom: 8 }} />
            <Skeleton width={180} height={24} />
          </View>
        </View>

        {/* Action buttons skeleton */}
        <View style={styles.actionButtonsContainer}>
          <Skeleton height={48} style={{ flex: 1, borderRadius: BorderRadius.button }} />
          <Skeleton height={48} style={{ flex: 1, borderRadius: BorderRadius.button }} />
        </View>

        {/* Stats skeleton */}
        <View style={styles.statsContainer}>
          <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
          <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
          <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
        </View>

        {/* Filter skeleton */}
        <View style={[styles.filterContainer, { marginBottom: Spacing.lg }]}>
          <Skeleton width={60} height={32} style={{ borderRadius: BorderRadius.pill }} />
          <Skeleton width={80} height={32} style={{ borderRadius: BorderRadius.pill }} />
          <Skeleton width={50} height={32} style={{ borderRadius: BorderRadius.pill }} />
        </View>

        {/* Trip cards skeleton */}
        <View style={{ paddingHorizontal: Spacing.screenPadding }}>
          <SkeletonCard style={{ marginBottom: Spacing.md }} />
          <SkeletonCard style={{ marginBottom: Spacing.md }} />
          <SkeletonCard />
        </View>
      </ScreenContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <ScreenContainer style={styles.container} edges={['top']} bottomPadding={0}>
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error.message || "Failed to load trips. Please try again."}
          actionLabel="Retry"
          onAction={onRefresh}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container} edges={['top']} bottomPadding={0}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {isAuthenticated ? 'Welcome back,' : 'Welcome,'}
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {isAuthenticated ? (user?.name || 'Traveler') : 'Guest'}! 👋
          </Text>
        </View>
      </View>

      {/* Action Buttons - New Trip + Join with Code */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.primary }]}
          onPress={handleCreateTrip}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>New Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setJoinModalVisible(true)}
        >
          <Ionicons name="enter-outline" size={20} color={Colors.primary} />
          <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Join with Code</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name="airplane" size={24} color={Colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{trips.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.secondary + '15' }]}>
          <Ionicons name="calendar" size={24} color={Colors.secondary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {trips.filter(t => new Date(t.startDate) > new Date()).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Upcoming</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.accent + '15' }]}>
          <Ionicons name="people" size={24} color={Colors.accent} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {trips.filter(t => new Date(t.endDate) < new Date()).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && { backgroundColor: Colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trips List */}
      <ScrollView
        style={styles.tripsList}
        contentContainerStyle={[styles.tripsListContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTrips.length === 0 ? (
          isAuthenticated ? (
            <EmptyState
              icon="airplane-outline"
              title="Ready to plan your first adventure?"
              description="Create your first trip and start collaborating with friends. Add destinations, itineraries, and share expenses effortlessly."
              actionLabel="Create Trip"
              onAction={handleCreateTrip}
            />
          ) : (
            <EmptyState
              icon="log-in-outline"
              title="Sign in to access your trips"
              description="Create an account to plan trips, collaborate with friends, and manage your travel adventures."
              actionLabel="Sign In"
              onAction={() => router.push('/auth/login')}
            />
          )
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Trips
              </Text>
            </View>
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => handleTripPress(trip.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Join with Code Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Join a Trip</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Enter the trip code shared by your friend to join their trip.
            </Text>

            <View style={[styles.codeInputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.codeInput, { color: colors.text }]}
                placeholder="e.g. TRIP-ABC123"
                placeholderTextColor={colors.textMuted}
                value={tripCode}
                onChangeText={setTripCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={11}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, { opacity: joiningTrip ? 0.7 : 1 }]}
              onPress={handleJoinWithCode}
              disabled={joiningTrip}
            >
              {joiningTrip ? (
                <Text style={styles.joinButtonText}>Joining...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.joinButtonText}>Join Trip</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateTrip}
        activeOpacity={0.8}
        accessibilityLabel="Create new trip"
        accessibilityHint="Opens trip creation wizard"
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
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
    paddingTop: 0, // Removed top padding as ScreenContainer handles it
    paddingBottom: Spacing.md, // Increased to 16px
  },
  greeting: {
    fontSize: FontSizes.bodySmall,
  },
  userName: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
  },
  actionButtonText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.large,
    gap: 4,
  },
  statNumber: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    fontSize: FontSizes.caption,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  filterText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  tripsList: {
    flex: 1,
  },
  tripsListContent: {
    paddingHorizontal: Spacing.screenPadding,
    // Bottom padding is applied dynamically via bottomPadding state
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.modal,
    borderTopRightRadius: BorderRadius.modal,
    padding: Spacing.screenPadding,
    paddingBottom: Spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  modalDescription: {
    fontSize: FontSizes.body,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    flex: 1,
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    letterSpacing: 2,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
