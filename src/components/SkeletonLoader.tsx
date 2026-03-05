import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../constants/colors';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: isDark ? '#374151' : '#E5E7EB', opacity },
        style,
      ]}
    />
  );
}

export function HomeScreenSkeleton() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header skeleton */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <SkeletonBox width={120} height={20} />
        <SkeletonBox width={80} height={14} style={{ marginTop: 6 }} />
      </View>

      {/* Stats row skeleton */}
      <View style={[styles.statsRow, { backgroundColor: colors.cardBackground }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statItem}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <SkeletonBox width={50} height={16} style={{ marginTop: 8 }} />
            <SkeletonBox width={35} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <SkeletonBox width={140} height={16} />
          <SkeletonBox width="100%" height={12} style={{ marginTop: 10 }} />
          <SkeletonBox width="75%" height={12} style={{ marginTop: 6 }} />
          <SkeletonBox width="90%" height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 48,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  statItem: { alignItems: 'center' },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
});
