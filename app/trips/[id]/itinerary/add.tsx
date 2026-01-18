import { ScreenHeader } from "@/components/navigation/screen-header";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrip } from "@/hooks/use-trips";
import { createDocument, createItineraryItem } from "@/services/firestore";
import { notifyItineraryAdded } from "@/services/notifications";
import { uploadFileToStorage } from "@/services/storage";
import { ItineraryCategory } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

const CATEGORIES: {
  id: ItineraryCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    id: "sightseeing",
    label: "Sightseeing",
    icon: "camera-outline",
    color: Colors.accent,
  },
  {
    id: "food",
    label: "Food & Dining",
    icon: "restaurant-outline",
    color: "#F97316",
  },
  {
    id: "transport",
    label: "Transport",
    icon: "car-outline",
    color: Colors.primary,
  },
  {
    id: "accommodation",
    label: "Stay",
    icon: "bed-outline",
    color: Colors.secondary,
  },
  {
    id: "activity",
    label: "Activity",
    icon: "flash-outline",
    color: "#8B5CF6",
  },
  {
    id: "other",
    label: "Other",
    icon: "ellipsis-horizontal-outline",
    color: "#64748B",
  },
];

export default function AddItineraryItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { trip } = useTrip(id);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ItineraryCategory>("sightseeing");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  // Attachments state
  const [attachments, setAttachments] = useState<
    {
      uri: string;
      name: string;
      type: "image" | "file";
      mimeType?: string;
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const handlePickAttachment = () => {
    Alert.alert("Add Attachment", "Choose a source", [
      { text: "Camera", onPress: pickFromCamera },
      { text: "Photo Library", onPress: pickFromLibrary },
      { text: "Files", onPress: pickFromFiles },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Camera access is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addAttachment(
          asset.uri,
          asset.fileName || "photo.jpg",
          "image",
          asset.mimeType,
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Library access is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addAttachment(
          asset.uri,
          asset.fileName || "image.jpg",
          "image",
          asset.mimeType,
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addAttachment(asset.uri, asset.name, "file", asset.mimeType);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const addAttachment = (
    uri: string,
    name: string,
    type: "image" | "file",
    mimeType?: string,
  ) => {
    setAttachments([...attachments, { uri, name, type, mimeType }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrors({ title: "Title is required" });
      return;
    }

    if (!id) {
      Alert.alert("Error", "Trip ID is missing");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to add activities");
      return;
    }

    if (!trip) {
      Alert.alert("Error", "Trip information not loaded");
      return;
    }

    setLoading(true);
    try {
      // Auto-assign start time based on trip start date
      const startDateTime = new Date(trip.startDate);
      // Set to 9 AM on the first day
      startDateTime.setHours(9, 0, 0, 0);

      const itineraryId = await createItineraryItem({
        tripId: id,
        title: title.trim(),
        description: null,
        location: trip.destination || null,
        category,
        startTime: startDateTime,
        endTime: null,
        addedBy: user.id,
        latitude: trip.destinationLat || null,
        longitude: trip.destinationLng || null,
      });

      // Upload attachments if any
      if (attachments.length > 0) {
        setUploading(true);
        await Promise.all(
          attachments.map(async (file) => {
            try {
              const uniqueName = `${Date.now()}_${file.name}`;
              const path = `trips/${id}/documents/${uniqueName}`;
              const fileUrl = await uploadFileToStorage(
                file.uri,
                path,
                file.mimeType,
              );

              await createDocument({
                tripId: id,
                itineraryId: itineraryId,
                uploadedBy: user.id,
                fileUrl,
                label: file.name,
                type: file.type === "image" ? "photo" : "other",
              });
            } catch (err) {
              console.error("Failed to upload attachment:", file.name, err);
              // Continue uploading others even if one fails
            }
          }),
        );
      }

      // Notify collaborators about the new activity
      notifyItineraryAdded(
        id,
        trip?.title || "Trip",
        itineraryId,
        title.trim(),
        user.id,
        user.name,
      ).catch(console.error); // Don't block on notification

      router.back();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save activity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer
      style={styles.container}
      backgroundColor={colors.background}
      padded={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <ScreenHeader title="Add Activity" showBack={false} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Category
            </Text>
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
                      backgroundColor:
                        category === cat.id ? cat.color + "15" : colors.card,
                      borderColor:
                        category === cat.id ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={
                      category === cat.id ? cat.color : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      {
                        color:
                          category === cat.id
                            ? cat.color
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              What are you planning?
            </Text>
            <Input
              label="Activity Name"
              placeholder="e.g., Visit Eiffel Tower, Lunch at Cafe..."
              value={title}
              onChangeText={setTitle}
              error={errors.title}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Location and timing will be automatically set based on your trip
              details
            </Text>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Date & Time
            </Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Attachments
            </Text>
            <TouchableOpacity
              style={[styles.attachButton, { borderColor: colors.border }]}
              onPress={handlePickAttachment}
            >
              <Ionicons
                name="attach-outline"
                size={24}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.attachText, { color: colors.textSecondary }]}
              >
                Add photos, tickets, or documents
              </Text>
            </TouchableOpacity>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.attachmentItem,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.type === "image"
                          ? "image-outline"
                          : "document-text-outline"
                      }
                      size={20}
                      color={Colors.primary}
                    />
                    <Text
                      style={[styles.attachmentName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeAttachment(index)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View
          style={[
            styles.bottomContainer,
            { backgroundColor: colors.background },
          ]}
        >
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.screenPadding,
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
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  categoriesContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  helperText: {
    fontSize: FontSizes.bodySmall,
    marginTop: Spacing.xs,
  },
  timeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timeInput: {
    flex: 1,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  attachText: {
    fontSize: FontSizes.body,
  },
  bottomContainer: {
    padding: Spacing.screenPadding,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  attachmentsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: FontSizes.bodySmall,
  },
});
