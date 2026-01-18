import {
    ScreenContainer,
    useScreenPadding,
} from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    useTrip,
    useTripCollaborators,
    useTripExpenses,
} from "@/hooks/use-trips";
import { updateUser } from "@/services/firestore";
import { Expense, User } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "activities"
  | "shopping"
  | "other";

type ExpenseWithDetails = Expense & {
  paidByName: string;
  category: ExpenseCategory;
};

const CATEGORY_CONFIG: Record<
  ExpenseCategory | string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  food: { icon: "restaurant", color: "#F97316", label: "Food" },
  transport: { icon: "car", color: Colors.primary, label: "Transport" },
  accommodation: { icon: "bed", color: Colors.secondary, label: "Stay" },
  activities: { icon: "ticket", color: "#8B5CF6", label: "Activities" },
  shopping: { icon: "bag", color: "#EC4899", label: "Shopping" },
  other: { icon: "ellipsis-horizontal", color: "#64748B", label: "Other" },
};

interface Balance {
  userId: string;
  name: string;
  balance: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  config: (typeof CATEGORY_CONFIG)[string];
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { bottom } = useScreenPadding();

  // Auth and user data
  const { user } = useAuth();

  // Fetch trip, expenses and collaborators from Firestore
  const { trip, loading: tripLoading } = useTrip(id);
  const {
    expenses: rawExpenses,
    totalExpenses,
    loading: expensesLoading,
    error: expensesError,
  } = useTripExpenses(id);
  const {
    collaborators,
    loading: collaboratorsLoading,
    error: collaboratorsError,
  } = useTripCollaborators(id);

  // Get currency - prefer trip currency, fall back to user's default currency
  const currency = trip?.currency || user?.defaultCurrency || "USD";

  const [activeTab, setActiveTab] = useState<"all" | "balances">("all");
  const [splitSummaryVisible, setSplitSummaryVisible] = useState(false);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(true);

