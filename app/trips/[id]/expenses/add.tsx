import { useScreenPadding } from '@/components/screen-container';
import { LimitWarning, UpgradePrompt } from '@/components/subscription';
import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription, useTripUsage } from '@/hooks/use-subscription';
import { useTrip, useTripCollaborators } from '@/hooks/use-trips';
import { createExpense, createExpenseShare } from '@/services/firestore';
import { notifyExpenseAdded } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// safe area handled via useScreenPadding

type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activities' | 'shopping' | 'other';
type ExpenseSplitType = 'equal' | 'percentage' | 'custom';

const CATEGORIES: { id: ExpenseCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'food', label: 'Food', icon: 'restaurant-outline', color: '#F97316' },
  { id: 'transport', label: 'Transport', icon: 'car-outline', color: Colors.primary },
  { id: 'accommodation', label: 'Stay', icon: 'bed-outline', color: Colors.secondary },
  { id: 'activities', label: 'Activities', icon: 'ticket-outline', color: '#8B5CF6' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-outline', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#64748B' },
];

const SPLIT_TYPES: { id: ExpenseSplitType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'equal', label: 'Equal Split', description: 'Split evenly among all', icon: 'git-merge-outline' },
  { id: 'percentage', label: 'By Percentage', description: 'Custom percentages', icon: 'pie-chart-outline' },
  { id: 'custom', label: 'Custom Amounts', description: 'Enter exact amounts', icon: 'calculator-outline' },
];

interface Member {
  id: string;
  name: string;
  selected: boolean;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { topMargin, bottom } = useScreenPadding();

  // Auth and collaborators
  const { user } = useAuth();
  const { trip } = useTrip(id);
  const { collaborators, loading: collaboratorsLoading, error: collaboratorsError } = useTripCollaborators(id);
  
  // Subscription and usage limits
  const { limits } = useSubscription();
  const { usage, expenseAccess, refresh: refreshUsage } = useTripUsage(id || '');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Use trip's currency or user's default currency
  const currency = trip?.currency || user?.defaultCurrency || 'USD';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [splitType, setSplitType] = useState<ExpenseSplitType>('equal');
  const [paidBy, setPaidBy] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  // Initialize paidBy to current user and members from collaborators
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

  useEffect(() => {
    if (collaborators.length > 0 && members.length === 0) {
      setMembers(
        collaborators
          .filter((c) => c.user)
          .map((c) => ({
            id: c.userId,
            name: c.user!.name,
            selected: true, // Default to all selected for equal split
          }))
      );
    }
  }, [collaborators, members.length]);

