import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createItineraryItem } from '@/services/firestore';
import { ItineraryCategory } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const CATEGORIES: { id: ItineraryCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'sightseeing', label: 'Sightseeing', icon: 'camera-outline', color: Colors.accent },
  { id: 'food', label: 'Food & Dining', icon: 'restaurant-outline', color: '#F97316' },
  { id: 'transport', label: 'Transport', icon: 'car-outline', color: Colors.primary },
  { id: 'accommodation', label: 'Stay', icon: 'bed-outline', color: Colors.secondary },
  { id: 'activity', label: 'Activity', icon: 'flash-outline', color: '#8B5CF6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#64748B' },
];

export default function AddItineraryItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<ItineraryCategory>('sightseeing');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes);
      }
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    if (!id) {
      Alert.alert('Error', 'Trip ID is missing');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add activities');
      return;
    }
    
    setLoading(true);
    try {
      const startDateTime = parseDateTime(date, startTime);
      const endDateTime = parseDateTime(date, endTime);

      await createItineraryItem({
        tripId: id,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        category,
        startTime: startDateTime,
        endTime: endDateTime,
        addedBy: user.id,
        latitude: null,
        longitude: null,
      });
      
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setLoading(false);
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
          <View style={styles.headerPlaceholder} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Activity</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: category === cat.id ? cat.color + '15' : colors.card,
                      borderColor: category === cat.id ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={category === cat.id ? cat.color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: category === cat.id ? cat.color : colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
            <Input
              label="Title"
              placeholder="e.g., Visit Eiffel Tower"
              value={title}
              onChangeText={setTitle}
              error={errors.title}
            />
            <Input
              label="Description"
              placeholder="Add notes or details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <Input
              label="Location"
              placeholder="Enter location"
              value={location}
              onChangeText={setLocation}
              leftIcon="location-outline"
            />
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date & Time</Text>
            <Input
              label="Date"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              leftIcon="calendar-outline"
            />
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Input
                  label="Start Time"
                  placeholder="HH:MM"
                  value={startTime}
                  onChangeText={setStartTime}
                  leftIcon="time-outline"
                />
              </View>
              <View style={styles.timeInput}>
                <Input
                  label="End Time"
                  placeholder="HH:MM"
                  value={endTime}
                  onChangeText={setEndTime}
                  leftIcon="time-outline"
                />
              </View>
            </View>
          </View>

          {/* Attachments */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Attachments</Text>
            <TouchableOpacity
              style={[styles.attachButton, { borderColor: colors.border }]}
            >
              <Ionicons name="attach-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.attachText, { color: colors.textSecondary }]}>
                Add photos, tickets, or documents
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
          <Button
            title="Save Activity"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="lg"
            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
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
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  categoriesContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeInput: {
    flex: 1,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  attachText: {
    fontSize: FontSizes.md,
  },
  bottomContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
