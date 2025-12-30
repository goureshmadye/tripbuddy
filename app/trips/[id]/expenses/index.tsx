import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTripCollaborators, useTripExpenses } from '@/hooks/use-trips';
import { Expense, User } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activities' | 'shopping' | 'other';

const { width } = Dimensions.get('window');

type ExpenseWithDetails = Expense & { paidByName: string; category: ExpenseCategory };

const CATEGORY_CONFIG: Record<ExpenseCategory | string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  food: { icon: 'restaurant-outline', color: '#F97316', label: 'Food' },
  transport: { icon: 'car-outline', color: Colors.primary, label: 'Transport' },
  accommodation: { icon: 'bed-outline', color: Colors.secondary, label: 'Stay' },
  activities: { icon: 'ticket-outline', color: '#8B5CF6', label: 'Activities' },
  shopping: { icon: 'bag-outline', color: '#EC4899', label: 'Shopping' },
  other: { icon: 'ellipsis-horizontal-outline', color: '#64748B', label: 'Other' },
};

interface Balance {
  userId: string;
  name: string;
  balance: number;
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Fetch expenses and collaborators from Firestore
  const { expenses: rawExpenses, totalExpenses, loading: expensesLoading, error: expensesError } = useTripExpenses(id);
  const { collaborators, loading: collaboratorsLoading, error: collaboratorsError } = useTripCollaborators(id);

  const [activeTab, setActiveTab] = useState<'all' | 'balances'>('all');
  const [splitSummaryVisible, setSplitSummaryVisible] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<{ from: string; to: string; amount: number } | null>(null);

  const loading = expensesLoading || collaboratorsLoading;
  const error = expensesError || collaboratorsError;

  // Map collaborators to a lookup for names
  const collaboratorMap = useMemo(() => {
    const map: Record<string, User> = {};
    collaborators.forEach((c) => {
      if (c.user) {
        map[c.userId] = c.user;
      }
    });
    return map;
  }, [collaborators]);

  // Transform raw expenses to include paidByName and category
  const expenses: ExpenseWithDetails[] = useMemo(() => {
    return rawExpenses.map((expense) => ({
      ...expense,
      paidByName: collaboratorMap[expense.paidBy]?.name || 'Unknown',
      category: (expense as any).category || 'other',
    }));
  }, [rawExpenses, collaboratorMap]);

  // Calculate balances from expenses
  const balances: Balance[] = useMemo(() => {
    if (collaborators.length === 0 || expenses.length === 0) return [];

    // Calculate total paid by each person
    const paidByPerson: Record<string, number> = {};
    expenses.forEach((expense) => {
      paidByPerson[expense.paidBy] = (paidByPerson[expense.paidBy] || 0) + expense.amount;
    });

    // For simplicity, assume equal split among all collaborators
    const perPersonShare = totalExpenses / collaborators.length;

    // Calculate balance: amount paid - amount owed
    return collaborators
      .filter((c) => c.user)
      .map((c) => ({
        userId: c.userId,
        name: c.user!.name,
        balance: (paidByPerson[c.userId] || 0) - perPersonShare,
      }));
  }, [collaborators, expenses, totalExpenses]);

  // Calculate number of people for display
  const peopleCount = collaborators.length || 1;
  
