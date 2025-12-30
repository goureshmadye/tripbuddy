import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const TRIP_TYPES = [
  { id: 'vacation', label: 'Vacation', icon: 'sunny-outline' },
  { id: 'business', label: 'Business', icon: 'briefcase-outline' },
  { id: 'adventure', label: 'Adventure', icon: 'compass-outline' },
  { id: 'road-trip', label: 'Road Trip', icon: 'car-outline' },
  { id: 'family', label: 'Family', icon: 'people-outline' },
  { id: 'weekend', label: 'Weekend', icon: 'calendar-outline' },
];

const TRANSPORT_MODES = [
  { id: 'flight', label: 'Flight', icon: 'airplane-outline' },
  { id: 'car', label: 'Car', icon: 'car-outline' },
  { id: 'train', label: 'Train', icon: 'train-outline' },
  { id: 'bus', label: 'Bus', icon: 'bus-outline' },
  { id: 'cruise', label: 'Cruise', icon: 'boat-outline' },
  { id: 'mixed', label: 'Mixed', icon: 'shuffle-outline' },
];

const BUDGET_RANGES = [
  { id: 'budget', label: 'Budget', range: '< $500', icon: 'wallet-outline' },
  { id: 'moderate', label: 'Moderate', range: '$500 - $2,000', icon: 'card-outline' },
  { id: 'luxury', label: 'Luxury', range: '$2,000 - $5,000', icon: 'diamond-outline' },
  { id: 'premium', label: 'Premium', range: '$5,000+', icon: 'star-outline' },
];

