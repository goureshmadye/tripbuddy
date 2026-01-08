import { ScreenContainer, useScreenPadding } from '@/components/screen-container';
import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    ImageSourcePropType,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface WalkthroughSlide {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
  accentColor: string;
}

// All available images for carousel
const CAROUSEL_IMAGES = [
  require('@/assets/images/carousel_01.jpg'),
  require('@/assets/images/carousel_02.jpg'),
  require('@/assets/images/carousel_03.jpg'),
  require('@/assets/images/carousel_04.jpg'),
];

// Slide content (titles and descriptions)
const SLIDE_CONTENT = [
  {
    title: 'Plan Your Adventures',
    description: 'Create detailed itineraries with maps, activities, and timelines. Everything you need for the perfect trip.',
    accentColor: Colors.primary,
  },
  {
    title: 'Travel Together',
    description: 'Invite friends and family to plan collaboratively. Share ideas, vote on activities, and stay in sync.',
    accentColor: Colors.secondary,
  },
  {
    title: 'Track Expenses',
    description: 'Keep track of shared costs effortlessly. Split bills fairly and settle up with a single tap.',
    accentColor: Colors.accent,
  },
  {
    title: 'Access Anywhere',
    description: 'Your plans are available offline. Access itineraries, documents, and maps without internet.',
    accentColor: Colors.info,
  },
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function WalkthroughScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { top: topInset, bottom: bottomInset } = useScreenPadding();
  const { completeWalkthrough } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Shuffle images on mount - memoize to keep consistent during session
  const slides: WalkthroughSlide[] = useMemo(() => {
    const shuffledImages = shuffleArray(CAROUSEL_IMAGES);
    return SLIDE_CONTENT.map((content, index) => ({
      id: String(index + 1),
      image: shuffledImages[index],
      ...content,
    }));
  }, []);

  const handleComplete = async () => {
    await completeWalkthrough();
    // Navigate to the auth landing page (sign in / sign up options)
    router.replace('/auth');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ 
        index: nextIndex, 
        animated: true,
        viewPosition: 0 
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }).current;

  const renderSlide = ({ item }: { item: WalkthroughSlide }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image 
          source={item.image} 
          style={styles.slideImage} 
          resizeMode="cover"
        />
        <View style={[styles.imageOverlay, { backgroundColor: item.accentColor + '20' }]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.slideTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: Colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <ScreenContainer 
      withTopPadding={false}
      edges={['left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header - overlays the image */}
      <View style={[styles.headerSafeArea, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <TouchableOpacity 
            onPress={handleSkip}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Pagination */}
      {renderPagination()}

      {/* Bottom Button */}
      <View style={[styles.bottomSafeArea, { paddingBottom: Math.max(bottomInset, Spacing.md) }]}>
        <View style={styles.bottomContainer}>
          <Button
            title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            onPress={handleNext}
            fullWidth
            size="lg"
            icon={
              currentIndex === slides.length - 1 
                ? <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                : <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            }
            iconPosition="right"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
  },
  placeholder: {
    width: 60,
  },
  skipButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  skipText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: '#FFFFFF',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
  },
  slide: {
    width,
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: height * 0.55,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  slideTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideDescription: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.pill,
  },
  bottomSafeArea: {
  },
  bottomContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
});
