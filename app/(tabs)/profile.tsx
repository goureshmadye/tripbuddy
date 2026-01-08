import { ScreenContainer, useScreenPadding } from '@/components/screen-container';
import { PlanBadge } from '@/components/subscription';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription } from '@/hooks/use-subscription';
import { useTrips } from '@/hooks/use-trips';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Bottom navigation height for proper content padding
const BOTTOM_NAV_HEIGHT = 80;

// Currency and country mapping
const CURRENCY_COUNTRY_MAP: Record<string, { country: string; currency: string }> = {
  USD: { country: 'United States', currency: 'USD' },
  EUR: { country: 'Europe', currency: 'EUR' },
  GBP: { country: 'United Kingdom', currency: 'GBP' },
  INR: { country: 'India', currency: 'INR' },
  JPY: { country: 'Japan', currency: 'JPY' },
  AUD: { country: 'Australia', currency: 'AUD' },
  CAD: { country: 'Canada', currency: 'CAD' },
  CNY: { country: 'China', currency: 'CNY' },
  KRW: { country: 'South Korea', currency: 'KRW' },
  SGD: { country: 'Singapore', currency: 'SGD' },
  BRL: { country: 'Brazil', currency: 'BRL' },
  MXN: { country: 'Mexico', currency: 'MXN' },
};

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
}

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { bottom } = useScreenPadding({ hasBottomNav: true });

  // Calculate bottom padding for scroll content (preserve previous min spacing behavior)
  const bottomPadding = Math.max(bottom - BOTTOM_NAV_HEIGHT, Spacing.lg) + BOTTOM_NAV_HEIGHT;

  const { user, loading, signOutUser, isGuestMode, disableGuestMode } = useAuth();
  const { trips } = useTrips();
  const { plan, planInfo, limits, daysUntilRenewal, isFree, subscription } = useSubscription();
  
  // Track image loading errors
  const [imageError, setImageError] = React.useState(false);
  
  // Reset image error when user profile photo changes
  React.useEffect(() => {
    setImageError(false);
  }, [user?.profilePhoto]);

  // Calculate stats from real data
  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).getFullYear().toString()
    : new Date().getFullYear().toString();

  const stats: StatItem[] = user ? [
    { icon: 'airplane', value: trips.length, label: 'Trips', color: Colors.primary },
    { icon: 'globe', value: trips.filter(t => new Date(t.endDate) < new Date()).length, label: 'Completed', color: Colors.secondary },
    { icon: 'calendar', value: memberSince, label: 'Member Since', color: Colors.accent },
  ] : [];

  // Get location display text
  const getLocationDisplay = () => {
    const currency = user?.defaultCurrency || 'USD';
    const mapping = CURRENCY_COUNTRY_MAP[currency];
    if (mapping) {
      return `${mapping.country} · ${mapping.currency}`;
    }
    return currency;
  };

  const quickActions: QuickAction[] = [
    {
      id: 'edit-profile',
      icon: 'person-outline',
      label: 'Edit Profile',
      color: Colors.primary,
      onPress: () => router.push('/edit-profile'),
    },
    {
      id: 'my-trips',
      icon: 'airplane-outline',
      label: 'My Trips',
      color: Colors.secondary,
      onPress: () => router.push('/(tabs)'),
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      color: Colors.accent,
      onPress: () => router.push('/settings'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help',
      color: Colors.info,
      onPress: () => Alert.alert('Help', 'Help & Support coming soon!'),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOutUser();
              await disableGuestMode();
              router.replace('/auth');
            } catch {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Skeleton */}
          <View style={styles.profileHeader}>
            <Skeleton width={100} height={100} style={{ borderRadius: 50, marginBottom: Spacing.md }} />
            <Skeleton width={150} height={24} style={{ marginBottom: Spacing.sm }} />
            <Skeleton width={100} height={14} />
          </View>

          {/* Stats Skeleton */}
          <View style={styles.statsContainer}>
            <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
            <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
            <Skeleton height={80} style={{ flex: 1, borderRadius: BorderRadius.large }} />
          </View>

          {/* Subscription Card Skeleton */}
          <Skeleton height={80} style={{ borderRadius: BorderRadius.large, marginBottom: Spacing.lg }} />

          {/* Quick Actions Skeleton */}
          <View style={{ marginBottom: Spacing.lg }}>
            <Skeleton width={120} height={18} style={{ marginBottom: Spacing.md }} />
            <View style={styles.actionsGrid}>
              <Skeleton height={90} style={{ flex: 1, borderRadius: BorderRadius.large }} />
              <Skeleton height={90} style={{ flex: 1, borderRadius: BorderRadius.large }} />
            </View>
            <View style={[styles.actionsGrid, { marginTop: Spacing.sm }]}>
              <Skeleton height={90} style={{ flex: 1, borderRadius: BorderRadius.large }} />
              <Skeleton height={90} style={{ flex: 1, borderRadius: BorderRadius.large }} />
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Guest mode UI
  if (isGuestMode || !user) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.primary + '10' }]}>
            <Ionicons name="person-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isGuestMode ? 'Guest Mode' : 'Not Signed In'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {isGuestMode 
              ? 'You\'re using TripBuddy as a guest. Sign in to sync your trips across devices and unlock all features.'
              : 'Sign in to view your profile and trip history.'}
          </Text>
          <Button
            title="Sign In"
            onPress={async () => {
              if (isGuestMode) {
                await disableGuestMode();
              }
              router.replace('/auth');
            }}
            style={{ marginTop: Spacing.lg }}
          />
          {isGuestMode && (
            <Button
              title="Create Account"
              variant="outline"
              onPress={async () => {
                await disableGuestMode();
                router.replace('/auth/signup');
              }}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, Shadows.md]}>
            {user.profilePhoto && !imageError ? (
              <Image 
                source={{ uri: user.profilePhoto }} 
                style={styles.avatar}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary }]}>
                {user.name && user.name.length > 0 ? (
                  <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons name="person" size={40} color="#FFFFFF" />
                )}
              </View>
            )}
            <TouchableOpacity
              style={[styles.editAvatarButton, { backgroundColor: Colors.primary }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.locationText, { color: colors.textMuted }]}>
              {getLocationDisplay()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Subscription Card */}
        <TouchableOpacity
          style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/subscription')}
          activeOpacity={0.7}
        >
          <View style={styles.subscriptionContent}>
            <View style={[styles.subscriptionIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="diamond" size={24} color={Colors.primary} />
            </View>
            <View style={styles.subscriptionInfo}>
              <View style={styles.subscriptionHeader}>
                <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                  {planInfo?.name || 'Free Plan'}
                </Text>
                <PlanBadge plan={plan} size="small" />
              </View>
              <Text style={[styles.subscriptionDescription, { color: colors.textSecondary }]}>
                {isFree 
                  ? `${limits.maxCollaboratorsPerTrip} collaborators · ${limits.maxExpensesPerTrip} expenses per trip`
                  : subscription?.cancelAtPeriodEnd
                    ? `Cancels in ${daysUntilRenewal} days`
                    : daysUntilRenewal
                      ? `Renews in ${daysUntilRenewal} days`
                      : 'Unlimited access to all features'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={action.onPress}
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

        {/* Recent Trips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trips</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {trips.length === 0 ? (
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: colors.textMuted }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityText, { color: colors.textSecondary }]}>
                    No trips yet. Create your first trip!
                  </Text>
                </View>
              </View>
            ) : (
              trips.slice(0, 3).map((trip, index) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.activityItem}
                  onPress={() => router.push(`/trips/${trip.id}`)}
                >
                  <View style={[styles.activityDot, { backgroundColor: Colors.primary }]} />
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityText, { color: colors.text }]}>
                      {trip.title}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                      {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={20} color={Colors.primary} />}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
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
    paddingHorizontal: Spacing.screenPadding,
    // Bottom padding is applied dynamically via bottomPadding state
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: FontWeights.bold,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: FontSizes.bodySmall,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    fontSize: FontSizes.caption,
  },
  // Subscription card
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  subscriptionTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  subscriptionDescription: {
    fontSize: FontSizes.caption,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  activityCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: FontSizes.bodySmall,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: FontSizes.caption,
  },
  signOutSection: {
    marginTop: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