export default function CreateTripScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Step 2: Preferences
  const [tripType, setTripType] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [budgetRange, setBudgetRange] = useState('');

  // Step 3: Collaborators
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!title.trim()) {
          Alert.alert('Required', 'Please enter a trip title');
          return false;
        }
        if (!destination.trim()) {
          Alert.alert('Required', 'Please enter a destination');
          return false;
        }
        if (endDate < startDate) {
          Alert.alert('Invalid Dates', 'End date must be after start date');
          return false;
        }
        return true;
      case 2:
        // Step 2 is optional, allow continuing
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleAddCollaborator = () => {
    const email = collaboratorEmail.trim().toLowerCase();
    if (!email) return;
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    if (invitedEmails.includes(email)) {
      Alert.alert('Already Added', 'This email is already in the invite list');
      return;
    }
    
    setInvitedEmails([...invitedEmails, email]);
    setCollaboratorEmail('');
  };

  const handleRemoveCollaborator = (email: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      // TODO: Create trip in Firestore
      // TODO: Send invites to collaborators
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Trip Created! 🎉',
        `"${title}" has been created successfully.${invitedEmails.length > 0 ? ` Invites sent to ${invitedEmails.length} people.` : ''}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      console.error('Create trip error:', error);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.stepIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="map-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Where are you going?</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Tell us about your trip
            </Text>

            <View style={styles.formSection}>
              <Input
                label="Trip Title"
                placeholder="e.g., Summer in Paris"
                value={title}
                onChangeText={setTitle}
                leftIcon="airplane-outline"
              />

              <Input
                label="Destination"
                placeholder="Search for a city or place"
                value={destination}
                onChangeText={setDestination}
                leftIcon="location-outline"
              />

              {/* Date Pickers */}
              <View style={styles.dateSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Travel Dates</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                    <View>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start</Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(startDate)}</Text>
                    </View>
                  </TouchableOpacity>

                  <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />

                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.secondary} />
                    <View>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>End</Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(endDate)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={(_event: unknown, date?: Date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (date) setStartDate(date);
                  }}
                  minimumDate={new Date()}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  onChange={(_event: unknown, date?: Date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (date) setEndDate(date);
                  }}
                  minimumDate={startDate}
                />
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.stepIcon, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="options-outline" size={32} color={Colors.secondary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Trip Preferences</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Customize your trip settings
            </Text>

            <View style={styles.formSection}>
              {/* Budget Range */}
              <View style={styles.optionSection}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Budget Range</Text>
                <View style={styles.budgetGrid}>
                  {BUDGET_RANGES.map((budget) => (
                    <TouchableOpacity
                      key={budget.id}
                      style={[
                        styles.budgetCard,
                        {
                          backgroundColor: budgetRange === budget.id
                            ? Colors.accent + '15'
                            : colors.card,
                          borderColor: budgetRange === budget.id
                            ? Colors.accent
                            : colors.border,
                        },
                      ]}
                      onPress={() => setBudgetRange(budget.id)}
                    >
                      <Ionicons
                        name={budget.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={budgetRange === budget.id ? Colors.accent : colors.textSecondary}
                      />
                      <Text style={[styles.budgetLabel, { color: budgetRange === budget.id ? Colors.accent : colors.text }]}>
                        {budget.label}
                      </Text>
                      <Text style={[styles.budgetRange, { color: colors.textSecondary }]}>
                        {budget.range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Trip Type */}
              <View style={styles.optionSection}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Trip Type</Text>
                <View style={styles.optionsGrid}>
                  {TRIP_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: tripType === type.id
                            ? Colors.primary + '15'
                            : colors.card,
                          borderColor: tripType === type.id
                            ? Colors.primary
                            : colors.border,
                        },
                      ]}
                      onPress={() => setTripType(type.id)}
                    >
                      <Ionicons
                        name={type.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={tripType === type.id ? Colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: tripType === type.id ? Colors.primary : colors.text },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transport */}
              <View style={styles.optionSection}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Transportation</Text>
                <View style={styles.optionsGrid}>
                  {TRANSPORT_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: transportMode === mode.id
                            ? Colors.secondary + '15'
                            : colors.card,
                          borderColor: transportMode === mode.id
                            ? Colors.secondary
                            : colors.border,
                        },
                      ]}
                      onPress={() => setTransportMode(mode.id)}
                    >
                      <Ionicons
                        name={mode.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={transportMode === mode.id ? Colors.secondary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: transportMode === mode.id ? Colors.secondary : colors.text },
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.stepIcon, { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons name="people-outline" size={32} color={Colors.accent} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Invite Collaborators</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Plan together with friends and family
            </Text>

            <View style={styles.formSection}>
              <View style={styles.inviteInputRow}>
                <View style={styles.inviteInputWrapper}>
                  <Input
                    placeholder="Enter email address"
                    value={collaboratorEmail}
                    onChangeText={setCollaboratorEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="mail-outline"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: Colors.primary }]}
                  onPress={handleAddCollaborator}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {invitedEmails.length > 0 && (
                <View style={styles.invitedList}>
                  <Text style={[styles.invitedTitle, { color: colors.text }]}>
                    Invites ({invitedEmails.length})
                  </Text>
                  {invitedEmails.map((email) => (
                    <View
                      key={email}
                      style={[styles.invitedItem, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <View style={styles.invitedInfo}>
                        <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                          <Ionicons name="person-outline" size={16} color={Colors.primary} />
                        </View>
                        <Text style={[styles.invitedEmail, { color: colors.text }]}>{email}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveCollaborator(email)}>
                        <Ionicons name="close-circle" size={22} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.skipNote, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.skipNoteText, { color: colors.textSecondary }]}>
                  You can skip this step and invite people later from the trip settings.
                </Text>
              </View>
            </View>
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
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons name={step === 1 ? "close" : "arrow-back"} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            New Trip
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: Colors.primary,
                  width: `${(step / totalSteps) * 100}%`,
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Step {step} of {totalSteps}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={[styles.bottomContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.buttonRow}>
            {step > 1 && (
              <Button
                title="Back"
                onPress={handleBack}
                variant="outline"
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
            )}
            <Button
              title={step === totalSteps ? "Create Trip" : "Continue"}
              onPress={step === totalSteps ? handleCreate : handleNext}
              loading={loading}
              style={{ flex: step > 1 ? 1 : undefined }}
              fullWidth={step === 1}
              size="lg"
              icon={step === totalSteps ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : undefined}
            />
          </View>
          {step === 3 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip and create trip
              </Text>
            </TouchableOpacity>
          )}
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
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  formSection: {
    width: '100%',
    gap: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  dateSection: {
    marginTop: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  dateLabel: {
    fontSize: FontSizes.xs,
  },
  dateValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  optionSection: {
    marginBottom: Spacing.md,
  },
  optionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  budgetCard: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: 4,
  },
  budgetLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  budgetRange: {
    fontSize: FontSizes.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  optionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  inviteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inviteInputWrapper: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  invitedList: {
    marginTop: Spacing.md,
  },
  invitedTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  invitedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  invitedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitedEmail: {
    fontSize: FontSizes.sm,
  },
  skipNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  skipNoteText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  bottomContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
});
