import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
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

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [splitType, setSplitType] = useState<ExpenseSplitType>('equal');
  const [paidBy, setPaidBy] = useState('user1');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  const toggleMember = (memberId: string) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, selected: !m.selected } : m
    ));
  };

  const handleSave = async () => {
    const newErrors: { title?: string; amount?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Enter a valid amount';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      // TODO: Save to Firestore
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.back();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMembersCount = members.filter(m => m.selected).length;
  const perPersonAmount = amount && selectedMembersCount > 0 
    ? (parseFloat(amount) / selectedMembersCount).toFixed(2)
    : '0.00';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
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
          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>{currency}</Text>
            <Input
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              error={errors.amount}
              style={styles.amountInput}
            />
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Input
              label="Description"
              placeholder="What was this expense for?"
              value={title}
              onChangeText={setTitle}
              error={errors.title}
              leftIcon="receipt-outline"
            />
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Among</Text>
              <Text style={[styles.perPersonLabel, { color: Colors.primary }]}>
                €{perPersonAmount} each
              </Text>
            </View>
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
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
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
    </SafeAreaView>
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
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
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
    paddingBottom: Spacing.xxl,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  currencyLabel: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  amountInput: {
    alignItems: 'center',
  },
  amountInputText: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
    gap: Spacing.sm,
  },
  paidByOption: {
    flex: 1,
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
