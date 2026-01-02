// Gemini AI Service for Trip Planning
import { ItineraryItem } from '@/types/database';
import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';

// Get API key from Expo constants (works in both dev and production builds)
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 
                       process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
                       '';

// Lazy initialization of Gemini client to prevent crashes
let aiClient: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your environment.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiClient;
};

export interface TripPreferences {
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate: Date;
  endDate: Date;
  tripType?: string | null;
  transportMode?: string | null;
  budgetRange?: string | null;
  travelerCount?: string | null;
  accommodationType?: string | null;
  currency: string;
}

export interface GeneratedPlace {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  estimatedDuration: string;
  estimatedCost: number;
  bestTimeToVisit?: string;
  tips?: string;
}

export interface GeneratedDayPlan {
  day: number;
  date: string;
  title: string;
  places: GeneratedPlace[];
  meals: {
    breakfast?: GeneratedPlace;
    lunch?: GeneratedPlace;
    dinner?: GeneratedPlace;
  };
  transport?: {
    mode: string;
    estimatedCost: number;
    notes?: string;
  };
}

export interface GeneratedExpenseBreakdown {
  category: string;
  estimatedAmount: number;
  currency: string;
  notes?: string;
}

export interface GeneratedTripPlan {
  summary: string;
  highlights: string[];
  itinerary: GeneratedDayPlan[];
  mapLocations: GeneratedPlace[];
  expenseBreakdown: GeneratedExpenseBreakdown[];
  totalEstimatedCost: number;
  currency: string;
  tips: string[];
  packingList?: string[];
}

