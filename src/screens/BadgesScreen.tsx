import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCurrentUser } from '../services/authService';
import {
  ALL_BADGES,
  CATEGORY_LABELS,
  BadgeDef,
  UserStats,
  fetchUserStats,
  checkAndAwardBadges,
} from '../services/badgeService';

// Kategori renk paleti
const CAT_COLORS: Record<string, { border: string; bg: string; glow: string; text: string }> = {
  diet:      { border: '#2f7f33', bg: 'rgba(47,127,51,0.18)',  glow: 'rgba(52,211,153,0.35)', text: '#34d399' },
  water:     { border: '#2DD4BF', bg: 'rgba(45,212,191,0.15)', glow: 'rgba(45,212,191,0.35)', text: '#2DD4BF' },
  exercise:  { border: '#F59E0B', bg: 'rgba(245,158,11,0.15)', glow: 'rgba(251,191,36,0.35)', text: '#FBBF24' },
  mood:      { border: '#EC4899', bg: 'rgba(236,72,153,0.15)', glow: 'rgba(236,72,153,0.35)', text: '#F472B6' },
  streak:    { border: '#EF4444', bg: 'rgba(239,68,68,0.15)',  glow: 'rgba(239,68,68,0.35)',  text: '#F87171' },
  milestone: { border: '#A78BFA', bg: 'rgba(167,139,250,0.15)',glow: 'rgba(167,139,250,0.35)',text: '#A78BFA' },
  photo:     { border: '#60A5FA', bg: 'rgba(96,165,250,0.15)', glow: 'rgba(96,165,250,0.35)', text: '#60A5FA' },
};

// XP hesaplama (her rozet 50 XP)
const XP_PER_BADGE = 50;
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];
const LEVEL_NAMES = ['Başlangıç', 'Gelişen', 'İlerlemiş', 'Uzman', 'Usta', 'Platin Usta'];

function getLevel(xp: number) {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i;
  }
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] ?? LEVEL_THRESHOLDS[level] + 500;
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const progress = Math.min(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100);
  return { level: level + 1, name: LEVEL_NAMES[level], xp, nextXP: nextThreshold, progress };
}

