import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SettingItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  description?: string;
  type: 'navigation' | 'toggle' | 'info';
  color?: string;
  danger?: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user, signOutUser, refreshUser, isGuestMode, disableGuestMode } = useAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'premium'>('free');
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const SUBSCRIPTION_PLANS = [
    {
      id: 'free',
      name: 'Free',
      price: '$0/month',
      features: ['Up to 3 trips', 'Basic expense tracking', '2 collaborators per trip'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$4.99/month',
      features: ['Unlimited trips', 'Advanced expense splitting', '10 collaborators per trip', 'Offline mode'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$9.99/month',
      features: ['Everything in Pro', 'Unlimited collaborators', 'Priority support', 'AI trip suggestions'],
    },
  ];

  const THEME_OPTIONS = [
    { id: 'light', label: 'Light', icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'dark', label: 'Dark', icon: 'moon-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'system', label: 'System', icon: 'phone-portrait-outline' as keyof typeof Ionicons.glyphMap },
  ];

  const getPlanLabel = () => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlan);
    return plan ? `${plan.name} Plan` : 'Free Plan';
  };

  const getThemeLabel = () => {
    const option = THEME_OPTIONS.find(o => o.id === theme);
    return option ? option.label : 'System';
  };

  const handleLogout = () => {
    Alert.alert(
      isGuestMode ? 'Exit Guest Mode' : 'Sign Out',
      isGuestMode ? 'Are you sure you want to exit guest mode? Your local data will be preserved.' : 'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isGuestMode ? 'Exit' : 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (isGuestMode) {
                await disableGuestMode();
              } else {
                await signOutUser();
              }
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ]
    );
  };

  const settingSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Subscription',
      items: [
        { id: 'subscription', icon: 'diamond-outline', label: 'Subscription Plan', value: getPlanLabel(), type: 'navigation', color: Colors.accent },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', icon: 'person-outline', label: 'Edit Profile', type: 'navigation' },
        { id: 'currency', icon: 'cash-outline', label: 'Default Currency', value: user?.defaultCurrency ?? 'USD', type: 'navigation' },
      ],
    },
    {
      title: 'Appearance',
      items: [
        { id: 'theme', icon: 'color-palette-outline', label: 'App Theme', value: getThemeLabel(), type: 'navigation' },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { id: 'push', icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle' },
        { id: 'email', icon: 'mail-outline', label: 'Email Notifications', type: 'toggle' },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        { id: 'offline', icon: 'cloud-offline-outline', label: 'Offline Mode', description: 'Access your trips without internet connection', type: 'toggle' },
        { id: 'sync', icon: 'sync-outline', label: 'Sync Now', type: 'navigation' },
        { id: 'cache', icon: 'trash-outline', label: 'Clear Cache', type: 'navigation' },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: 'help-circle-outline', label: 'Help Center', type: 'navigation' },
        { id: 'feedback', icon: 'chatbubble-outline', label: 'Send Feedback', type: 'navigation' },
        { id: 'rate', icon: 'star-outline', label: 'Rate the App', type: 'navigation' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { id: 'privacy', icon: 'shield-outline', label: 'Privacy Policy', type: 'navigation' },
        { id: 'terms', icon: 'document-text-outline', label: 'Terms of Service', type: 'navigation' },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { id: 'delete', icon: 'trash-outline', label: 'Delete Account', type: 'navigation', danger: true },
      ],
    },
  ];

  const getToggleValue = (id: string) => {
    switch (id) {
      case 'push': return pushNotifications;
      case 'email': return emailNotifications;
      case 'offline': return offlineMode;
      default: return false;
    }
  };

  const handleToggle = (id: string, value: boolean) => {
    switch (id) {
      case 'push': setPushNotifications(value); break;
      case 'email': setEmailNotifications(value); break;
      case 'offline': setOfflineMode(value); break;
    }
  };

  const handleItemPress = (item: SettingItem) => {
    if (item.type === 'toggle') return;
    
    switch (item.id) {
      case 'subscription':
        setSubscriptionModalVisible(true);
        break;
      case 'theme':
        setThemeModalVisible(true);
        break;
      case 'delete':
        handleDeleteAccount();
        break;
      case 'sync':
        Alert.alert('Syncing...', 'Your data is being synchronized.');
        break;
      case 'cache':
        Alert.alert('Cache Cleared', 'All cached data has been removed.');
        break;
      default:
        // Navigate to respective screen
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => {
            if (isGuestMode) {
              Alert.alert(
                'Guest Mode',
                'Sign in to customize your profile and sync your trips across devices.',
                [
                  { text: 'Later', style: 'cancel' },
                  { 
                    text: 'Sign In', 
                    onPress: async () => {
                      await disableGuestMode();
                      router.replace('/auth/login');
                    }
                  },
                ]
              );
            }
          }}
        >
          <View style={[styles.avatar, { backgroundColor: isGuestMode ? Colors.warning + '20' : Colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: isGuestMode ? Colors.warning : Colors.primary }]}>
              {isGuestMode ? '?' : (user?.name?.charAt(0) ?? '?')}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {isGuestMode ? 'Guest User' : (user?.name ?? 'User')}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {isGuestMode ? 'Tap to sign in' : (user?.email ?? 'Not signed in')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Guest Mode Banner */}
        {isGuestMode && (
          <View style={[styles.guestBanner, { backgroundColor: Colors.warning + '15', borderColor: Colors.warning }]}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.warning} />
            <View style={styles.guestBannerText}>
              <Text style={[styles.guestBannerTitle, { color: colors.text }]}>
                You're in Guest Mode
              </Text>
              <Text style={[styles.guestBannerDescription, { color: colors.textSecondary }]}>
                Sign in to sync your trips and access all features
              </Text>
            </View>
            <Button
              title="Sign In"
              size="sm"
              onPress={async () => {
                await disableGuestMode();
                router.replace('/auth/login');
              }}
            />
          </View>
        )}

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    index < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleItemPress(item)}
                  disabled={item.type === 'toggle'}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={[
                    styles.settingIcon,
                    { backgroundColor: item.danger ? Colors.error + '15' : (item.color ? item.color + '15' : Colors.primary + '15') },
                  ]}>
                    <Ionicons 
                      name={item.icon} 
                      size={20} 
                      color={item.danger ? Colors.error : (item.color || Colors.primary)} 
                    />
                  </View>
                  <View style={styles.settingLabelContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: item.danger ? Colors.error : colors.text },
                    ]}>{item.label}</Text>
                    {item.description && (
                      <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  
                  {item.type === 'toggle' ? (
                    <Switch
                      value={getToggleValue(item.id)}
                      onValueChange={(value) => handleToggle(item.id, value)}
                      trackColor={{ false: colors.border, true: Colors.primary + '40' }}
                      thumbColor={getToggleValue(item.id) ? Colors.primary : colors.textMuted}
                    />
                  ) : (
                    <View style={styles.settingRight}>
                      {item.value && (
                        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                          {item.value}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <Button
            title={isGuestMode ? "Exit Guest Mode" : "Sign Out"}
            onPress={handleLogout}
            variant="outline"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={20} color={Colors.primary} />}
          />
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          TripBuddy v1.0.0
        </Text>
      </ScrollView>

      {/* Subscription Modal */}
      <Modal
        visible={subscriptionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Subscription Plans</Text>
            <TouchableOpacity onPress={() => setSubscriptionModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {SUBSCRIPTION_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { 
                    backgroundColor: colors.card, 
                    borderColor: currentPlan === plan.id ? Colors.primary : colors.border,
                    borderWidth: currentPlan === plan.id ? 2 : 1,
                  },
                ]}
                onPress={() => setCurrentPlan(plan.id as 'free' | 'pro' | 'premium')}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                    <Text style={[styles.planPrice, { color: Colors.primary }]}>{plan.price}</Text>
                  </View>
                  {currentPlan === plan.id && (
                    <View style={[styles.currentBadge, { backgroundColor: Colors.primary }]}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {currentPlan !== plan.id && (
                  <Button
                    title={`Upgrade to ${plan.name}`}
                    onPress={() => {
                      setCurrentPlan(plan.id as 'free' | 'pro' | 'premium');
                      Alert.alert('Success', `You've upgraded to ${plan.name} plan!`);
                    }}
                    fullWidth
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={themeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.themeModalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={[styles.themeModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.themeModalTitle, { color: colors.text }]}>App Theme</Text>
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setTheme(option.id as 'light' | 'dark' | 'system');
                  setThemeModalVisible(false);
                }}
              >
                <View style={styles.themeOptionLeft}>
                  <Ionicons name={option.icon} size={22} color={colors.text} />
                  <Text style={[styles.themeOptionLabel, { color: colors.text }]}>{option.label}</Text>
                </View>
                {theme === option.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  profileEmail: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  settingDescription: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingValue: {
    fontSize: FontSizes.sm,
  },
  signOutSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  planPrice: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.xs,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  planFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.sm,
  },
  themeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  themeModalContent: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  themeModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  themeOptionLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  guestBannerText: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  guestBannerDescription: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
