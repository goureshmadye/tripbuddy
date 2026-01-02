import { ScreenContainer } from '@/components/screen-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateEmail } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please enter a valid email');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScreenContainer style={styles.container} backgroundColor={colors.background} padded>
        <View style={styles.successContent}>
          <View style={[styles.successIcon, { backgroundColor: Colors.success + '15' }]}>
            <Ionicons name="mail-open-outline" size={48} color={Colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            We have sent password reset instructions to{'\n'}
            <Text style={{ fontWeight: FontWeights.semibold }}>{email}</Text>
          </Text>
          <Button
            title="Back to Login"
            onPress={() => router.replace('/auth/login')}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.xl }}
          />
          <TouchableOpacity
            onPress={() => setSent(false)}
            style={styles.resendButton}
          >
            <Text style={[styles.resendText, { color: Colors.primary }]}>
                Did not receive email? Try again
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container} backgroundColor={colors.background} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="key-outline" size={40} color={Colors.primary} />
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              No worries! Enter your email and we will send you reset instructions.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={error}
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              fullWidth
              size="lg"
            />
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backToLogin}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={[styles.backToLoginText, { color: Colors.primary }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingTop: 0,
    marginBottom: Spacing.lg,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxlarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: Spacing.md,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  backToLoginText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  successContent: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  resendButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  resendText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
});