  const toggleMember = (memberId: string) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, selected: !m.selected } : m
    ));
  };

  const handleSave = async () => {
    // Check expense limit before saving
    if (!expenseAccess.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    const newErrors: { title?: string; amount?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Enter a valid amount';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user || !id) {
      Alert.alert('Error', 'Unable to save expense. Please try again.');
      return;
    }
    
    setLoading(true);
    try {
      const expenseAmount = parseFloat(amount);
      
      // Create expense in Firestore - include category
      const expenseId = await createExpense({
        tripId: id,
        title: title.trim(),
        amount: expenseAmount,
        currency,
        paidBy,
        category, // Add the selected category
      });

      // Create expense shares for selected members
      const selectedMembers = members.filter((m) => m.selected);
      if (selectedMembers.length > 0) {
        const shareAmount = expenseAmount / selectedMembers.length;
        
        await Promise.all(
          selectedMembers.map((member) =>
            createExpenseShare({
              expenseId,
              userId: member.id,
              shareAmount,
            })
          )
        );
      }

      // Notify collaborators about the new expense
      const formattedAmount = `${currency} ${expenseAmount.toFixed(2)}`;
      notifyExpenseAdded(
        id,
        trip?.title || 'Trip',
        expenseId,
        title.trim(),
        formattedAmount,
        user.id,
        user.name
      ).catch(console.error); // Don't block on notification

      // Refresh usage counts
      await refreshUsage();

      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMembersCount = members.filter(m => m.selected).length;
  const perPersonAmount = amount && selectedMembersCount > 0 
    ? (parseFloat(amount) / selectedMembersCount).toFixed(2)
    : '0.00';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Expense Limit Reached"
        message={`You've used ${usage?.expenseCount || 0} of ${limits.maxExpensesPerTrip} expenses for this trip.`}
        currentUsage={usage?.expenseCount}
        limit={limits.maxExpensesPerTrip}
        requiredPlan="pro"
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header with centralized top padding */}
        <View style={[styles.header, { paddingTop: topMargin }]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Expense</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Limit Warning */}
          {limits.maxExpensesPerTrip !== Infinity && usage && (
            <LimitWarning
              current={usage.expenseCount}
              limit={limits.maxExpensesPerTrip}
              type="expenses"
            />
          )}
          
          {/* Amount Input - Improved visibility */}
          <View style={[styles.amountSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>
              Amount ({currency})
            </Text>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>
                {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'}
              </Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (errors.amount) setErrors({ ...errors, amount: undefined });
                }}
                keyboardType="decimal-pad"
                style={[styles.amountInputText, { color: colors.text }]}
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount}</Text>
            )}
          </View>

          {/* Title/Description - Improved spacing */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: errors.title ? Colors.error : colors.border }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
              <TextInput
                placeholder="What was this expense for?"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({ ...errors, title: undefined });
                }}
                style={[styles.textInput, { color: colors.text }]}
              />
            </View>
            {errors.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: category === cat.id ? cat.color + '15' : colors.card,
                      borderColor: category === cat.id ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={category === cat.id ? cat.color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: category === cat.id ? cat.color : colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Paid By */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Paid By</Text>
            {collaboratorsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading members...</Text>
              </View>
            ) : collaboratorsError ? (
              <Text style={[styles.errorTextSmall, { color: Colors.error }]}>
                Error loading members. Please try again.
              </Text>
            ) : (
              <View style={styles.paidByOptions}>
                {members.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.paidByOption,
                      {
                        backgroundColor: paidBy === member.id ? Colors.primary + '15' : colors.card,
                        borderColor: paidBy === member.id ? Colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPaidBy(member.id)}
                  >
                    <View style={[
                      styles.paidByAvatar, 
                      { backgroundColor: paidBy === member.id ? Colors.primary : colors.textMuted }
                    ]}>
                      <Text style={styles.paidByAvatarText}>{member.name.charAt(0)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.paidByName,
                        { color: paidBy === member.id ? Colors.primary : colors.text },
                      ]}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Split Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Type</Text>
            {SPLIT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.splitOption,
                  {
                    backgroundColor: splitType === type.id ? Colors.primary + '10' : colors.card,
                    borderColor: splitType === type.id ? Colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSplitType(type.id)}
              >
                <View style={[
                  styles.splitIcon,
                  { backgroundColor: splitType === type.id ? Colors.primary + '20' : colors.backgroundSecondary },
                ]}>
                  <Ionicons
                    name={type.icon}
                    size={20}
                    color={splitType === type.id ? Colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.splitContent}>
                  <Text style={[
                    styles.splitLabel,
                    { color: splitType === type.id ? Colors.primary : colors.text },
                  ]}>{type.label}</Text>
                  <Text style={[styles.splitDescription, { color: colors.textSecondary }]}>
                    {type.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  { borderColor: splitType === type.id ? Colors.primary : colors.border },
                ]}>
                  {splitType === type.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Split Among */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Split Among</Text>
              <Text style={[styles.perPersonLabel, { color: Colors.primary }]}>
                {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'}{perPersonAmount} each
              </Text>
            </View>
            <View style={styles.membersContainer}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberOption,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => toggleMember(member.id)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: Colors.primary + '20' }]}>
                    <Text style={[styles.memberAvatarText, { color: Colors.primary }]}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                  <View style={[
                    styles.checkbox,
                    { 
                      backgroundColor: member.selected ? Colors.primary : 'transparent',
                      borderColor: member.selected ? Colors.primary : colors.border,
                    },
                  ]}>
                    {member.selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { backgroundColor: colors.background, paddingBottom: bottom + Spacing.md }]}>
          <Button
            title="Save Expense"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="lg"
            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: Spacing['2xl'],
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  currencyLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.md,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    marginRight: Spacing.xs,
  },
  amountInputText: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    minWidth: 150,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  perPersonLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.xs,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  errorTextSmall: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSizes.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  paidByOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  paidByOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  paidByAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidByAvatarText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  paidByName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  splitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  splitIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitContent: {
    flex: 1,
  },
  splitLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  splitDescription: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  membersContainer: {
    marginTop: Spacing.sm,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  memberName: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