  const getCategoryConfig = (category?: string | null) => {
    return CATEGORY_CONFIG[category || 'other'] || CATEGORY_CONFIG.other;
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  const handleAddExpense = () => {
    router.push(`/trips/${id}/expenses/add`);
  };

  const handleSettleWithGooglePay = async () => {
    if (!selectedSettlement) return;
    
    // Open Google Pay deep link (this would need to be customized based on the actual implementation)
    const gpayUrl = `gpay://upi/pay?pa=recipient@upi&pn=${selectedSettlement.to}&am=${selectedSettlement.amount}&cu=EUR`;
    
    try {
      const supported = await Linking.canOpenURL(gpayUrl);
      if (supported) {
        await Linking.openURL(gpayUrl);
      } else {
        Alert.alert(
          'Google Pay Not Available',
          'Google Pay is not installed on your device. Would you like to record this as settled manually?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Mark as Settled', 
              onPress: () => {
                Alert.alert('Settled', 'Payment marked as settled.');
                setSettleModalVisible(false);
              }
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open payment app.');
    }
  };

  const openSettleModal = (from: string, to: string, amount: number) => {
    setSelectedSettlement({ from, to, amount });
    setSettleModalVisible(true);
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const dateKey = formatDate(expense.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(expense);
    return acc;
  }, {} as Record<string, typeof expenses>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expenses</Text>
        <TouchableOpacity
          onPress={handleAddExpense}
          style={[styles.addButton, { backgroundColor: Colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: Colors.primary }, Shadows.md]}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <View style={styles.summaryBadge}>
            <Ionicons name="people" size={14} color={Colors.primary} />
            <Text style={styles.summaryBadgeText}>{peopleCount} {peopleCount === 1 ? 'person' : 'people'}</Text>
          </View>
        </View>
        <Text style={styles.summaryAmount}>{formatCurrency(totalExpenses)}</Text>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{expenses.length}</Text>
            <Text style={styles.summaryStatLabel}>Transactions</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{formatCurrency(totalExpenses / peopleCount)}</Text>
            <Text style={styles.summaryStatLabel}>Per Person</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'all' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'all' ? Colors.primary : colors.textSecondary },
          ]}>All Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'balances' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'balances' ? Colors.primary : colors.textSecondary },
          ]}>Balances</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setSplitSummaryVisible(true)}
        >
          <Ionicons name="pie-chart-outline" size={18} color={Colors.primary} />
          <Text style={[styles.quickActionText, { color: Colors.primary }]}>Split Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setActiveTab('balances')}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={Colors.secondary} />
          <Text style={[styles.quickActionText, { color: Colors.secondary }]}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading expenses...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <EmptyState
          icon="alert-circle-outline"
          title="Error loading expenses"
          description={error.message || 'Something went wrong. Please try again.'}
          actionLabel="Retry"
          onAction={() => router.replace(`/trips/${id}/expenses`)}
        />
      )}

      {!loading && !error && (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'all' ? (
          expenses.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No expenses yet"
              description="Track your trip spending and split costs with your travel buddies."
              actionLabel="Add Expense"
              onAction={handleAddExpense}
            />
          ) : (
            Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{date}</Text>
                {dateExpenses.map((expense) => {
                  const config = getCategoryConfig((expense as any).category);
                  return (
                    <TouchableOpacity
                      key={expense.id}
                      style={[styles.expenseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.expenseIcon, { backgroundColor: config.color + '15' }]}>
                        <Ionicons name={config.icon} size={24} color={config.color} />
                      </View>
                      <View style={styles.expenseContent}>
                        <Text style={[styles.expenseTitle, { color: colors.text }]}>{expense.title}</Text>
                        <Text style={[styles.expensePaidBy, { color: colors.textSecondary }]}>
                          Paid by {expense.paidByName}
                        </Text>
                      </View>
                      <Text style={[styles.expenseAmount, { color: colors.text }]}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )
        ) : (
          // Balances View
          <View style={styles.balancesView}>
            <Text style={[styles.balancesInfo, { color: colors.textSecondary }]}>
              These are the settlements needed to balance the trip expenses.
            </Text>
            {balances.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="No Balances"
                description="Add expenses to see how costs are split between members."
              />
            ) : (
            balances.map((person) => (
              <View
                key={person.userId}
                style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.balanceAvatar, { backgroundColor: Colors.primary + '20' }]}>
                  <Text style={[styles.balanceAvatarText, { color: Colors.primary }]}>
                    {person.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.balanceContent}>
                  <Text style={[styles.balanceName, { color: colors.text }]}>{person.name}</Text>
                  <Text style={[
                    styles.balanceStatus,
                    { color: person.balance >= 0 ? Colors.secondary : Colors.error },
                  ]}>
                    {person.balance >= 0 ? 'gets back' : 'owes'}
                  </Text>
                </View>
                <Text style={[
                  styles.balanceAmount,
                  { color: person.balance >= 0 ? Colors.secondary : Colors.error },
                ]}>
                  {person.balance >= 0 ? '+' : ''}{formatCurrency(person.balance)}
                </Text>
              </View>
            ))
            )}

            {/* Settlement Suggestions */}
            <View style={styles.settlementsSection}>
              <Text style={[styles.settlementsTitle, { color: colors.text }]}>Suggested Settlements</Text>
              <TouchableOpacity 
                style={[styles.settlementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openSettleModal('Mike', 'John', 125)}
              >
                <View style={styles.settlementParties}>
                  <View style={[styles.settlementAvatar, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.settlementAvatarText, { color: Colors.error }]}>M</Text>
                  </View>
                  <View style={styles.settlementArrow}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                    <Text style={[styles.settlementAmountSmall, { color: colors.text }]}>€125</Text>
                  </View>
                  <View style={[styles.settlementAvatar, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.settlementAvatarText, { color: Colors.secondary }]}>J</Text>
                  </View>
                </View>
                <Text style={[styles.settlementText, { color: colors.textSecondary }]}>
                  Mike pays John €125.00
                </Text>
                <View style={styles.settleButtonRow}>
                  <TouchableOpacity 
                    style={[styles.settleButton, { backgroundColor: '#4285F4' }]}
                    onPress={() => openSettleModal('Mike', 'John', 125)}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.settleButtonText}>Settle with GPay</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.settlementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openSettleModal('Sarah', 'John', 57.50)}
              >
                <View style={styles.settlementParties}>
                  <View style={[styles.settlementAvatar, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.settlementAvatarText, { color: Colors.error }]}>S</Text>
                  </View>
                  <View style={styles.settlementArrow}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                    <Text style={[styles.settlementAmountSmall, { color: colors.text }]}>€57.50</Text>
                  </View>
                  <View style={[styles.settlementAvatar, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.settlementAvatarText, { color: Colors.secondary }]}>J</Text>
                  </View>
                </View>
                <Text style={[styles.settlementText, { color: colors.textSecondary }]}>
                  Sarah pays John €57.50
                </Text>
                <View style={styles.settleButtonRow}>
                  <TouchableOpacity 
                    style={[styles.settleButton, { backgroundColor: '#4285F4' }]}
                    onPress={() => openSettleModal('Sarah', 'John', 57.50)}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.settleButtonText}>Settle with GPay</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      )}

      {/* Split Summary Modal */}
      <Modal
        visible={splitSummaryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSplitSummaryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Split Summary</Text>
              <TouchableOpacity onPress={() => setSplitSummaryVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.splitSummaryContent}>
              <View style={[styles.splitSummaryCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.splitSummaryLabel, { color: colors.textSecondary }]}>Total Trip Cost</Text>
                <Text style={[styles.splitSummaryAmount, { color: colors.text }]}>{formatCurrency(totalExpenses)}</Text>
              </View>

              <View style={[styles.splitSummaryCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.splitSummaryLabel, { color: colors.textSecondary }]}>Per Person ({peopleCount} {peopleCount === 1 ? 'person' : 'people'})</Text>
                <Text style={[styles.splitSummaryAmount, { color: colors.text }]}>{formatCurrency(totalExpenses / peopleCount)}</Text>
              </View>

              <View style={styles.categoryBreakdown}>
                <Text style={[styles.categoryBreakdownTitle, { color: colors.text }]}>By Category</Text>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const categoryTotal = expenses
                    .filter(e => (e as any).category === key)
                    .reduce((sum, e) => sum + e.amount, 0);
                  if (categoryTotal === 0) return null;
                  return (
                    <View key={key} style={styles.categoryRow}>
                      <View style={styles.categoryInfo}>
                        <View style={[styles.categoryDot, { backgroundColor: config.color }]} />
                        <Text style={[styles.categoryName, { color: colors.text }]}>{config.label}</Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatCurrency(categoryTotal)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settle with Google Pay Modal */}
      <Modal
        visible={settleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Settle Payment</Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedSettlement && (
              <View style={styles.settleContent}>
                <View style={styles.settleParties}>
                  <View style={[styles.settleAvatar, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.settleAvatarText, { color: Colors.error }]}>{selectedSettlement.from.charAt(0)}</Text>
                  </View>
                  <View style={styles.settleArrowLarge}>
                    <Ionicons name="arrow-forward" size={24} color={colors.textMuted} />
                  </View>
                  <View style={[styles.settleAvatar, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.settleAvatarText, { color: Colors.secondary }]}>{selectedSettlement.to.charAt(0)}</Text>
                  </View>
                </View>

                <Text style={[styles.settleAmountLarge, { color: colors.text }]}>
                  {formatCurrency(selectedSettlement.amount)}
                </Text>
                <Text style={[styles.settleDescription, { color: colors.textSecondary }]}>
                  {selectedSettlement.from} pays {selectedSettlement.to}
                </Text>

                <TouchableOpacity
                  style={[styles.googlePayButton]}
                  onPress={handleSettleWithGooglePay}
                >
                  <Ionicons name="wallet" size={20} color="#FFFFFF" />
                  <Text style={styles.googlePayButtonText}>Pay with Google Pay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.markSettledButton, { borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert('Settled', 'Payment marked as settled.');
                    setSettleModalVisible(false);
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.secondary} />
                  <Text style={[styles.markSettledText, { color: Colors.secondary }]}>Mark as Settled</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg]}
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  summaryBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  summaryAmount: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
  summaryStatLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl + Spacing.xl,
  },
  dateGroup: {
    marginBottom: Spacing.md,
  },
  dateHeader: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseContent: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  expensePaidBy: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  balancesView: {
    paddingTop: Spacing.sm,
  },
  balancesInfo: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  balanceAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAvatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  balanceContent: {
    flex: 1,
  },
  balanceName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  balanceStatus: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  settlementsSection: {
    marginTop: Spacing.lg,
  },
  settlementsTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  settlementCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  settlementParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settlementAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  settlementArrow: {
    alignItems: 'center',
    gap: 2,
  },
  settlementAmountSmall: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  settlementText: {
    fontSize: FontSizes.sm,
  },
  settleButtonRow: {
    marginTop: Spacing.sm,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  splitSummaryContent: {
    gap: Spacing.md,
  },
  splitSummaryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  splitSummaryLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  splitSummaryAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  categoryBreakdown: {
    marginTop: Spacing.md,
  },
  categoryBreakdownTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  categoryName: {
    fontSize: FontSizes.md,
  },
  categoryAmount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  settleContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  settleParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settleAvatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleAvatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  settleArrowLarge: {
    padding: Spacing.sm,
  },
  settleAmountLarge: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  settleDescription: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.xl,
  },
  googlePayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#4285F4',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    marginBottom: Spacing.md,
  },
  googlePayButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  markSettledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    width: '100%',
  },
  markSettledText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
