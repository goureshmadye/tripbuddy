import { TripCard } from '@/components/trips/trip-card';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrips } from '@/hooks/use-trips';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function MyTripsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { trips, loading, error, refresh } = useTrips();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [tripCode, setTripCode] = useState('');
  const [joiningTrip, setJoiningTrip] = useState(false);

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
    router.push('/trips/create');
  };

  const handleJoinWithCode = async () => {
    if (!tripCode.trim()) {
      Alert.alert('Error', 'Please enter a trip code');
      return;
    }

    setJoiningTrip(true);
    try {
      // TODO: Implement trip code joining via Firestore
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Success!',
        'You\'ve joined the trip successfully.',
        [{ text: 'OK', onPress: () => {
          setJoinModalVisible(false);
          setTripCode('');
        }}]
      );
    } catch (err) {
      Alert.alert('Error', 'Invalid trip code. Please check and try again.');
    } finally {
      setJoiningTrip(false);
    }
  };

  // Show loading state
  if (loading && trips.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your trips...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error.message || "Failed to load trips. Please try again."}
          actionLabel="Retry"
          onAction={onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'Traveler'}! 👋
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
        contentContainerStyle={styles.tripsListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTrips.length === 0 ? (
          <EmptyState
            icon="airplane-outline"
            title="No trips yet"
            description="Start planning your next adventure! Create a trip and invite your friends to collaborate."
            actionLabel="Create Trip"
            onAction={handleCreateTrip}
          />
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
                placeholder="Enter trip code"
                placeholderTextColor={colors.textMuted}
                value={tripCode}
                onChangeText={setTripCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
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
    </SafeAreaView>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
    paddingBottom: Spacing['3xl'] + Spacing.xl,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.body,
  },
});
