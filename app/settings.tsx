import LoadingScreen from '@/components/loading-screen';
import { CacheManager } from '@/components/offline/offline-components';
import { ScreenContainer } from '@/components/screen-container';
import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' as keyof typeof Ionicons.glyphMap },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { signOutUser, isGuestMode, disableGuestMode, firebaseUser, loading, isWalkthroughComplete } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const {
    pushNotifications,
    emailNotifications,
    offlineMode,
    setPushNotifications,
    setEmailNotifications,
    setOfflineMode,
    syncData,
    clearCache,
    isSyncing,
    isClearing,
  } = useSettings();

  // Modal state - must be called before any conditional returns
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [storageModalVisible, setStorageModalVisible] = useState(false);
  
  // Auth guard
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  if (!firebaseUser && !isGuestMode) {
    if (!isWalkthroughComplete) {
      return <Redirect href="/auth/walkthrough" />;
    }
    return <Redirect href="/auth" />;
  }

  const getThemeLabel = () => {
    const option = THEME_OPTIONS.find(o => o.id === themeMode);
    return option ? option.label : 'System';
  };

  const handleLogout = () => {
    Alert.alert(
      isGuestMode ? 'Exit Guest Mode' : 'Sign Out',
      isGuestMode ? 'Are you sure you want to exit guest mode?' : 'Are you sure you want to sign out?',
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
              } catch (err) {
                console.error('Logout error', err);
                Alert.alert('Error', 'Unable to sign out. Please try again.');
              }
            },
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
        { id: 'offline', icon: 'cloud-offline-outline', label: 'Offline Mode', description: 'Access your trips without internet', type: 'toggle' },
        { id: 'storage', icon: 'folder-outline', label: 'Manage Offline Storage', description: 'View and clear cached data', type: 'navigation' },
        { id: 'sync', icon: 'sync-outline', label: isSyncing ? 'Syncing...' : 'Sync Now', type: 'navigation' },
        { id: 'cache', icon: 'trash-outline', label: isClearing ? 'Clearing...' : 'Clear Cache', type: 'navigation' },
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
      case 'theme':
        setThemeModalVisible(true);
        break;
      case 'storage':
        setStorageModalVisible(true);
        break;
      case 'delete':
        handleDeleteAccount();
        break;
      case 'sync':
        if (!isSyncing) {
          syncData();
        }
        break;
      case 'cache':
        Alert.alert(
          'Clear Cache',
          'This will remove all cached data. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Clear', 
              style: 'destructive',
              onPress: () => clearCache()
            },
          ]
        );
        break;
      default:
        break;
    }
  };

  return (
    <ScreenContainer style={{ ...styles.container, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                    {(item.id === 'sync' && isSyncing) || (item.id === 'cache' && isClearing) ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.danger ? Colors.error : (item.color || Colors.primary)}
                      />
                    )}
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
                      {(item.id === 'sync' && isSyncing) || (item.id === 'cache' && isClearing) ? null : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
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
                  setThemeMode(option.id as 'light' | 'dark' | 'system');
                  setThemeModalVisible(false);
                }}
              >
                <View style={styles.themeOptionLeft}>
                  <Ionicons name={option.icon} size={22} color={colors.text} />
                  <Text style={[styles.themeOptionLabel, { color: colors.text }]}>{option.label}</Text>
                </View>
                {themeMode === option.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Storage Management Modal */}
      <Modal
        visible={storageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStorageModalVisible(false)}
      >
        <ScreenContainer style={{ ...styles.container, backgroundColor: colors.background }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStorageModalVisible(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Offline Storage</Text>
            <View style={styles.headerPlaceholder} />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <CacheManager onClearComplete={() => setStorageModalVisible(false)} />
          </ScrollView>
        </ScreenContainer>
      </Modal>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.cardPadding,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  settingDescription: {
    fontSize: FontSizes.caption,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingValue: {
    fontSize: FontSizes.bodySmall,
  },
  signOutSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.bodySmall,
  },
  themeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  themeModalContent: {
    width: '100%',
    borderRadius: BorderRadius.modal,
    padding: Spacing.cardPadding,
  },
  themeModalTitle: {
    fontSize: FontSizes.heading3,
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
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
});
