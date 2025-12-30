import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateName } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, updateProfile, uploadProfilePhoto, completeOnboarding } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;

  // Validate name when it changes
  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim()) {
      const validation = validateName(text);
      setNameError(validation.isValid ? '' : validation.error || '');
    } else {
      setNameError('');
    }
  };

  const isNameValid = () => {
    const validation = validateName(name);
    return validation.isValid;
  };

  // Initialize name from user profile if available
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
    if (user?.defaultCurrency) {
      setSelectedCurrency(user.defaultCurrency);
    }
    if (user?.homeCountry) {
      setSelectedCountry(user.homeCountry);
    }
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(
      'Add Profile Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setNameError('Name is required');
        return;
      }
      if (!isNameValid()) {
        return;
      }
    }
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Upload profile photo if selected (and not already a URL)
      let photoUrl = profilePhoto;
      if (profilePhoto && !profilePhoto.startsWith('http')) {
        try {
          photoUrl = await uploadProfilePhoto(profilePhoto);
        } catch (error) {
          console.error('Failed to upload photo:', error);
          // Continue without photo - don't block completion
        }
      }

      // Save user preferences to Firestore
      await updateProfile({
        name: name.trim(),
        profilePhoto: photoUrl,
        defaultCurrency: selectedCurrency,
        homeCountry: selectedCountry || null,
      });

      // Mark onboarding as complete
      await completeOnboarding();
      
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Save minimal data and mark onboarding complete
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      // Still navigate even if marking complete fails
      router.replace('/(tabs)');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="person-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What's your name?</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              This is how you'll appear to your travel companions
            </Text>
            <Input
              placeholder="Enter your name"
              value={name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              autoFocus
              containerStyle={{ marginTop: Spacing.lg, width: '100%' }}
              error={nameError}
            />
            <Text style={[styles.nameHint, { color: colors.textMuted }]}>
              Use letters only, at least 2 characters
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Add a profile photo</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Help your friends recognize you
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.photoContainer,
                { 
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: profilePhoto ? Colors.primary : colors.border,
                }
              ]}
              onPress={handlePhotoOptions}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                    Tap to add photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {profilePhoto && (
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={handlePhotoOptions}
              >
                <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                <Text style={[styles.changePhotoText, { color: Colors.primary }]}>
                  Change photo
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.optionalText, { color: colors.textMuted }]}>
              You can skip this and add a photo later
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="wallet-outline" size={40} color={Colors.secondary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Default Currency</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Choose your preferred currency for expense tracking
            </Text>
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: selectedCurrency === currency.code
                        ? Colors.primary + '15'
                        : colors.card,
                      borderColor: selectedCurrency === currency.code
                        ? Colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCurrency(currency.code)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.currencySymbol, { color: Colors.primary }]}>
                      {currency.symbol}
                    </Text>
                    <View>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {currency.code}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                        {currency.name}
                      </Text>
                    </View>
                  </View>
                  {selectedCurrency === currency.code && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons name="location-outline" size={40} color={Colors.accent} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Where are you from?</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              This helps us personalize your experience
            </Text>
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: selectedCountry === country.code
                        ? Colors.primary + '15'
                        : colors.card,
                      borderColor: selectedCountry === country.code
                        ? Colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCountry(country.code)}
                >
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {country.name}
                  </Text>
                  {selectedCountry === country.code && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: s <= step ? Colors.primary : colors.border,
                  width: s === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Step Content */}
        {renderStep()}

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <Button
            title={step === totalSteps ? "Get Started" : "Continue"}
            onPress={step === totalSteps ? handleComplete : handleNext}
            loading={loading}
            disabled={step === 1 && (!name.trim() || !isNameValid())}
            fullWidth
            size="lg"
            icon={step === totalSteps ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : undefined}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  skipText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  photoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  changePhotoText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  optionalText: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.lg,
  },
  optionsList: {
    width: '100%',
    marginTop: Spacing.lg,
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    width: 30,
    textAlign: 'center',
  },
  optionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  optionSubtitle: {
    fontSize: FontSizes.sm,
  },
  bottomButtons: {
    padding: Spacing.lg,
  },
  nameHint: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