// Hexagon bileşeni
function HexBadge({
  badge, earned, color, size = 52,
}: {
  badge: BadgeDef; earned: boolean; color: typeof CAT_COLORS[string]; size?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(earned ? 1 : 0.95)).current;

  useEffect(() => {
    if (earned) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();
    }
  }, [earned]);

  const inner = size * 0.9;
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', width: size + 12 }}>
      {/* Glow */}
      {earned && (
        <View
          style={[
            styles.hexGlow,
            { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, backgroundColor: color.glow },
          ]}
        />
      )}
      {/* Hex shape */}
      <View
        style={[
          styles.hexWrap,
          {
            width: size,
            height: size * 0.866 * 2 * 0.5 + size * 0.5,
            backgroundColor: earned ? color.bg : '#1E1E2E',
            borderColor: earned ? color.border : 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.48, opacity: earned ? 1 : 0.3 }}>{badge.emoji}</Text>
        {!earned && (
          <View style={styles.hexLockOverlay}>
            <Ionicons name="lock-closed" size={size * 0.22} color="#555" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function BadgesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    dietPlanCount: 0, exerciseLogCount: 0, moodEntryCount: 0,
    consecutiveMoodDays: 0, totalExerciseMinutes: 0,
    waterLogCount: 0, mealPhotoCount: 0, appointmentCount: 0,
  });
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const barAnim = useRef(new Animated.Value(0)).current;

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      const userStats = await fetchUserStats(user.id);
      setStats(userStats);
      await checkAndAwardBadges(user.id);
      const earnedDocs = await getDocs(
        query(collection(db, 'achievements'), where('userId', '==', user.id))
      );
      const earned = new Set(earnedDocs.docs.map((d) => d.data().badgeId as string));
      setEarnedBadgeIds(earned);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const earnedCount = ALL_BADGES.filter((b) => earnedBadgeIds.has(b.id)).length;
  const xp = earnedCount * XP_PER_BADGE;
  const levelInfo = getLevel(xp);

  useEffect(() => {
    if (!loading) {
      Animated.timing(barAnim, {
        toValue: levelInfo.progress / 100,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }
  }, [loading, levelInfo.progress]);

  const categories = Array.from(new Set(ALL_BADGES.map((b) => b.category)));

  const getProgress = (badge: BadgeDef) =>
    badge.getProgress ? badge.getProgress(stats) : { value: 0, text: '' };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark" size={20} color="#34d399" />
          <Text style={styles.headerTitle}>İlerleme Yolculuğum</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Premium Status Kart */}
        <View style={styles.premiumCard}>
          {/* Blur blob */}
          <View style={styles.premiumBlob} />

          <View style={styles.premiumTop}>
            {/* Hex ikon */}
            <View style={styles.premiumHexWrap}>
              <View style={styles.premiumHex}>
                <Text style={{ fontSize: 28 }}>💎</Text>
              </View>
              <View style={styles.premiumHexGlow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumStatus}>PREMIUM STATUS</Text>
              <Text style={styles.premiumLevel}>Seviye {levelInfo.level}: {levelInfo.name}</Text>
            </View>
          </View>

          {/* XP bar */}
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{xp} / {levelInfo.nextXP} XP</Text>
            <Text style={styles.xpPct}>{Math.round(levelInfo.progress)}%</Text>
          </View>
          <View style={styles.xpTrack}>
            <Animated.View
              style={[
                styles.xpFill,
                { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Text style={styles.xpNext}>
            Sonraki Seviye: {LEVEL_NAMES[Math.min(levelInfo.level, LEVEL_NAMES.length - 1)]} Tier
          </Text>

          {/* Rozet sayacı */}
          <View style={styles.premiumBadgeRow}>
            <Text style={styles.premiumBadgeCount}>{earnedCount}</Text>
            <Text style={styles.premiumBadgeLabel}>rozet / {ALL_BADGES.length} toplam</Text>
          </View>
        </View>

        {/* Kategori bazlı rozetler */}
        {categories.map((cat) => {
          const catBadges = ALL_BADGES.filter((b) => b.category === cat);
          const earnedInCat = catBadges.filter((b) => earnedBadgeIds.has(b.id)).length;
          const allEarned = earnedInCat === catBadges.length;
          const color = CAT_COLORS[cat] ?? CAT_COLORS.milestone;

          return (
            <View key={cat} style={styles.catSection}>
              {/* Kategori başlık satırı */}
              <View style={styles.catHeader}>
                <Text style={styles.catTitle}>{CATEGORY_LABELS[cat]}</Text>
                <View
                  style={[
                    styles.catPill,
                    { backgroundColor: allEarned ? color.bg : '#1E2533' },
                  ]}
                >
                  <Text style={[styles.catPillText, { color: allEarned ? color.text : '#64748b' }]}>
                    {earnedInCat} / {catBadges.length}
                  </Text>
                </View>
              </View>

              {/* Rozetler - yatay scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeRow}
              >
                {catBadges.map((badge) => {
                  const earned = earnedBadgeIds.has(badge.id);
                  const prog = !earned ? getProgress(badge) : { value: 0, text: '' };
                  return (
                    <View key={badge.id} style={styles.badgeItem}>
                      <HexBadge badge={badge} earned={earned} color={color} size={52} />
                      <Text
                        style={[styles.badgeName, { color: earned ? '#e2e8f0' : '#475569' }]}
                        numberOfLines={2}
                      >
                        {badge.title}
                      </Text>
                      {!earned && prog.value > 0 && (
                        <View style={styles.miniProgressWrap}>
                          <View style={styles.miniTrack}>
                            <View style={[styles.miniFill, { width: `${prog.value}%`, backgroundColor: color.text }]} />
                          </View>
                          <Text style={[styles.miniProgressTxt, { color: color.text }]}>{prog.text}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#e2e8f0', letterSpacing: 0.3 },

  content: { padding: 16, gap: 24, paddingBottom: 40 },

  // Premium Kart
  premiumCard: {
    backgroundColor: 'rgba(47,127,51,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    gap: 10,
  },
  premiumBlob: {
    position: 'absolute',
    right: -32,
    top: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(47,127,51,0.08)',
  },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  premiumHexWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  premiumHex: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '0deg' }],
  },
  premiumHexGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  premiumStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2f7f33',
    letterSpacing: 2,
    marginBottom: 2,
  },
  premiumLevel: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  xpPct: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  xpTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#2f7f33',
    borderRadius: 3,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  xpNext: { fontSize: 10, color: 'rgba(47,127,51,0.9)', fontWeight: '600' },
  premiumBadgeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  premiumBadgeCount: { fontSize: 28, fontWeight: '800', color: '#34d399' },
  premiumBadgeLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Kategori
  catSection: { gap: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catTitle: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', letterSpacing: 0.3 },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catPillText: { fontSize: 11, fontWeight: '700' },

  // Rozet satırı
  badgeRow: { gap: 16, paddingBottom: 4, paddingHorizontal: 2 },
  badgeItem: { alignItems: 'center', width: 64, gap: 6 },

  // Hex şekil
  hexGlow: {
    position: 'absolute',
    zIndex: 0,
  },
  hexWrap: {
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  hexLockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },

  badgeName: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

  // Mini progress
  miniProgressWrap: { width: 52, gap: 2 },
  miniTrack: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: '#1E293B' },
  miniFill: { height: '100%', borderRadius: 2 },
  miniProgressTxt: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
});
