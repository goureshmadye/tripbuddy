import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { SocialButton } from "@/components/ui/social-button";
import { Colors, FontSizes, FontWeights, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { checkEmailExists } from "@/services/auth";
import {
    getPasswordStrength,
    validateEmail,
    validatePassword,
    validateSignupForm,
} from "@/utils/validation";
import * as Google from "expo-auth-session/providers/google";
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

export default function SignupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { signUpWithEmail, signInWithGoogle, isWalkthroughComplete } =
    useAuth();

  const navigateAfterSignup = useCallback(() => {
    // New users go to walkthrough first, then onboarding
    if (!isWalkthroughComplete) {
      router.replace("/auth/walkthrough");
    } else {
      router.replace("/auth/onboarding");
    }
  }, [isWalkthroughComplete, router]);

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        setGoogleLoading(true);
        signInWithGoogle(id_token)
          .then(navigateAfterSignup)
          .catch((error: any) => {
            Alert.alert(
              "Google Sign-In Failed",
              error?.message || "Unknown error",
            );
          })
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response, navigateAfterSignup, signInWithGoogle]);

  // Form state - NO NAME FIELD (collected in onboarding)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [touched, setTouched] = useState<{
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  }>({ email: false, password: false, confirmPassword: false });

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: "weak" | "fair" | "good" | "strong";
    percentage: number;
    feedback: string[];
  }>({ strength: "weak", percentage: 0, feedback: [] });

  // Is form valid for submission?
  const isFormValid =
    email.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    Object.keys(errors).length === 0 &&
    passwordStrength.percentage === 100;

  // Real-time email validation
  const validateEmailField = useCallback((value: string) => {
    if (!value) return;
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

  // Real-time password validation
  const validatePasswordField = useCallback((value: string) => {
    const strength = getPasswordStrength(value);
    setPasswordStrength(strength);

    const result = validatePassword(value);
    if (!result.isValid) {
      setErrors((prev) => ({ ...prev, password: result.error }));
    } else {
      setErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // Real-time confirm password validation
  const validateConfirmPasswordField = useCallback(
    (value: string) => {
      if (value && value !== password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      } else {
        setErrors((prev) => {
          const { confirmPassword, ...rest } = prev;
          return rest;
        });
      }
    },
    [password],
  );

  // Update password validation when password changes (for confirm password)
  useEffect(() => {
    if (touched.confirmPassword && confirmPassword) {
      validateConfirmPasswordField(confirmPassword);
    }
  }, [
    password,
    confirmPassword,
    touched.confirmPassword,
    validateConfirmPasswordField,
  ]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      validateEmailField(value);
    }
  };

  const handleEmailBlur = async () => {
    setTouched((prev) => ({ ...prev, email: true }));
    validateEmailField(email);

    // Check if email already exists
    if (email && validateEmail(email).isValid) {
      setCheckingEmail(true);
      try {
        const exists = await checkEmailExists(email);
        if (exists) {
          setErrors((prev) => ({
            ...prev,
            email: "This email is already registered. Please sign in instead.",
          }));
        }
      } catch {
        // Ignore errors
      } finally {
        setCheckingEmail(false);
      }
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      validatePasswordField(value);
    } else {
      // Always update strength indicator
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    validatePasswordField(password);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      validateConfirmPasswordField(value);
    }
  };

  const handleConfirmPasswordBlur = () => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    validateConfirmPasswordField(confirmPassword);
  };

  const handleSignup = async () => {
    // Final validation
    const { isValid, errors: validationErrors } = validateSignupForm({
      email,
      password,
      confirmPassword,
    });

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    // Optionally re-check email existence on submit
    setCheckingEmail(true);
    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setErrors({
          email: "This email is already registered. Please sign in instead.",
        });
        setCheckingEmail(false);
        return;
      }
    } catch {
      // ignore network errors here
    } finally {
      setCheckingEmail(false);
    }

    setLoading(true);
    try {
      // Sign up without name - it will be collected in onboarding
      await signUpWithEmail(email, password, "");
      navigateAfterSignup();
    } catch (error) {
      Alert.alert(
        "Signup Failed",
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (Platform.OS !== "web") {
      try {
        await promptAsync();
      } catch {
        Alert.alert("Error", "Failed to start Google Sign-In");
      }
    } else {
      setGoogleLoading(true);
      try {
        await signInWithGoogle();
        navigateAfterSignup();
      } catch (error) {
        Alert.alert(
          "Google Sign-In Failed",
          error instanceof Error ? error.message : "An error occurred",
        );
      } finally {
        setGoogleLoading(false);
      }
    }
  };

  const handleAppleSignup = async () => {
    Alert.alert("Coming Soon", "Apple Sign-In will be available soon!");
  };

  const getStrengthColor = () => {
    switch (passwordStrength.strength) {
      case "weak":
        return Colors.error;
      case "fair":
        return Colors.warning;
      case "good":
        return Colors.info;
      case "strong":
        return Colors.success;
    }
  };

  return (
    <ScreenContainer
      style={styles.container}
      backgroundColor={colors.background}
      padded
    >
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
          <View style={styles.header}>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join TripBuddy and start planning amazing trips
            </Text>
          </View>

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
            />

            <View>
              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={handlePasswordBlur}
                secureTextEntry
                autoComplete="password-new"
                leftIcon="lock-closed-outline"
                error={errors.password}
              />
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${passwordStrength.percentage}%`,
                          backgroundColor: getStrengthColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.strengthText, { color: getStrengthColor() }]}
                  >
                    {passwordStrength.strength.charAt(0).toUpperCase() +
                      passwordStrength.strength.slice(1)}
                  </Text>
                </View>
              )}
              {password.length > 0 && passwordStrength.feedback.length > 0 && (
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  Missing: {passwordStrength.feedback.join(", ")}
                </Text>
              )}
            </View>

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              onBlur={handleConfirmPasswordBlur}
              secureTextEntry
              autoComplete="password-new"
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading || checkingEmail}
              disabled={!isFormValid || loading || checkingEmail}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.sm }}
            />
          </View>

          {/* Social Signup */}
          <Divider text="or sign up with" />

          <View style={styles.socialButtons}>
            <SocialButton
              provider="google"
              onPress={handleGoogleSignup}
              loading={googleLoading}
            />
            {Platform.OS === "ios" && (
              <SocialButton
                provider="apple"
                onPress={handleAppleSignup}
                style={{ marginTop: Spacing.sm }}
              />
            )}
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text style={[styles.loginLink, { color: Colors.primary }]}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
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
  titleContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.body,
  },
  form: {
    gap: Spacing.md,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
    width: 50,
  },
  hint: {
    fontSize: FontSizes.caption,
    marginTop: Spacing.xs,
  },
  socialButtons: {
    gap: Spacing.sm,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  loginText: {
    fontSize: FontSizes.body,
  },
  loginLink: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
});
