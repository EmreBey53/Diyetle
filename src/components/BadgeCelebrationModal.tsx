import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { BadgeDef } from '../services/badgeService';

interface Props {
  badge: BadgeDef | null;
  visible: boolean;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF922B', '#CC5DE8', '#F06595', '#38D9A9'];

export default function BadgeCelebrationModal({ badge, visible, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const confettiAnims = useRef(
    CONFETTI_COLORS.map(() => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      confettiAnims.forEach((c) => {
        c.y.setValue(0);
        c.x.setValue(0);
        c.opacity.setValue(1);
        c.scale.setValue(1);
      });

      // Overlay fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Emoji scale spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }).start();

      // Konfeti animasyonu
      const confettiAnimations = confettiAnims.map((c, i) => {
        const angle = (i / CONFETTI_COLORS.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        const targetX = Math.cos(angle) * distance;
        const targetY = -100 - Math.random() * 80;

        return Animated.parallel([
          Animated.timing(c.y, { toValue: targetY, duration: 700, useNativeDriver: true }),
          Animated.timing(c.x, { toValue: targetX, duration: 700, useNativeDriver: true }),
          Animated.timing(c.opacity, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
          Animated.timing(c.scale, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]);
      });

      Animated.parallel(confettiAnimations).start();
    }
  }, [visible]);

  if (!badge) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <View style={styles.card}>
          {/* Konfeti parçacıkları */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {confettiAnims.map((c, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.confettiDot,
                  {
                    backgroundColor: CONFETTI_COLORS[i],
                    transform: [
                      { translateY: c.y },
                      { translateX: c.x },
                      { scale: c.scale },
                    ],
                    opacity: c.opacity,
                  },
                ]}
              />
            ))}
          </View>

          {/* Rozet emoji */}
          <Animated.Text
            style={[styles.badgeEmoji, { transform: [{ scale: scaleAnim }] }]}
          >
            {badge.emoji}
          </Animated.Text>

          <Text style={styles.congratsText}>Tebrikler!</Text>
          <Text style={styles.badgeTitle}>{badge.title}</Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>

          <Text style={styles.newBadgeLabel}>YENİ ROZET KAZANILDI</Text>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Harika! 🎉</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'visible',
  },
  confettiContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
    top: '40%',
    alignSelf: 'center',
  },
  confettiDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgeEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  congratsText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  badgeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  newBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1.2,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  closeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
