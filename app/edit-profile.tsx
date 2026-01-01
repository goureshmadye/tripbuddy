import LoadingScreen from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateUser } from '@/services/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user, refreshUser, firebaseUser, loading, isGuestMode, isWalkthroughComplete } = useAuth();
  
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

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Password modal state
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Currency modal state
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'premium'>('free');
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  const getPlanLabel = () => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlan);
    return plan ? `${plan.name} Plan` : 'Free Plan';
  };

  const getLocationDisplay = () => {
    const currency = user?.defaultCurrency || 'USD';
    const mapping = CURRENCY_COUNTRY_MAP[currency];
    if (mapping) {
      return `${mapping.country} · ${mapping.currency}`;
    }
    return currency;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(user.id, { name: name.trim() });
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // TODO: Implement actual password change with Firebase
    Alert.alert('Success', 'Password changed successfully');
    setChangePasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCurrencyChange = async (currency: string) => {
    if (!user?.id) return;
    try {
      await updateUser(user.id, { defaultCurrency: currency });
      await refreshUser();
      setCurrencyModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update currency');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View style={styles.profileAvatarSection}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: Colors.primary }]}>
              {user?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Ionicons name="camera-outline" size={16} color={Colors.primary} />
            <Text style={[styles.changePhotoText, { color: Colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Name</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            leftIcon="person-outline"
          />
        </View>

        {/* Email */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            editable={false}
          />
          <Text style={[styles.inputHint, { color: colors.textMuted }]}>
            Email cannot be changed for security reasons
          </Text>
        </View>

        {/* Location & Currency */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Location & Currency</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <View style={styles.selectButtonContent}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.selectButtonText, { color: colors.text }]}>
                {getLocationDisplay()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <View style={styles.selectButtonContent}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.selectButtonText, { color: colors.text }]}>
                Change Password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Subscription</Text>
          <TouchableOpacity
            style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSubscriptionModalVisible(true)}
          >
            <View style={[styles.subscriptionIcon, { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons name="diamond-outline" size={24} color={Colors.accent} />
            </View>
            <View style={styles.subscriptionInfo}>
              <Text style={[styles.subscriptionPlan, { color: colors.text }]}>{getPlanLabel()}</Text>
              <Text style={[styles.subscriptionStatus, { color: colors.textSecondary }]}>
                {currentPlan === 'free' ? 'Upgrade for more features' : 'Active subscription'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Changes'}
            onPress={handleSaveProfile}
            disabled={isSaving || name === user?.name}
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                leftIcon="lock-closed-outline"
              />
            </View>
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                leftIcon="lock-closed-outline"
              />
            </View>
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                leftIcon="lock-closed-outline"
              />
            </View>
            <Button
              title="Change Password"
              onPress={handleChangePassword}
              fullWidth
              style={{ marginTop: Spacing.lg }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location & Currency</Text>
            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {Object.entries(CURRENCY_COUNTRY_MAP).map(([code, { country, currency }]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.currencyOption,
                  { borderBottomColor: colors.border },
                  user?.defaultCurrency === code && { backgroundColor: Colors.primary + '10' },
                ]}
                onPress={() => handleCurrencyChange(code)}
              >
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencyCountry, { color: colors.text }]}>{country}</Text>
                  <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>{currency}</Text>
                </View>
                {user?.defaultCurrency === code && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        visible={subscriptionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
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
    paddingVertical: Spacing.md,
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
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  changePhotoText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  inputHint: {
    fontSize: FontSizes.caption,
    marginTop: Spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectButtonText: {
    fontSize: FontSizes.body,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: Spacing.md,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionPlan: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  subscriptionStatus: {
    fontSize: FontSizes.bodySmall,
    marginTop: 2,
  },
  saveSection: {
    marginTop: Spacing.lg,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.screenPadding,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCountry: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  currencyCode: {
    fontSize: FontSizes.bodySmall,
    marginTop: 2,
  },
  planCard: {
    borderRadius: BorderRadius.card,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  planPrice: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.xs,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
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
    fontSize: FontSizes.bodySmall,
  },
});
