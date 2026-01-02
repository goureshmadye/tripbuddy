import { ScreenHeader } from '@/components/navigation/screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { SocialButton } from "@/components/ui/social-button";
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    checkRateLimit,
    recordFailedAttempt,
    resetRateLimit,
    validateEmail,
    validateLoginForm,
} from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { signInWithEmail, signInWithGoogle, isOnboardingComplete, enableGuestMode } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
    { email: false, password: false }
  );

  // Rate limiting state
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Is form valid
  const isFormValid =
    email.length > 0 &&
    password.length > 0 &&
    Object.keys(errors).length === 0 &&
    !isLocked;

  // Check rate limit on mount
  useEffect(() => {
    checkRateLimitStatus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            checkRateLimitStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const checkRateLimitStatus = async () => {
    const result = await checkRateLimit();
    if (!result.allowed && result.lockoutSeconds) {
      setIsLocked(true);
      setLockoutSeconds(result.lockoutSeconds);
    } else {
      setIsLocked(false);
    }
  };

  // Real-time email validation
  const validateEmailField = useCallback((value: string) => {
    if (!value) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
    const result = validateEmail(value);
    if (!result.isValid) {
      setErrors((prev) => ({ ...prev, email: result.error }));
    } else {
      setErrors((prev) => {
        const { email, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      validateEmailField(value);
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    validateEmailField(email);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password && !value) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
    } else {
      setErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
    }
  };

  const navigateAfterAuth = () => {
    if (isOnboardingComplete) {
      router.replace("/(tabs)");
    } else {
      router.replace("/auth/onboarding");
    }
  };

  const handleLogin = async () => {
    // Check rate limit first
    const rateLimit = await checkRateLimit();
    if (!rateLimit.allowed) {
      setIsLocked(true);
      setLockoutSeconds(rateLimit.lockoutSeconds || 300);
      return;
    }

    // Final validation
    const { isValid, errors: validationErrors } = validateLoginForm({
      email,
      password,
    });

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // Reset rate limit on success
      await resetRateLimit();
      navigateAfterAuth();
    } catch (error) {
      // Record failed attempt
      const result = await recordFailedAttempt();

      if (!result.allowed) {
        setIsLocked(true);
        setLockoutSeconds(result.lockoutSeconds || 300);
      }

      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";

      // Check if it's a "user not found" error
      if (errorMessage.includes("No account found")) {
        Alert.alert("Account Not Found", errorMessage, [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => router.push("/auth/signup") },
        ]);
      } else {
        Alert.alert(
          "Login Failed",
          result.remainingAttempts > 0
            ? `${errorMessage}\n\n${result.remainingAttempts} attempts remaining.`
            : errorMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigateAfterAuth();
    } catch (error) {
      Alert.alert(
        "Google Sign-In Failed",
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Alert.alert("Coming Soon", "Apple Sign-In will be available soon!");
  };

  const handleGuestMode = () => {
    Alert.alert(
      "Continue as Guest",
      "Guest mode has limited features:\n\n• Data stored locally only\n• No cloud sync\n• Limited collaboration\n\nYou can sign up anytime to unlock all features.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            await enableGuestMode();
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ScreenContainer style={styles.container} backgroundColor={colors.background} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ScreenHeader showBack={false} />

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Welcome back!
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to continue planning your trips
            </Text>
          </View>

          {/* Lockout Warning */}
          {isLocked && (
            <View
              style={[styles.lockoutBanner, { backgroundColor: Colors.error + "15" }]}
            >
              <Ionicons name="lock-closed" size={20} color={Colors.error} />
              <Text style={[styles.lockoutText, { color: Colors.error }]}>
                Too many failed attempts. Try again in {formatTime(lockoutSeconds)}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={errors.email}
              editable={!isLocked}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              onBlur={handlePasswordBlur}
              secureTextEntry
              autoComplete="password"
              leftIcon="lock-closed-outline"
              error={errors.password}
              editable={!isLocked}
            />

            <TouchableOpacity
              onPress={() => router.push("/auth/forgot-password")}
              style={styles.forgotPassword}
            >
              <Text
                style={[styles.forgotPasswordText, { color: Colors.primary }]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Button
              title={isLocked ? `Locked (${formatTime(lockoutSeconds)})` : "Sign In"}
              onPress={handleLogin}
              loading={loading}
              disabled={!isFormValid || loading || isLocked}
              fullWidth
              size="lg"
            />
          </View>

          {/* Social Login */}
          <Divider text="or continue with" />

          <View style={styles.socialButtons}>
            <SocialButton
              provider="google"
              onPress={handleGoogleLogin}
              loading={googleLoading}
              disabled={isLocked}
            />
            {Platform.OS === "ios" && (
              <SocialButton
                provider="apple"
                onPress={handleAppleLogin}
                style={{ marginTop: Spacing.sm }}
                disabled={isLocked}
              />
            )}
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              Do not have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text style={[styles.signupLink, { color: Colors.primary }]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guest Mode */}
          <TouchableOpacity onPress={handleGuestMode} style={styles.guestButton}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={[styles.guestText, { color: colors.textMuted }]}>
              Skip for now, continue as guest
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
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.body,
  },
  lockoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  lockoutText: {
    flex: 1,
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  form: {
    gap: Spacing.xs,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: Spacing.md,
  },
  forgotPasswordText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  socialButtons: {
    gap: Spacing.sm,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  signupText: {
    fontSize: FontSizes.body,
  },
  signupLink: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  guestText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
});
