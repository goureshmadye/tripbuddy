import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAppColorScheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================
// Usage Progress Bar
// ============================================

interface UsageProgressProps {
  current: number;
  limit: number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showUpgrade?: boolean;
  compact?: boolean;
}

export function UsageProgress({
  current,
  limit,
  label,
  icon,
  showUpgrade = true,
  compact = false,
}: UsageProgressProps) {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const isUnlimited = limit === Infinity || limit > 999999;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  const getProgressColor = () => {
    if (isAtLimit) return Colors.error;
    if (isNearLimit) return Colors.warning;
    return Colors.primary;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {icon && (
          <Ionicons name={icon} size={14} color={colors.textMuted} style={styles.compactIcon} />
        )}
        <Text style={[styles.compactText, { color: colors.textSecondary }]}>
          {isUnlimited ? current : `${current} / ${limit}`}
        </Text>
        {isUnlimited && (
          <Ionicons name="infinite" size={14} color={colors.textMuted} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          {icon && (
            <Ionicons name={icon} size={18} color={colors.textSecondary} />
          )}
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </View>
        <Text style={[styles.count, { color: isAtLimit ? Colors.error : colors.textSecondary }]}>
          {isUnlimited ? (
            <>
              {current} <Ionicons name="infinite" size={14} color={colors.textMuted} />
            </>
          ) : (
            `${current} / ${limit}`
          )}
        </Text>
      </View>

      {!isUnlimited && (
        <View style={[styles.progressBackground, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${percentage}%`, backgroundColor: getProgressColor() },
            ]}
          />
        </View>
      )}

      {isAtLimit && showUpgrade && (
        <TouchableOpacity
          style={[styles.upgradeHint, { backgroundColor: Colors.primary + '10' }]}
          onPress={() => router.push('/subscription')}
        >
          <Ionicons name="diamond-outline" size={14} color={Colors.primary} />
          <Text style={[styles.upgradeHintText, { color: Colors.primary }]}>
            Upgrade for unlimited
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// Usage Summary Card
// ============================================

interface UsageSummaryProps {
  collaborators: { current: number; limit: number };
  expenses: { current: number; limit: number };
  documents: { current: number; limit: number };
  tripTitle?: string;
}

export function UsageSummary({
  collaborators,
  expenses,
  documents,
  tripTitle,
}: UsageSummaryProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const hasAnyLimit = 
    collaborators.limit !== Infinity || 
    expenses.limit !== Infinity || 
    documents.limit !== Infinity;

  const isAnyAtLimit = 
    (collaborators.limit !== Infinity && collaborators.current >= collaborators.limit) ||
    (expenses.limit !== Infinity && expenses.current >= expenses.limit) ||
    (documents.limit !== Infinity && documents.current >= documents.limit);

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tripTitle && (
        <Text style={[styles.summaryTitle, { color: colors.text }]}>{tripTitle}</Text>
      )}
      
      <View style={styles.summaryGrid}>
        <UsageSummaryItem
          icon="people-outline"
          label="Collaborators"
          current={collaborators.current}
          limit={collaborators.limit}
          colors={colors}
        />
        <UsageSummaryItem
          icon="receipt-outline"
          label="Expenses"
          current={expenses.current}
          limit={expenses.limit}
          colors={colors}
        />
        <UsageSummaryItem
          icon="document-outline"
          label="Documents"
          current={documents.current}
          limit={documents.limit}
          colors={colors}
        />
      </View>

      {hasAnyLimit && isAnyAtLimit && (
        <TouchableOpacity
          style={[styles.summaryUpgrade, { backgroundColor: Colors.primary + '10' }]}
          onPress={() => router.push('/subscription')}
        >
          <Ionicons name="rocket-outline" size={16} color={Colors.primary} />
          <Text style={[styles.summaryUpgradeText, { color: Colors.primary }]}>
            Upgrade for unlimited access
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface UsageSummaryItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  current: number;
  limit: number;
  colors: typeof Colors.light;
}

function UsageSummaryItem({ icon, label, current, limit, colors }: UsageSummaryItemProps) {
  const isUnlimited = limit === Infinity || limit > 999999;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <View style={styles.summaryItem}>
      <View style={[styles.summaryItemIcon, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.summaryItemValue}>
        <Text style={[styles.summaryItemCurrent, { color: isAtLimit ? Colors.error : colors.text }]}>
          {current}
        </Text>
        {!isUnlimited && (
          <Text style={[styles.summaryItemLimit, { color: colors.textMuted }]}>
            /{limit}
          </Text>
        )}
        {isUnlimited && (
          <Ionicons name="infinite" size={14} color={colors.textMuted} />
        )}
      </View>
    </View>
  );
}

// ============================================
// Plan Badge
// ============================================

interface PlanBadgeProps {
  plan: 'free' | 'pro' | 'teams';
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export function PlanBadge({ plan, size = 'medium', onPress }: PlanBadgeProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const getPlanColor = () => {
    switch (plan) {
      case 'pro': return Colors.primary;
      case 'teams': return '#8B5CF6'; // Purple
      default: return colors.textMuted;
    }
  };

  const getPlanLabel = () => {
    switch (plan) {
      case 'pro': return 'PRO';
      case 'teams': return 'TEAMS';
      default: return 'FREE';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 };
      case 'large':
        return { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 };
      default:
        return { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 };
    }
  };

  const sizeStyles = getSizeStyles();
  const planColor = getPlanColor();

  const content = (
    <View
      style={[
        styles.planBadge,
        { 
          backgroundColor: planColor + '15',
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      {plan !== 'free' && (
        <Ionicons name="diamond" size={sizeStyles.fontSize - 2} color={planColor} />
      )}
      <Text style={[styles.planBadgeText, { color: planColor, fontSize: sizeStyles.fontSize }]}>
        {getPlanLabel()}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ============================================
// Limit Warning
// ============================================

interface LimitWarningProps {
  current: number;
  limit: number;
  type: 'collaborators' | 'expenses' | 'documents';
  onUpgrade?: () => void;
}

export function LimitWarning({ current, limit, type, onUpgrade }: LimitWarningProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const isUnlimited = limit === Infinity;
  if (isUnlimited) return null;

  const remaining = limit - current;
  const isNearLimit = remaining <= 2 && remaining > 0;
  const isAtLimit = remaining <= 0;

  if (!isNearLimit && !isAtLimit) return null;

  const getMessage = () => {
    const typeLabel = type === 'collaborators' ? 'collaborator' : type.slice(0, -1);
    if (isAtLimit) {
      return `You've reached the ${typeLabel} limit for this trip.`;
    }
    return `Only ${remaining} ${typeLabel}${remaining > 1 ? 's' : ''} remaining.`;
  };

  return (
    <View
      style={[
        styles.warningContainer,
        { 
          backgroundColor: isAtLimit ? Colors.error + '15' : Colors.warning + '15',
          borderColor: isAtLimit ? Colors.error + '30' : Colors.warning + '30',
        },
      ]}
    >
      <Ionicons
        name={isAtLimit ? 'alert-circle' : 'warning'}
        size={18}
        color={isAtLimit ? Colors.error : Colors.warning}
      />
      <Text style={[styles.warningText, { color: colors.text }]}>
        {getMessage()}
      </Text>
      <TouchableOpacity
        style={[styles.warningButton, { backgroundColor: Colors.primary }]}
        onPress={onUpgrade || (() => router.push('/subscription'))}
      >
        <Text style={styles.warningButtonText}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Usage Progress
  container: {
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  count: {
    fontSize: FontSizes.bodySmall,
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
    marginTop: Spacing.xs,
  },
  upgradeHintText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactIcon: {
    marginRight: 2,
  },
  compactText: {
    fontSize: FontSizes.caption,
  },
  // Summary Card
  summaryCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  summaryTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: FontSizes.caption,
  },
  summaryItemValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryItemCurrent: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  summaryItemLimit: {
    fontSize: FontSizes.bodySmall,
  },
  summaryUpgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
  },
  summaryUpgradeText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  // Plan Badge
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.small,
    gap: 4,
  },
  planBadgeText: {
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  // Limit Warning
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.bodySmall,
  },
  warningButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  warningButtonText: {
    color: '#fff',
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
});