const buildPrompt = (preferences: TripPreferences): string => {
  const tripDays = Math.ceil(
    (preferences.endDate.getTime() - preferences.startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Limit to max 5 days to keep response size manageable
  const planDays = Math.min(tripDays, 5);

  const budgetDescriptions: Record<string, string> = {
    budget: 'budget-friendly',
    moderate: 'moderate spending',
    luxury: 'luxury',
    premium: 'ultra-premium',
  };

  const travelerDescriptions: Record<string, string> = {
    '1': 'solo traveler',
    '2': 'couple',
    '3-5': 'small group',
    '6+': 'large group',
  };

  // Format dates for the itinerary
  const startDate = preferences.startDate;
  const dates = Array.from({ length: planDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Reference coordinates if available
  const refLat = preferences.destinationLat || null;
  const refLng = preferences.destinationLng || null;
  const coordsHint = refLat && refLng 
    ? `The destination center is at latitude ${refLat}, longitude ${refLng}. All places should be real locations near these coordinates.`
    : `Use REAL GPS coordinates for each place in ${preferences.destination}. Look up actual latitude/longitude values.`;

  return `Create a ${planDays}-day trip plan for ${preferences.destination}. Budget: ${budgetDescriptions[preferences.budgetRange || 'moderate'] || 'moderate'}. Travelers: ${travelerDescriptions[preferences.travelerCount || '2'] || 'couple'}. Currency: ${preferences.currency}.

CRITICAL: ${coordsHint}
DO NOT use placeholder coordinates like 0.0, 0.0. Each place MUST have accurate real-world GPS coordinates.

Return ONLY this JSON (no markdown):
{
  "summary": "2 sentence trip summary",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "itinerary": [
    ${dates.map((date, i) => `{
      "day": ${i + 1},
      "date": "${date}",
      "title": "Day ${i + 1} title",
      "places": [
        {"name": "Real Place Name", "description": "Brief desc", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "sightseeing", "estimatedDuration": "2h", "estimatedCost": 0},
        {"name": "Real Place Name", "description": "Brief desc", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "activity", "estimatedDuration": "2h", "estimatedCost": 0}
      ],
      "meals": {
        "breakfast": {"name": "Real Restaurant", "description": "Desc", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "food", "estimatedDuration": "1h", "estimatedCost": 0},
        "lunch": {"name": "Real Restaurant", "description": "Desc", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "food", "estimatedDuration": "1h", "estimatedCost": 0},
        "dinner": {"name": "Real Restaurant", "description": "Desc", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "food", "estimatedDuration": "1h", "estimatedCost": 0}
      }
    }`).join(',\n    ')}
  ],
  "mapLocations": [
    {"name": "Top spot 1", "description": "Why visit", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "sightseeing", "estimatedDuration": "2h", "estimatedCost": 0},
    {"name": "Top spot 2", "description": "Why visit", "latitude": REAL_LAT, "longitude": REAL_LNG, "category": "activity", "estimatedDuration": "2h", "estimatedCost": 0}
  ],
  "expenseBreakdown": [
    {"category": "Accommodation", "estimatedAmount": 0, "currency": "${preferences.currency}", "notes": ""},
    {"category": "Food", "estimatedAmount": 0, "currency": "${preferences.currency}", "notes": ""},
    {"category": "Transport", "estimatedAmount": 0, "currency": "${preferences.currency}", "notes": ""},
    {"category": "Activities", "estimatedAmount": 0, "currency": "${preferences.currency}", "notes": ""}
  ],
  "totalEstimatedCost": 0,
  "currency": "${preferences.currency}",
  "tips": ["tip1", "tip2", "tip3"],
  "packingList": ["item1", "item2", "item3"]
}

Replace REAL_LAT and REAL_LNG with actual GPS coordinates. Costs in ${preferences.currency}.`
};

export const generateTripPlan = async (preferences: TripPreferences): Promise<GeneratedTripPlan> => {
  const prompt = buildPrompt(preferences);

  try {
    // Get the AI client (lazy initialization)
    const ai = getAIClient();
    
    // Use the official Gemini SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 16384, // Increased for larger responses
      },
    });

    // Get the response text
    const generatedText = response.text;
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    console.log('Raw Gemini response length:', generatedText.length);

    // Clean the response - remove markdown code blocks if present
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    // Validate JSON structure before parsing
    if (!cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
      console.error('Invalid JSON structure. First 100 chars:', cleanedText.substring(0, 100));
      console.error('Last 100 chars:', cleanedText.substring(cleanedText.length - 100));
      throw new Error('Response is not valid JSON - may be truncated');
    }

    // Parse the JSON response
    let tripPlan: GeneratedTripPlan;
    try {
      tripPlan = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON Parse Error. Response length:', cleanedText.length);
      console.error('First 500 chars:', cleanedText.substring(0, 500));
      console.error('Last 500 chars:', cleanedText.substring(cleanedText.length - 500));
      throw parseError;
    }
    
    return tripPlan;
  } catch (error) {
    console.error('Error generating trip plan:', error);
    throw error;
  }
};

// Convert generated places to itinerary items format
export const convertToItineraryItems = (
  tripPlan: GeneratedTripPlan,
  tripId: string,
  userId: string
): Omit<ItineraryItem, 'id' | 'createdAt'>[] => {
  const items: Omit<ItineraryItem, 'id' | 'createdAt'>[] = [];

  tripPlan.itinerary.forEach((day) => {
    const dayDate = new Date(day.date);

    // Add places
    day.places.forEach((place, index) => {
      const startHour = 9 + index * 2; // Rough scheduling
      const startTime = new Date(dayDate);
      startTime.setHours(startHour, 0, 0, 0);

      items.push({
        tripId,
        title: place.name,
        description: place.description,
        location: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category as ItineraryItem['category'],
        startTime,
        endTime: null,
        addedBy: userId,
      });
    });

    // Add meals
    if (day.meals.breakfast) {
      const breakfastTime = new Date(dayDate);
      breakfastTime.setHours(8, 0, 0, 0);
      items.push({
        tripId,
        title: `Breakfast: ${day.meals.breakfast.name}`,
        description: day.meals.breakfast.description,
        location: day.meals.breakfast.name,
        latitude: day.meals.breakfast.latitude,
        longitude: day.meals.breakfast.longitude,
        category: 'food',
        startTime: breakfastTime,
        endTime: null,
        addedBy: userId,
      });
    }

    if (day.meals.lunch) {
      const lunchTime = new Date(dayDate);
      lunchTime.setHours(12, 30, 0, 0);
      items.push({
        tripId,
        title: `Lunch: ${day.meals.lunch.name}`,
        description: day.meals.lunch.description,
        location: day.meals.lunch.name,
        latitude: day.meals.lunch.latitude,
        longitude: day.meals.lunch.longitude,
        category: 'food',
        startTime: lunchTime,
        endTime: null,
        addedBy: userId,
      });
    }

    if (day.meals.dinner) {
      const dinnerTime = new Date(dayDate);
      dinnerTime.setHours(19, 0, 0, 0);
      items.push({
        tripId,
        title: `Dinner: ${day.meals.dinner.name}`,
        description: day.meals.dinner.description,
        location: day.meals.dinner.name,
        latitude: day.meals.dinner.latitude,
        longitude: day.meals.dinner.longitude,
        category: 'food',
        startTime: dinnerTime,
        endTime: null,
        addedBy: userId,
      });
    }
  });

  return items;
};

// Convert expense breakdown to expenses format
export const convertToExpenses = (
  tripPlan: GeneratedTripPlan,
  tripId: string,
  userId: string
): { title: string; amount: number; currency: string; tripId: string; paidBy: string }[] => {
  return tripPlan.expenseBreakdown.map((expense) => ({
    tripId,
    title: expense.category,
    amount: expense.estimatedAmount,
    currency: expense.currency,
    paidBy: userId,
  }));
};
