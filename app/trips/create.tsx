import { ScreenHeader } from '@/components/navigation/screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addCollaborator, createItineraryItem, createTrip, getUserByEmail } from '@/services/firestore';
import { convertToItineraryItems, GeneratedTripPlan, generateTripPlan } from '@/services/gemini';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBsdUhzX0MnaEY8WbduCribLEstC0T8_dU';

// Currency configuration with symbols and budget thresholds
const CURRENCY_CONFIG: Record<string, {
  symbol: string;
  budget: number;
  moderate: [number, number];
  luxury: [number, number];
  premium: number;
}> = {
  USD: { symbol: '$', budget: 500, moderate: [500, 2000], luxury: [2000, 5000], premium: 5000 },
  EUR: { symbol: '€', budget: 450, moderate: [450, 1800], luxury: [1800, 4500], premium: 4500 },
  GBP: { symbol: '£', budget: 400, moderate: [400, 1600], luxury: [1600, 4000], premium: 4000 },
  INR: { symbol: '₹', budget: 25000, moderate: [25000, 100000], luxury: [100000, 300000], premium: 300000 },
  JPY: { symbol: '¥', budget: 50000, moderate: [50000, 200000], luxury: [200000, 500000], premium: 500000 },
  AUD: { symbol: 'A$', budget: 750, moderate: [750, 3000], luxury: [3000, 7500], premium: 7500 },
  CAD: { symbol: 'C$', budget: 650, moderate: [650, 2600], luxury: [2600, 6500], premium: 6500 },
  CHF: { symbol: 'CHF ', budget: 450, moderate: [450, 1800], luxury: [1800, 4500], premium: 4500 },
  CNY: { symbol: '¥', budget: 3500, moderate: [3500, 14000], luxury: [14000, 35000], premium: 35000 },
  SGD: { symbol: 'S$', budget: 650, moderate: [650, 2600], luxury: [2600, 6500], premium: 6500 },
  AED: { symbol: 'AED ', budget: 1800, moderate: [1800, 7500], luxury: [7500, 18000], premium: 18000 },
  BRL: { symbol: 'R$', budget: 2500, moderate: [2500, 10000], luxury: [10000, 25000], premium: 25000 },
  MXN: { symbol: 'MX$', budget: 8500, moderate: [8500, 35000], luxury: [35000, 85000], premium: 85000 },
  KRW: { symbol: '₩', budget: 650000, moderate: [650000, 2600000], luxury: [2600000, 6500000], premium: 6500000 },
  THB: { symbol: '฿', budget: 17500, moderate: [17500, 70000], luxury: [70000, 175000], premium: 175000 },
  ZAR: { symbol: 'R', budget: 9000, moderate: [9000, 36000], luxury: [36000, 90000], premium: 90000 },
  NZD: { symbol: 'NZ$', budget: 800, moderate: [800, 3200], luxury: [3200, 8000], premium: 8000 },
  SEK: { symbol: 'kr', budget: 5000, moderate: [5000, 20000], luxury: [20000, 50000], premium: 50000 },
  NOK: { symbol: 'kr', budget: 5000, moderate: [5000, 20000], luxury: [20000, 50000], premium: 50000 },
  DKK: { symbol: 'kr', budget: 3500, moderate: [3500, 14000], luxury: [14000, 35000], premium: 35000 },
  PLN: { symbol: 'zł', budget: 2000, moderate: [2000, 8000], luxury: [8000, 20000], premium: 20000 },
  HKD: { symbol: 'HK$', budget: 4000, moderate: [4000, 16000], luxury: [16000, 40000], premium: 40000 },
  TWD: { symbol: 'NT$', budget: 16000, moderate: [16000, 64000], luxury: [64000, 160000], premium: 160000 },
  RUB: { symbol: '₽', budget: 45000, moderate: [45000, 180000], luxury: [180000, 450000], premium: 450000 },
  TRY: { symbol: '₺', budget: 15000, moderate: [15000, 60000], luxury: [60000, 150000], premium: 150000 },
  IDR: { symbol: 'Rp', budget: 7500000, moderate: [7500000, 30000000], luxury: [30000000, 75000000], premium: 75000000 },
  MYR: { symbol: 'RM', budget: 2200, moderate: [2200, 9000], luxury: [9000, 22000], premium: 22000 },
  PHP: { symbol: '₱', budget: 28000, moderate: [28000, 110000], luxury: [110000, 280000], premium: 280000 },
  VND: { symbol: '₫', budget: 12500000, moderate: [12500000, 50000000], luxury: [50000000, 125000000], premium: 125000000 },
  PKR: { symbol: '₨', budget: 140000, moderate: [140000, 550000], luxury: [550000, 1400000], premium: 1400000 },
  BDT: { symbol: '৳', budget: 55000, moderate: [55000, 220000], luxury: [220000, 550000], premium: 550000 },
  EGP: { symbol: 'E£', budget: 15000, moderate: [15000, 60000], luxury: [60000, 150000], premium: 150000 },
  NGN: { symbol: '₦', budget: 400000, moderate: [400000, 1600000], luxury: [1600000, 4000000], premium: 4000000 },
  COP: { symbol: 'COL$', budget: 2000000, moderate: [2000000, 8000000], luxury: [8000000, 20000000], premium: 20000000 },
  ARS: { symbol: 'AR$', budget: 450000, moderate: [450000, 1800000], luxury: [1800000, 4500000], premium: 4500000 },
  CLP: { symbol: 'CLP$', budget: 450000, moderate: [450000, 1800000], luxury: [1800000, 4500000], premium: 4500000 },
  PEN: { symbol: 'S/', budget: 1850, moderate: [1850, 7400], luxury: [7400, 18500], premium: 18500 },
  ILS: { symbol: '₪', budget: 1800, moderate: [1800, 7200], luxury: [7200, 18000], premium: 18000 },
  SAR: { symbol: 'SAR ', budget: 1900, moderate: [1900, 7500], luxury: [7500, 19000], premium: 19000 },
  QAR: { symbol: 'QAR ', budget: 1800, moderate: [1800, 7300], luxury: [7300, 18000], premium: 18000 },
  KWD: { symbol: 'KD ', budget: 150, moderate: [150, 600], luxury: [600, 1500], premium: 1500 },
  BHD: { symbol: 'BD ', budget: 190, moderate: [190, 750], luxury: [750, 1900], premium: 1900 },
  OMR: { symbol: 'OMR ', budget: 190, moderate: [190, 770], luxury: [770, 1900], premium: 1900 },
};