  // QR Code & UPI State
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [qrAmount, setQrAmount] = useState(0);
  const [newUpiId, setNewUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  // Include tripLoading in the loading state
  const loading = tripLoading || expensesLoading || collaboratorsLoading;
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
      paidByName: collaboratorMap[expense.paidBy]?.name || "Unknown",
      category: (expense as any).category || "other",
    }));
  }, [rawExpenses, collaboratorMap]);

  // Calculate category spending breakdown
  const categorySpending: CategorySpending[] = useMemo(() => {
    if (expenses.length === 0 || totalExpenses === 0) return [];

    const spendingByCategory: Record<string, number> = {};

    expenses.forEach((expense) => {
      const cat = expense.category || "other";
      spendingByCategory[cat] = (spendingByCategory[cat] || 0) + expense.amount;
    });

    return Object.entries(spendingByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalExpenses) * 100,
        config: CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpenses]);

  // Calculate balances from expenses
  const balances: Balance[] = useMemo(() => {
    if (collaborators.length === 0 || expenses.length === 0) return [];

    // Calculate total paid by each person
    const paidByPerson: Record<string, number> = {};
    expenses.forEach((expense) => {
      paidByPerson[expense.paidBy] =
        (paidByPerson[expense.paidBy] || 0) + expense.amount;
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
    return CATEGORY_CONFIG[category || "other"] || CATEGORY_CONFIG.other;
  };

  const formatCurrency = (amount: number) => {
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    // Return with currency code
    return `${amount < 0 ? "-" : ""}${currency} ${formattedAmount}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleAddExpense = () => {
    router.push(`/trips/${id}/expenses/add`);
  };

  const openGPayScanner = async () => {
    try {
      // Try opening Google Pay Scanner (Tez) - common in India/Asia
      // Scheme: tez://upi/scan
      const gPayScheme = "tez://upi/scan";
      const canOpen = await Linking.canOpenURL(gPayScheme);

      if (canOpen) {
        await Linking.openURL(gPayScheme);
      } else {
        // Fallback: try generic UPI scan
        const upiScheme = "upi://scan";
        const canOpenUpi = await Linking.canOpenURL(upiScheme);

        if (canOpenUpi) {
          await Linking.openURL(upiScheme);
        } else {
          Alert.alert(
            "Scanner Not Available",
            "Could not find Google Pay or a supported UPI app to open the scanner.",
          );
        }
      }
    } catch (err) {
      console.error("Error opening scanner:", err);
      Alert.alert("Error", "Failed to open payment app.");
    }
  };

  const handleBalancePress = async (person: Balance) => {
    if (!user) return;

    const isMe = person.userId === user.id;
    const isDebtor = person.balance < 0;

    // Case 1: I owe money (and I tapped myself) -> PAY
    if (isMe && isDebtor) {
      await openGPayScanner();
      return;
    }

    // Case 2: Someone else owes money, and I am a creditor -> COLLECT
    // Check if I am a creditor (positive balance)
    const myBalanceEntry = balances.find((b) => b.userId === user.id);
    const amICreditor = (myBalanceEntry?.balance || 0) > 0;

    if (!isMe && isDebtor && amICreditor) {
      // Logic: Show MY QR code for them to scan
      // Amount: The exact amount they owe (absolute value)

      if (!user.upiId) {
        // Prompt to set UPI ID first
        setQrAmount(Math.abs(person.balance)); // Store for later
        setNewUpiId("");
        setUpiModalVisible(true);
      } else {
        setQrAmount(Math.abs(person.balance));
        setQrModalVisible(true);
      }
    }
  };

  const saveUpiId = async () => {
    if (!newUpiId.trim() || !newUpiId.includes("@")) {
      Alert.alert("Invalid ID", "Please enter a valid UPI ID (e.g., name@upi)");
      return;
    }

    setSavingUpi(true);
    try {
      if (user) {
        await updateUser(user.id, { upiId: newUpiId.trim() });
        setUpiModalVisible(false);
        // Show QR modal after saving (local state update handled by firestore listener)
        setTimeout(() => setQrModalVisible(true), 500);
      }
    } catch (err) {
      console.error("Failed to save UPI ID:", err);
      Alert.alert("Error", "Failed to save UPI ID");
    } finally {
      setSavingUpi(false);
    }
  };

  const getQrData = () => {
    if (!user?.upiId) return "";
    // UPI URL format
    return `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.name)}&am=${qrAmount.toFixed(2)}&cu=INR&tn=TripBuddy%20Settlement`;
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce(
    (acc, expense) => {
      const dateKey = formatDate(expense.createdAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(expense);
      return acc;
    },
    {} as Record<string, typeof expenses>,
  );

  // Render category spending breakdown
  const renderCategoryBreakdown = () => {
    if (categorySpending.length === 0) return null;

    return (
      <View
        style={[
          styles.categoryBreakdownCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.categoryBreakdownHeader}
          onPress={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
        >
          <View style={styles.categoryBreakdownTitleRow}>
            <Ionicons name="pie-chart" size={20} color={Colors.primary} />
            <Text
              style={[styles.categoryBreakdownTitle, { color: colors.text }]}
            >
              Spending by Category
            </Text>
          </View>
          <Ionicons
            name={showCategoryBreakdown ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showCategoryBreakdown && (
          <>
            {/* Visual Bar Chart */}
            <View style={styles.categoryBarsContainer}>
              {categorySpending.map((item) => (
                <View key={item.category} style={styles.categoryBarRow}>
                  <View style={styles.categoryBarLabel}>
                    <View
                      style={[
                        styles.categoryBarIcon,
                        { backgroundColor: item.config.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={item.config.icon}
                        size={16}
                        color={item.config.color}
                      />
                    </View>
                    <Text
                      style={[styles.categoryBarName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.config.label}
                    </Text>
                  </View>
                  <View style={styles.categoryBarWrapper}>
                    <View
                      style={[
                        styles.categoryBarBackground,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            backgroundColor: item.config.color,
                            width: `${Math.max(item.percentage, 2)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryBarPercent,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <Text
                    style={[styles.categoryBarAmount, { color: colors.text }]}
                  >
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Category Pills Summary */}
            <View style={styles.categoryPillsContainer}>
              {categorySpending.slice(0, 4).map((item) => (
                <View
                  key={item.category}
                  style={[
                    styles.categoryPill,
                    { backgroundColor: item.config.color + "15" },
                  ]}
                >
                  <Ionicons
                    name={item.config.icon}
                    size={14}
                    color={item.config.color}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: item.config.color },
                    ]}
                  >
                    {item.config.label}: {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer
      style={{ ...styles.container, backgroundColor: colors.background }}
      padded={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Expenses
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Summary Card - Only render when trip data is loaded */}
      {tripLoading ? (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: Colors.primary },
            Shadows.md,
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
          </View>
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={{ marginVertical: Spacing.md }}
          />
        </View>
      ) : (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: Colors.primary },
            Shadows.md,
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <View style={styles.summaryBadge}>
              <Ionicons name="people" size={14} color={Colors.primary} />
              <Text style={styles.summaryBadgeText}>
                {peopleCount} {peopleCount === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryAmount}>
            {formatCurrency(totalExpenses)}
          </Text>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{expenses.length}</Text>
              <Text style={styles.summaryStatLabel}>Transactions</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>
                {formatCurrency(totalExpenses / peopleCount)}
              </Text>
              <Text style={styles.summaryStatLabel}>Per Person</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "all" && {
              borderBottomColor: Colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "all" ? Colors.primary : colors.textSecondary,
              },
            ]}
          >
            All Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "balances" && {
              borderBottomColor: Colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("balances")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "balances"
                    ? Colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            Balances
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => setSplitSummaryVisible(true)}
        >
          <Ionicons name="pie-chart-outline" size={18} color={Colors.primary} />
          <Text style={[styles.quickActionText, { color: Colors.primary }]}>
            Split Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => setActiveTab("balances")}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={Colors.secondary}
          />
          <Text style={[styles.quickActionText, { color: Colors.secondary }]}>
            Settle Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading expenses...
          </Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <EmptyState
          icon="alert-circle-outline"
          title="Error loading expenses"
          description={
            error.message || "Something went wrong. Please try again."
          }
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
          {activeTab === "all" ? (
            expenses.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No expenses yet"
                description="Track your trip spending and split costs with your travel buddies."
                actionLabel="Add Expense"
                onAction={handleAddExpense}
              />
            ) : (
              <>
                {/* Category Breakdown Visualization */}
                {renderCategoryBreakdown()}

                {/* Expenses List */}
                {Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
                  <View key={date} style={styles.dateGroup}>
                    <Text
                      style={[
                        styles.dateHeader,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {date}
                    </Text>
                    {dateExpenses.map((expense) => {
                      const config = getCategoryConfig(expense.category);
                      return (
                        <TouchableOpacity
                          key={expense.id}
                          style={[
                            styles.expenseCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.expenseIcon,
                              { backgroundColor: config.color + "15" },
                            ]}
                          >
                            <Ionicons
                              name={config.icon}
                              size={24}
                              color={config.color}
                            />
                          </View>
                          <View style={styles.expenseContent}>
                            <Text
                              style={[
                                styles.expenseTitle,
                                { color: colors.text },
                              ]}
                            >
                              {expense.title}
                            </Text>
                            <View style={styles.expenseMetaRow}>
                              <View
                                style={[
                                  styles.expenseCategoryBadge,
                                  { backgroundColor: config.color + "10" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.expenseCategoryText,
                                    { color: config.color },
                                  ]}
                                >
                                  {config.label}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.expensePaidBy,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                • {expense.paidByName}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.expenseAmount,
                              { color: colors.text },
                            ]}
                          >
                            {formatCurrency(expense.amount)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </>
            )
          ) : (
            // Balances View
            <View style={styles.balancesView}>
              <Text
                style={[styles.balancesInfo, { color: colors.textSecondary }]}
              >
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
                    style={[
                      styles.balanceCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.balanceAvatar,
                        { backgroundColor: Colors.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.balanceAvatarText,
                          { color: Colors.primary },
                        ]}
                      >
                        {person.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.balanceContent}>
                      <Text
                        style={[styles.balanceName, { color: colors.text }]}
                      >
                        {person.name}
                      </Text>
                      <Text
                        style={[
                          styles.balanceStatus,
                          {
                            color:
                              person.balance >= 0
                                ? Colors.secondary
                                : Colors.error,
                          },
                        ]}
                      >
                        {person.balance >= 0 ? "gets back" : "owes"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleBalancePress(person)}
                      activeOpacity={person.balance < 0 ? 0.7 : 1}
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {person.balance < 0 && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: Colors.error,
                            marginRight: 8,
                          }}
                        >
                          {person.userId === user?.id ? "Pay" : "Collect"}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.balanceAmount,
                          {
                            color:
                              person.balance >= 0
                                ? Colors.secondary
                                : Colors.error,
                            textDecorationLine:
                              person.balance < 0 ? "underline" : "none",
                          },
                        ]}
                      >
                        {person.balance >= 0 ? "+" : ""}
                        {formatCurrency(person.balance)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* UPI ID Modal */}
      <Modal
        visible={upiModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setUpiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background, padding: Spacing.lg },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Setup Payments
            </Text>
            <Text
              style={{ color: colors.textSecondary, marginBottom: Spacing.md }}
            >
              To collect money via QR code, please enter your UPI ID (Google
              Pay, PhonePe, etc.).
            </Text>

            <Input
              placeholder="e.g. username@oksbi"
              value={newUpiId}
              onChangeText={setNewUpiId}
              autoCapitalize="none"
              label="UPI ID"
            />

            <View
              style={{
                flexDirection: "row",
                gap: Spacing.md,
                marginTop: Spacing.lg,
              }}
            >
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setUpiModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={saveUpiId}
                loading={savingUpi}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                alignItems: "center",
                padding: Spacing["2xl"],
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, marginBottom: Spacing.sm },
              ]}
            >
              Scan to Pay
            </Text>
            <Text
              style={{ color: colors.textSecondary, marginBottom: Spacing.xl }}
            >
              Ask your friend to scan this QR code
            </Text>

            <View
              style={{
                padding: Spacing.lg,
                backgroundColor: "white",
                borderRadius: BorderRadius.xl,
                ...Shadows.md,
              }}
            >
              {user?.upiId && <QRCode value={getQrData()} size={200} />}
            </View>

            <Text
              style={{
                fontSize: FontSizes.display,
                fontWeight: FontWeights.bold,
                color: Colors.primary,
                marginTop: Spacing.xl,
              }}
            >
              {formatCurrency(qrAmount)}
            </Text>

            <Text
              style={{
                color: colors.textSecondary,
                marginTop: Spacing.xs,
                marginBottom: Spacing["2xl"],
              }}
            >
              to {user?.name}
            </Text>

            <Button
              title="Close"
              variant="outline"
              fullWidth
              onPress={() => setQrModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Split Summary Modal */}
      <Modal
        visible={splitSummaryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSplitSummaryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Split Summary
              </Text>
              <TouchableOpacity onPress={() => setSplitSummaryVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.splitSummaryContent}>
              <View
                style={[
                  styles.splitSummaryCard,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.splitSummaryLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Total Trip Cost
                </Text>
                <Text
                  style={[styles.splitSummaryAmount, { color: colors.text }]}
                >
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>

              <View
                style={[
                  styles.splitSummaryCard,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.splitSummaryLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Per Person ({peopleCount}{" "}
                  {peopleCount === 1 ? "person" : "people"})
                </Text>
                <Text
                  style={[styles.splitSummaryAmount, { color: colors.text }]}
                >
                  {formatCurrency(totalExpenses / peopleCount)}
                </Text>
              </View>

              <View style={styles.modalCategoryBreakdown}>
                <Text
                  style={[
                    styles.modalCategoryBreakdownTitle,
                    { color: colors.text },
                  ]}
                >
                  By Category
                </Text>
                {categorySpending.map((item) => (
                  <View key={item.category} style={styles.modalCategoryRow}>
                    <View style={styles.modalCategoryInfo}>
                      <View
                        style={[
                          styles.modalCategoryIcon,
                          { backgroundColor: item.config.color + "20" },
                        ]}
                      >
                        <Ionicons
                          name={item.config.icon}
                          size={18}
                          color={item.config.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.modalCategoryName,
                          { color: colors.text },
                        ]}
                      >
                        {item.config.label}
                      </Text>
                    </View>
                    <View style={styles.modalCategoryAmountContainer}>
                      <Text
                        style={[
                          styles.modalCategoryAmount,
                          { color: colors.text },
                        ]}
                      >
                        {formatCurrency(item.amount)}
                      </Text>
                      <Text
                        style={[
                          styles.modalCategoryPercent,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg, { bottom: bottom + Spacing.md }]}
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing.md,
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
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: "rgba(255,255,255,0.8)",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    color: "#FFFFFF",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: Spacing.md,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: "#FFFFFF",
  },
  summaryStatLabel: {
    fontSize: FontSizes.xs,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  tabText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    paddingBottom: Spacing["3xl"] + Spacing.xl,
  },
  // Category Breakdown Card Styles
  categoryBreakdownCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  categoryBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  categoryBreakdownTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryBreakdownTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  categoryBarsContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  categoryBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  categoryBarLabel: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
    gap: Spacing.xs,
  },
  categoryBarIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBarName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    flex: 1,
  },
  categoryBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  categoryBarPercent: {
    fontSize: FontSizes.xs,
    width: 32,
    textAlign: "right",
  },
  categoryBarAmount: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    width: 80,
    textAlign: "right",
  },
  categoryPillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  categoryPillText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  // Expense Card Styles
  dateGroup: {
    marginBottom: Spacing.md,
  },
  dateHeader: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  expenseContent: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  expenseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  expenseCategoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  expenseCategoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  expensePaidBy: {
    fontSize: FontSizes.sm,
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
    textAlign: "center",
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
  },
  settlementParties: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settlementAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  settlementAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  settlementArrow: {
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  settleButtonText: {
    color: "#FFFFFF",
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xlarge,
    borderTopRightRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    alignItems: "center",
  },
  splitSummaryLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  splitSummaryAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  // Modal Category Breakdown Styles
  modalCategoryBreakdown: {
    marginTop: Spacing.md,
  },
  modalCategoryBreakdownTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  modalCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  modalCategoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modalCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCategoryName: {
    fontSize: FontSizes.md,
  },
  modalCategoryAmountContainer: {
    alignItems: "flex-end",
  },
  modalCategoryAmount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  modalCategoryPercent: {
    fontSize: FontSizes.xs,
  },
  settleContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  settleParties: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settleAvatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#4285F4",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.large,
    width: "100%",
    marginBottom: Spacing.md,
  },
  googlePayButtonText: {
    color: "#FFFFFF",
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  markSettledButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    width: "100%",
  },
  markSettledText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
