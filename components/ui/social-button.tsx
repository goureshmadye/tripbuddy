import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

type SocialProvider = 'google' | 'apple' | 'facebook';

interface SocialButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const providerConfig: Record<SocialProvider, { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  google: {
    name: 'Continue with Google',
    icon: 'logo-google',
    color: '#DB4437',
  },
  apple: {
    name: 'Continue with Apple',
    icon: 'logo-apple',
    color: '#000000',
  },
  facebook: {
    name: 'Continue with Facebook',
    icon: 'logo-facebook',
    color: '#4267B2',
  },
};

export function SocialButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}: SocialButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  
  const config = providerConfig[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        Shadows.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={config.color} size="small" />
      ) : (
        <View style={styles.content}>
          <Ionicons name={config.icon} size={20} color={config.color} />
          <Text style={[styles.text, { color: colors.text }]}>{config.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    minHeight: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    marginLeft: Spacing.md,
  },
});