const formatCurrencyAmount = (amount: number, symbol: string): string => {
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(0)}K`;
  }
  return `${symbol}${amount}`;
};

const getBudgetRanges = (currency: string) => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const { symbol, budget, moderate, luxury, premium } = config;

  return [
    { 
      id: 'budget', 
      label: 'Budget', 
      range: `< ${formatCurrencyAmount(budget, symbol)}`, 
      icon: 'wallet-outline' 
    },
    { 
      id: 'moderate', 
      label: 'Moderate', 
      range: `${formatCurrencyAmount(moderate[0], symbol)} - ${formatCurrencyAmount(moderate[1], symbol)}`, 
      icon: 'card-outline' 
    },
    { 
      id: 'luxury', 
      label: 'Luxury', 
      range: `${formatCurrencyAmount(luxury[0], symbol)} - ${formatCurrencyAmount(luxury[1], symbol)}`, 
      icon: 'diamond-outline' 
    },
    { 
      id: 'premium', 
      label: 'Premium', 
      range: `${formatCurrencyAmount(premium, symbol)}+`, 
      icon: 'star-outline' 
    },
  ];
};

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

const TRAVELER_COUNTS = [
  { id: '1', label: 'Solo', icon: 'person-outline' },
  { id: '2', label: 'Couple', icon: 'heart-outline' },
  { id: '3-5', label: 'Small Group', icon: 'people-outline' },
  { id: '6+', label: 'Large Group', icon: 'people-circle-outline' },
];

const ACCOMMODATION_TYPES = [
  { id: 'hotel', label: 'Hotel', icon: 'bed-outline' },
  { id: 'airbnb', label: 'Airbnb', icon: 'home-outline' },
  { id: 'hostel', label: 'Hostel', icon: 'business-outline' },
  { id: 'resort', label: 'Resort', icon: 'umbrella-outline' },
  { id: 'camping', label: 'Camping', icon: 'bonfire-outline' },
  { id: 'mixed', label: 'Mixed', icon: 'layers-outline' },
];

interface DestinationDetails {
  name: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  country?: string;
  formattedAddress?: string;
}

export default function CreateTripScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

  // Get budget ranges based on user's currency
  const userCurrency = user?.defaultCurrency || 'USD';
  const BUDGET_RANGES = useMemo(() => getBudgetRanges(userCurrency), [userCurrency]);

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<DestinationDetails | null>(null);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Step 2: Preferences
  const [tripType, setTripType] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [travelerCount, setTravelerCount] = useState('');
  const [accommodationType, setAccommodationType] = useState('');

  // Step 3: Collaborators
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  // Step 5: AI Generated Plan
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedTripPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateWithAI, setGenerateWithAI] = useState(true);

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
        if (!destination) {
          Alert.alert('Required', 'Please select a destination from the suggestions');
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
        // Step 3 is optional, allow continuing
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  // Generate AI trip plan
  const handleGeneratePlan = async () => {
    if (!destination) return;
    
    setIsGenerating(true);
    try {
      const plan = await generateTripPlan({
        destination: destination.name,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        startDate,
        endDate,
        tripType: tripType || null,
        transportMode: transportMode || null,
        budgetRange: budgetRange || null,
        travelerCount: travelerCount || null,
        accommodationType: accommodationType || null,
        currency: userCurrency,
      });
      setGeneratedPlan(plan);
    } catch (error) {
      console.error('Failed to generate plan:', error);
      Alert.alert(
        'Generation Failed',
        'Could not generate AI trip plan. You can still create the trip manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    // When moving to step 5, generate the plan if enabled
    if (step === 4 && generateWithAI && !generatedPlan) {
      setStep(step + 1);
      handleGeneratePlan();
      return;
    }
    
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
    if (!user) {
      Alert.alert('Error', 'You must be signed in to create a trip');
      return;
    }

    setLoading(true);
    try {
      // Create trip in Firestore
      const tripId = await createTrip({
        title: title.trim(),
        destination: destination?.name || '',
        destinationPlaceId: destination?.placeId || null,
        destinationLat: destination?.latitude || null,
        destinationLng: destination?.longitude || null,
        startDate,
        endDate,
        creatorId: user.id,
        currency: userCurrency,
        transportationMode: transportMode || null,
        tripType: tripType || null,
        budgetRange: budgetRange || null,
        travelerCount: travelerCount || null,
        accommodationType: accommodationType || null,
      });

      // Add creator as owner collaborator
      await addCollaborator({
        tripId,
        userId: user.id,
        role: 'owner',
      });

      // Save AI-generated itinerary items if available
      if (generatedPlan) {
        const itineraryItems = convertToItineraryItems(generatedPlan, tripId, user.id);
        for (const item of itineraryItems) {
          try {
            await createItineraryItem(item);
          } catch (err) {
            console.warn('Failed to create itinerary item:', err);
          }
        }
      }

      // Invite collaborators by email
      for (const email of invitedEmails) {
        try {
          const invitedUser = await getUserByEmail(email);
          if (invitedUser) {
            await addCollaborator({
              tripId,
              userId: invitedUser.id,
              role: 'editor',
            });
          }
          // If user not found, we could store pending invites in a separate collection
        } catch (err) {
          console.warn(`Failed to add collaborator ${email}:`, err);
        }
      }
      
      Alert.alert(
        'Trip Created! 🎉',
        `"${title}" has been created successfully.${generatedPlan ? ' AI-generated itinerary has been added.' : ''}${invitedEmails.length > 0 ? ` Invites sent to ${invitedEmails.length} people.` : ''}`,
        [{ text: 'View Trip', onPress: () => router.replace(`/trips/${tripId}`) }]
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

              {/* Google Places Autocomplete for Destination */}
              <View style={styles.destinationSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Destination</Text>
                <View style={[styles.placesContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={20} color={Colors.primary} style={styles.locationIcon} />
                  <GooglePlacesAutocomplete
                    ref={placesRef}
                    placeholder="Search for a city or place"
                    onPress={(data, details = null) => {
                      const location = details?.geometry?.location;
                      setDestination({
                        name: data.description,
                        placeId: data.place_id,
                        latitude: location?.lat || null,
                        longitude: location?.lng || null,
                        country: details?.address_components?.find(
                          c => c.types.includes('country')
                        )?.long_name,
                        formattedAddress: details?.formatted_address,
                      });
                      setDestinationQuery(data.description);
                    }}
                    query={{
                      key: GOOGLE_PLACES_API_KEY,
                      language: 'en',
                      types: '(cities)',
                    }}
                    fetchDetails={true}
                    textInputProps={{
                      placeholderTextColor: colors.textMuted,
                      value: destinationQuery,
                      onChangeText: (text) => {
                        setDestinationQuery(text);
                        if (!text) {
                          setDestination(null);
                        }
                      },
                    }}
                    styles={{
                      container: {
                        flex: 1,
                      },
                      textInput: {
                        backgroundColor: 'transparent',
                        color: colors.text,
                        fontSize: FontSizes.md,
                        height: 44,
                        paddingVertical: 0,
                      },
                      listView: {
                        backgroundColor: colors.card,
                        borderRadius: BorderRadius.lg,
                        marginTop: Spacing.xs,
                        ...Platform.select({
                          ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                          },
                          android: {
                            elevation: 4,
                          },
                        }),
                      },
                      row: {
                        backgroundColor: colors.card,
                        padding: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                      description: {
                        color: colors.text,
                        fontSize: FontSizes.sm,
                      },
                      poweredContainer: {
                        display: 'none',
                      },
                      powered: {
                        display: 'none',
                      },
                    }}
                    enablePoweredByContainer={false}
                    debounce={300}
                    minLength={2}
                    nearbyPlacesAPI="GooglePlacesSearch"
                    disableScroll={true}
                    listViewDisplayed="auto"
                    renderLeftButton={() => null}
                    renderRightButton={() => 
                      destinationQuery ? (
                        <TouchableOpacity
                          onPress={() => {
                            setDestinationQuery('');
                            setDestination(null);
                            placesRef.current?.clear();
                          }}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      ) : null
                    }
                  />
                </View>
                {destination && (
                  <View style={[styles.selectedDestination, { backgroundColor: Colors.primary + '10' }]}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={[styles.selectedDestinationText, { color: Colors.primary }]}>
                      {destination.name}
                    </Text>
                  </View>
                )}
              </View>

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
            <View style={[styles.stepIcon, { backgroundColor: '#FF6B6B' + '15' }]}>
              <Ionicons name="globe-outline" size={32} color="#FF6B6B" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Travel Details</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Help us personalize your trip
            </Text>

            <View style={styles.formSection}>
              {/* Traveler Count */}
              <View style={styles.optionSection}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>How many travelers?</Text>
                <View style={styles.budgetGrid}>
                  {TRAVELER_COUNTS.map((count) => (
                    <TouchableOpacity
                      key={count.id}
                      style={[
                        styles.budgetCard,
                        {
                          backgroundColor: travelerCount === count.id
                            ? '#FF6B6B' + '15'
                            : colors.card,
                          borderColor: travelerCount === count.id
                            ? '#FF6B6B'
                            : colors.border,
                        },
                      ]}
                      onPress={() => setTravelerCount(count.id)}
                    >
                      <Ionicons
                        name={count.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={travelerCount === count.id ? '#FF6B6B' : colors.textSecondary}
                      />
                      <Text style={[styles.budgetLabel, { color: travelerCount === count.id ? '#FF6B6B' : colors.text }]}>
                        {count.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Accommodation Type */}
              <View style={styles.optionSection}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Accommodation</Text>
                <View style={styles.optionsGrid}>
                  {ACCOMMODATION_TYPES.map((accom) => (
                    <TouchableOpacity
                      key={accom.id}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: accommodationType === accom.id
                            ? '#9B59B6' + '15'
                            : colors.card,
                          borderColor: accommodationType === accom.id
                            ? '#9B59B6'
                            : colors.border,
                        },
                      ]}
                      onPress={() => setAccommodationType(accom.id)}
                    >
                      <Ionicons
                        name={accom.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={accommodationType === accom.id ? '#9B59B6' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: accommodationType === accom.id ? '#9B59B6' : colors.text },
                        ]}
                      >
                        {accom.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );

      case 4:
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

              {/* AI Generation Toggle */}
              <TouchableOpacity
                style={[styles.aiToggle, { backgroundColor: generateWithAI ? Colors.primary + '15' : colors.backgroundSecondary, borderColor: generateWithAI ? Colors.primary : colors.border }]}
                onPress={() => setGenerateWithAI(!generateWithAI)}
              >
                <View style={styles.aiToggleContent}>
                  <Ionicons name="sparkles" size={24} color={generateWithAI ? Colors.primary : colors.textSecondary} />
                  <View style={styles.aiToggleText}>
                    <Text style={[styles.aiToggleTitle, { color: generateWithAI ? Colors.primary : colors.text }]}>
                      Generate with AI ✨
                    </Text>
                    <Text style={[styles.aiToggleDescription, { color: colors.textSecondary }]}>
                      Get a personalized itinerary, places to visit, and expense breakdown
                    </Text>
                  </View>
                </View>
                <View style={[styles.aiToggleCheckbox, { backgroundColor: generateWithAI ? Colors.primary : 'transparent', borderColor: generateWithAI ? Colors.primary : colors.border }]}>
                  {generateWithAI && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.stepIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Ionicons name="sparkles" size={32} color="#8B5CF6" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your AI Trip Plan</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Review and customize your personalized itinerary
            </Text>

            {isGenerating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[styles.generatingText, { color: colors.text }]}>
                  Creating your perfect trip...
                </Text>
                <Text style={[styles.generatingSubtext, { color: colors.textSecondary }]}>
                  Our AI is crafting a personalized itinerary based on your preferences
                </Text>
              </View>
            ) : generatedPlan ? (
              <View style={styles.planContainer}>
                {/* Summary */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>Summary</Text>
                  </View>
                  <Text style={[styles.planSummary, { color: colors.textSecondary }]}>
                    {generatedPlan.summary}
                  </Text>
                </View>

                {/* Highlights */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="star-outline" size={20} color="#F59E0B" />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>Highlights</Text>
                  </View>
                  {generatedPlan.highlights.map((highlight, index) => (
                    <View key={index} style={styles.highlightItem}>
                      <Text style={[styles.highlightBullet, { color: Colors.primary }]}>•</Text>
                      <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{highlight}</Text>
                    </View>
                  ))}
                </View>

                {/* Daily Itinerary Preview */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.secondary} />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>
                      {generatedPlan.itinerary.length}-Day Itinerary
                    </Text>
                  </View>
                  {generatedPlan.itinerary.slice(0, 3).map((day) => (
                    <View key={day.day} style={styles.dayPreview}>
                      <View style={[styles.dayBadge, { backgroundColor: Colors.primary + '20' }]}>
                        <Text style={[styles.dayBadgeText, { color: Colors.primary }]}>Day {day.day}</Text>
                      </View>
                      <View style={styles.dayInfo}>
                        <Text style={[styles.dayTitle, { color: colors.text }]}>{day.title}</Text>
                        <Text style={[styles.dayPlaces, { color: colors.textSecondary }]}>
                          {day.places.length} places to visit
                        </Text>
                      </View>
                    </View>
                  ))}
                  {generatedPlan.itinerary.length > 3 && (
                    <Text style={[styles.moreText, { color: Colors.primary }]}>
                      +{generatedPlan.itinerary.length - 3} more days...
                    </Text>
                  )}
                </View>

                {/* Map Locations */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="location-outline" size={20} color="#10B981" />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>
                      {generatedPlan.mapLocations.length} Places to Visit
                    </Text>
                  </View>
                  <View style={styles.locationsPreview}>
                    {generatedPlan.mapLocations.slice(0, 4).map((location, index) => (
                      <View key={index} style={[styles.locationChip, { backgroundColor: colors.backgroundSecondary }]}>
                        <Ionicons name="pin-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.locationChipText, { color: colors.text }]} numberOfLines={1}>
                          {location.name}
                        </Text>
                      </View>
                    ))}
                    {generatedPlan.mapLocations.length > 4 && (
                      <View style={[styles.locationChip, { backgroundColor: Colors.primary + '20' }]}>
                        <Text style={[styles.locationChipText, { color: Colors.primary }]}>
                          +{generatedPlan.mapLocations.length - 4} more
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Expense Breakdown */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="wallet-outline" size={20} color="#EC4899" />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>Estimated Budget</Text>
                  </View>
                  {generatedPlan.expenseBreakdown.map((expense, index) => (
                    <View key={index} style={styles.expenseRow}>
                      <Text style={[styles.expenseCategory, { color: colors.textSecondary }]}>{expense.category}</Text>
                      <Text style={[styles.expenseAmount, { color: colors.text }]}>
                        {CURRENCY_CONFIG[generatedPlan.currency]?.symbol || '$'}{expense.estimatedAmount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total Estimated</Text>
                    <Text style={[styles.totalAmount, { color: Colors.primary }]}>
                      {CURRENCY_CONFIG[generatedPlan.currency]?.symbol || '$'}{generatedPlan.totalEstimatedCost.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Tips */}
                <View style={[styles.planSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planSectionHeader}>
                    <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                    <Text style={[styles.planSectionTitle, { color: colors.text }]}>Travel Tips</Text>
                  </View>
                  {generatedPlan.tips.slice(0, 3).map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <Text style={[styles.tipNumber, { color: Colors.primary }]}>{index + 1}</Text>
                      <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.editNote, { backgroundColor: Colors.primary + '10' }]}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.editNoteText, { color: Colors.primary }]}>
                    You can edit all details after creating the trip
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noplanContainer}>
                <Ionicons name="document-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.noplanText, { color: colors.textSecondary }]}>
                  No AI plan generated. You can create the trip without AI suggestions.
                </Text>
                <Button
                  title="Generate Plan"
                  onPress={handleGeneratePlan}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="sparkles" size={16} color={Colors.primary} />}
                />
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenContainer style={styles.container} backgroundColor={colors.background} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <ScreenHeader title="New Trip" showBack={false} />

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
            {step > 1 && !isGenerating && (
              <View style={styles.buttonWrapper}>
                <Button
                  title="Back"
                  onPress={handleBack}
                  variant="outline"
                  size="lg"
                  fullWidth
                  style={styles.actionButton}
                />
              </View>
            )}
            <View style={[styles.buttonWrapper, (step === 1 || isGenerating) && styles.buttonWrapperFull]}>
              <Button
                title={step === totalSteps ? "Create Trip" : isGenerating ? "Generating..." : "Continue"}
                onPress={step === totalSteps ? handleCreate : handleNext}
                loading={loading}
                disabled={isGenerating}
                size="lg"
                fullWidth
                style={styles.actionButton}
                icon={step === totalSteps ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : undefined}
              />
            </View>
          </View>
          {step === 5 && !isGenerating && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setGeneratedPlan(null);
                handleCreate();
              }}
              disabled={loading}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Create without AI plan
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    paddingBottom: Spacing['2xl'],
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
  destinationSection: {
    marginTop: Spacing.sm,
    zIndex: 1000,
  },
  placesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  locationIcon: {
    marginRight: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  selectedDestinationText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
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
  // AI Toggle Styles
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
  aiToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  aiToggleText: {
    flex: 1,
  },
  aiToggleTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  aiToggleDescription: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  aiToggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // AI Generated Plan Styles
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  generatingText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
  },
  generatingSubtext: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  planContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  planSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  planSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  planSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  planSummary: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
  },
  highlightItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  highlightBullet: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  highlightText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  dayPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  dayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  dayBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  dayPlaces: {
    fontSize: FontSizes.xs,
  },
  moreText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    paddingTop: Spacing.xs,
  },
  locationsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  locationChipText: {
    fontSize: FontSizes.xs,
    maxWidth: 100,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  expenseCategory: {
    fontSize: FontSizes.sm,
  },
  expenseAmount: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  totalAmount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  tipItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tipNumber: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  editNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  editNoteText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  noplanContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  noplanText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  buttonWrapper: {
    flex: 1,
  },
  buttonWrapperFull: {
    flex: 1,
  },
  actionButton: {
    minHeight: 52,
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
