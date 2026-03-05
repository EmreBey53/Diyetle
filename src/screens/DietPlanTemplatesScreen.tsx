import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { Meal, getMealTypeName, getMealTypeEmoji } from '../models/DietPlan';

const PRESET_TEMPLATES: Omit<DietTemplate, 'id' | 'dietitianId' | 'createdAt'>[] = [
  {
    name: '1500 kcal Dengeli Plan',
    description: 'Orta kalori kısıtlamalı, dengeli makro dağılımlı standart diyet planı.',
    dailyCalorieTarget: 1500,
    dailyWaterGoal: 2.0,
    meals: [
      {
        id: 'p1-breakfast', type: 'breakfast', name: 'Kahvaltı', time: '08:00', totalCalories: 380,
        foods: [
          { id: 'f1', name: 'Yulaf ezmesi', calories: 150, protein: 5, carbs: 27, fat: 3, portion: '50g' },
          { id: 'f2', name: 'Süt (%2)', calories: 80, protein: 6, carbs: 9, fat: 2, portion: '200ml' },
          { id: 'f3', name: 'Muz', calories: 90, protein: 1, carbs: 23, fat: 0, portion: '1 orta' },
          { id: 'f4', name: 'Ceviz', calories: 60, protein: 1, carbs: 1, fat: 6, portion: '3 adet' },
        ],
      },
      {
        id: 'p1-snack1', type: 'snack', name: 'Ara Öğün', time: '10:30', totalCalories: 130,
        foods: [
          { id: 'f5', name: 'Elma', calories: 80, protein: 0, carbs: 21, fat: 0, portion: '1 orta' },
          { id: 'f6', name: 'Lor peyniri', calories: 50, protein: 7, carbs: 2, fat: 1, portion: '50g' },
        ],
      },
      {
        id: 'p1-lunch', type: 'lunch', name: 'Öğle Yemeği', time: '13:00', totalCalories: 480,
        foods: [
          { id: 'f7', name: 'Izgara tavuk göğsü', calories: 165, protein: 31, carbs: 0, fat: 4, portion: '120g' },
          { id: 'f8', name: 'Bulgur pilavı', calories: 150, protein: 5, carbs: 30, fat: 1, portion: '150g (pişmiş)' },
          { id: 'f9', name: 'Mevsim salatası', calories: 60, protein: 2, carbs: 10, fat: 2, portion: '1 porsiyon' },
          { id: 'f10', name: 'Zeytinyağı (salata)', calories: 45, protein: 0, carbs: 0, fat: 5, portion: '1 tatlı kaşığı' },
          { id: 'f11', name: 'Yoğurt (%2)', calories: 60, protein: 5, carbs: 7, fat: 1, portion: '150g' },
        ],
      },
      {
        id: 'p1-snack2', type: 'snack', name: 'İkindi Arası', time: '16:00', totalCalories: 100,
        foods: [
          { id: 'f12', name: 'Badem', calories: 100, protein: 4, carbs: 3, fat: 9, portion: '15g (~12 adet)' },
        ],
      },
      {
        id: 'p1-dinner', type: 'dinner', name: 'Akşam Yemeği', time: '19:00', totalCalories: 410,
        foods: [
          { id: 'f13', name: 'Fırın somon', calories: 200, protein: 28, carbs: 0, fat: 10, portion: '130g' },
          { id: 'f14', name: 'Haşlanmış brokoli', calories: 55, protein: 5, carbs: 10, fat: 0, portion: '200g' },
          { id: 'f15', name: 'Zeytinyağlı patates', calories: 120, protein: 3, carbs: 22, fat: 3, portion: '150g' },
          { id: 'f16', name: 'Cacık', calories: 35, protein: 3, carbs: 3, fat: 1, portion: '100g' },
        ],
      },
    ],
    notes: 'Günde 2-2.5 litre su içmeyi unutmayın. Porsiyonlara dikkat edin.',
  },
  {
    name: '1800 kcal Aktif Yaşam Planı',
    description: 'Düzenli egzersiz yapan bireyler için yüksek proteinli dengeli plan.',
    dailyCalorieTarget: 1800,
    dailyWaterGoal: 2.5,
    meals: [
      {
        id: 'p2-breakfast', type: 'breakfast', name: 'Kahvaltı', time: '07:30', totalCalories: 450,
        foods: [
          { id: 'g1', name: 'Tam buğday ekmeği', calories: 130, protein: 5, carbs: 26, fat: 1, portion: '2 dilim' },
          { id: 'g2', name: 'Haşlanmış yumurta', calories: 140, protein: 12, carbs: 1, fat: 10, portion: '2 adet' },
          { id: 'g3', name: 'Beyaz peynir', calories: 90, protein: 6, carbs: 1, fat: 7, portion: '40g' },
          { id: 'g4', name: 'Domates & salatalık', calories: 30, protein: 1, carbs: 6, fat: 0, portion: '1 porsiyon' },
          { id: 'g5', name: 'Zeytin', calories: 60, protein: 0, carbs: 1, fat: 6, portion: '8 adet' },
        ],
      },
      {
        id: 'p2-snack1', type: 'snack', name: 'Ara Öğün', time: '10:30', totalCalories: 200,
        foods: [
          { id: 'g6', name: 'Yoğurt (%2)', calories: 90, protein: 8, carbs: 10, fat: 2, portion: '200g' },
          { id: 'g7', name: 'Granola', calories: 110, protein: 3, carbs: 18, fat: 4, portion: '30g' },
        ],
      },
      {
        id: 'p2-lunch', type: 'lunch', name: 'Öğle Yemeği', time: '13:00', totalCalories: 560,
        foods: [
          { id: 'g8', name: 'Kırmızı mercimek çorbası', calories: 120, protein: 7, carbs: 20, fat: 2, portion: '1 kase' },
          { id: 'g9', name: 'Izgara köfte', calories: 200, protein: 20, carbs: 0, fat: 13, portion: '100g' },
          { id: 'g10', name: 'Pirinç pilavı', calories: 160, protein: 3, carbs: 35, fat: 1, portion: '150g (pişmiş)' },
          { id: 'g11', name: 'Cacık', calories: 50, protein: 4, carbs: 4, fat: 1, portion: '150g' },
          { id: 'g12', name: 'Meyve (elma)', calories: 80, protein: 0, carbs: 21, fat: 0, portion: '1 orta' },
        ],
      },
      {
        id: 'p2-snack2', type: 'snack', name: 'Egzersiz Sonrası', time: '16:30', totalCalories: 220,
        foods: [
          { id: 'g13', name: 'Muz', calories: 90, protein: 1, carbs: 23, fat: 0, portion: '1 büyük' },
          { id: 'g14', name: 'Süt (%2)', calories: 130, protein: 9, carbs: 13, fat: 3, portion: '300ml' },
        ],
      },
      {
        id: 'p2-dinner', type: 'dinner', name: 'Akşam Yemeği', time: '19:30', totalCalories: 510,
        foods: [
          { id: 'g15', name: 'Fırın tavuk but', calories: 220, protein: 28, carbs: 0, fat: 12, portion: '160g' },
          { id: 'g16', name: 'Sebzeli bulgur', calories: 170, protein: 6, carbs: 34, fat: 2, portion: '200g (pişmiş)' },
          { id: 'g17', name: 'Yeşil salata', calories: 40, protein: 2, carbs: 6, fat: 1, portion: '1 tabak' },
          { id: 'g18', name: 'Zeytinyağı', calories: 45, protein: 0, carbs: 0, fat: 5, portion: '1 tatlı kaşığı' },
          { id: 'g19', name: 'Ayran', calories: 70, protein: 4, carbs: 6, fat: 2, portion: '200ml' },
        ],
      },
    ],
    notes: 'Egzersiz yapılan günlerde ara öğün miktarları artırılabilir. Bol su tüketin.',
  },
  {
    name: '1200 kcal Zayıflama Planı',
    description: 'Düşük kalorili, tokluk hissi yüksek kilo verme diyeti.',
    dailyCalorieTarget: 1200,
    dailyWaterGoal: 2.5,
    meals: [
      {
        id: 'p3-breakfast', type: 'breakfast', name: 'Kahvaltı', time: '08:00', totalCalories: 280,
        foods: [
          { id: 'h1', name: 'Yulaf ezmesi (su ile)', calories: 120, protein: 4, carbs: 22, fat: 2, portion: '40g' },
          { id: 'h2', name: 'Çilek', calories: 50, protein: 1, carbs: 12, fat: 0, portion: '100g' },
          { id: 'h3', name: 'Yoğurt (%0)', calories: 60, protein: 6, carbs: 8, fat: 0, portion: '150g' },
          { id: 'h4', name: 'Tarçın', calories: 0, protein: 0, carbs: 0, fat: 0, portion: '1 çay kaşığı' },
          { id: 'h5', name: 'Haşlanmış yumurta', calories: 70, protein: 6, carbs: 0, fat: 5, portion: '1 adet' },
        ],
      },
      {
        id: 'p3-snack1', type: 'snack', name: 'Ara Öğün', time: '10:30', totalCalories: 80,
        foods: [
          { id: 'h6', name: 'Elma', calories: 80, protein: 0, carbs: 21, fat: 0, portion: '1 orta' },
        ],
      },
      {
        id: 'p3-lunch', type: 'lunch', name: 'Öğle Yemeği', time: '13:00', totalCalories: 380,
        foods: [
          { id: 'h7', name: 'Izgara tavuk göğsü', calories: 130, protein: 25, carbs: 0, fat: 3, portion: '100g' },
          { id: 'h8', name: 'Haşlanmış sebze (karışık)', calories: 80, protein: 3, carbs: 16, fat: 0, portion: '200g' },
          { id: 'h9', name: 'Tam buğday ekmeği', calories: 65, protein: 2, carbs: 13, fat: 1, portion: '1 dilim' },
          { id: 'h10', name: 'Yeşil salata + limon', calories: 35, protein: 1, carbs: 7, fat: 0, portion: '1 tabak' },
          { id: 'h11', name: 'Ayran (light)', calories: 40, protein: 3, carbs: 4, fat: 1, portion: '150ml' },
        ],
      },
      {
        id: 'p3-snack2', type: 'snack', name: 'İkindi Arası', time: '16:00', totalCalories: 90,
        foods: [
          { id: 'h12', name: 'Lor peyniri', calories: 50, protein: 7, carbs: 2, fat: 1, portion: '60g' },
          { id: 'h13', name: 'Salatalık', calories: 16, protein: 1, carbs: 3, fat: 0, portion: '1 orta' },
          { id: 'h14', name: 'Badem', calories: 50, protein: 2, carbs: 2, fat: 4, portion: '8 adet' },
        ],
      },
      {
        id: 'p3-dinner', type: 'dinner', name: 'Akşam Yemeği', time: '19:00', totalCalories: 370,
        foods: [
          { id: 'h15', name: 'Izgara balık (levrek)', calories: 150, protein: 24, carbs: 0, fat: 6, portion: '150g' },
          { id: 'h16', name: 'Buharda brokoli + karnabahar', calories: 70, protein: 5, carbs: 13, fat: 0, portion: '250g' },
          { id: 'h17', name: 'Zeytinyağı', calories: 45, protein: 0, carbs: 0, fat: 5, portion: '1 tatlı kaşığı' },
          { id: 'h18', name: 'Domates', calories: 35, protein: 1, carbs: 7, fat: 0, portion: '2 orta' },
          { id: 'h19', name: 'Yoğurt (%0)', calories: 60, protein: 6, carbs: 8, fat: 0, portion: '150g' },
        ],
      },
    ],
    notes: 'Günde 2.5 litre su içmeyi hedefleyin. Yemekleri yavaş yiyin. Geç saatte yemek yemekten kaçının.',
  },
  {
    name: 'Düşük Karbonhidrat Planı',
    description: 'Karbonhidrat kısıtlı, protein ve yağ ağırlıklı beslenme planı.',
    dailyCalorieTarget: 1600,
    dailyWaterGoal: 2.5,
    meals: [
      {
        id: 'p4-breakfast', type: 'breakfast', name: 'Kahvaltı', time: '08:00', totalCalories: 420,
        foods: [
          { id: 'k1', name: 'Omlet (3 yumurta)', calories: 200, protein: 18, carbs: 2, fat: 14, portion: '3 adet yumurta' },
          { id: 'k2', name: 'Beyaz peynir', calories: 110, protein: 7, carbs: 1, fat: 9, portion: '50g' },
          { id: 'k3', name: 'Avokado', calories: 80, protein: 1, carbs: 4, fat: 7, portion: '1/2 orta' },
          { id: 'k4', name: 'Zeytin', calories: 60, protein: 0, carbs: 1, fat: 6, portion: '10 adet' },
        ],
      },
      {
        id: 'p4-snack1', type: 'snack', name: 'Ara Öğün', time: '11:00', totalCalories: 160,
        foods: [
          { id: 'k5', name: 'Ceviz', calories: 100, protein: 2, carbs: 2, fat: 10, portion: '5 adet' },
          { id: 'k6', name: 'Badem', calories: 60, protein: 2, carbs: 2, fat: 5, portion: '10 adet' },
        ],
      },
      {
        id: 'p4-lunch', type: 'lunch', name: 'Öğle Yemeği', time: '13:00', totalCalories: 520,
        foods: [
          { id: 'k7', name: 'Izgara somon', calories: 230, protein: 30, carbs: 0, fat: 12, portion: '150g' },
          { id: 'k8', name: 'Karışık yeşil salata', calories: 60, protein: 2, carbs: 8, fat: 2, portion: '1 büyük tabak' },
          { id: 'k9', name: 'Zeytinyağı + limon sos', calories: 90, protein: 0, carbs: 1, fat: 10, portion: '2 tatlı kaşığı' },
          { id: 'k10', name: 'Haşlanmış brokoli', calories: 55, protein: 4, carbs: 9, fat: 0, portion: '150g' },
          { id: 'k11', name: 'Ayran', calories: 50, protein: 3, carbs: 5, fat: 1, portion: '150ml' },
        ],
      },
      {
        id: 'p4-snack2', type: 'snack', name: 'İkindi Arası', time: '16:00', totalCalories: 100,
        foods: [
          { id: 'k12', name: 'Lor peyniri', calories: 60, protein: 8, carbs: 2, fat: 2, portion: '70g' },
          { id: 'k13', name: 'Salatalık dilimleri', calories: 16, protein: 1, carbs: 3, fat: 0, portion: '1 orta' },
        ],
      },
      {
        id: 'p4-dinner', type: 'dinner', name: 'Akşam Yemeği', time: '19:30', totalCalories: 480,
        foods: [
          { id: 'k14', name: 'Fırın tavuk (derili)', calories: 250, protein: 30, carbs: 0, fat: 14, portion: '160g' },
          { id: 'k15', name: 'Zeytinyağlı ıspanak kavurma', calories: 120, protein: 4, carbs: 6, fat: 9, portion: '200g' },
          { id: 'k16', name: 'Yoğurt (%2)', calories: 90, protein: 6, carbs: 10, fat: 2, portion: '200g' },
          { id: 'k17', name: 'Domates', calories: 35, protein: 1, carbs: 7, fat: 0, portion: '2 orta' },
        ],
      },
    ],
    notes: 'Ekmek, pirinç, makarna, şeker tüketimini sınırlayın. Su ve bitki çayı tercih edin.',
  },
];

export interface DietTemplate {
  id?: string;
  dietitianId: string;
  name: string;
  description?: string;
  dailyCalorieTarget?: number;
  dailyWaterGoal?: number;
  meals: Meal[];
  notes?: string;
  createdAt: Date;
}

interface Props {
  navigation: any;
  route: any;
}

export default function DietPlanTemplatesScreen({ navigation, route }: Props) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  // route.params üzerinden mevcut plan bilgisi gelebilir (şablon kaydetme için)
  const currentPlan = route?.params?.currentPlan as {
    title: string;
    meals: Meal[];
    dailyCalorieTarget?: number;
    dailyWaterGoal?: number;
    notes?: string;
    description?: string;
  } | undefined;

  const onSelectTemplate = route?.params?.onSelectTemplate as ((t: DietTemplate) => void) | undefined;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);

      const q = query(
        collection(db, 'diet_templates'),
        where('dietitianId', '==', user.id),
      );
      const snap = await getDocs(q);
      const data: DietTemplate[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt),
      } as DietTemplate));

      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTemplates(data);
    } catch {
      Alert.alert('Hata', 'Şablonlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Hata', 'Şablon adı girin.');
      return;
    }
    if (!currentPlan) return;

    try {
      setSaving(true);
      const template: Omit<DietTemplate, 'id'> = {
        dietitianId: userId,
        name: templateName.trim(),
        description: currentPlan.description,
        dailyCalorieTarget: currentPlan.dailyCalorieTarget,
        dailyWaterGoal: currentPlan.dailyWaterGoal,
        meals: currentPlan.meals,
        notes: currentPlan.notes,
        createdAt: new Date(),
      };
      await addDoc(collection(db, 'diet_templates'), {
        ...template,
        createdAt: Timestamp.fromDate(template.createdAt),
      });
      Alert.alert('Kaydedildi', `"${templateName}" şablonu kaydedildi.`);
      setSaveModalVisible(false);
      setTemplateName('');
      await load();
    } catch {
      Alert.alert('Hata', 'Şablon kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = (template: DietTemplate) => {
    Alert.alert('Şablonu Sil', `"${template.name}" şablonu silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'diet_templates', template.id!));
            setTemplates((prev) => prev.filter((t) => t.id !== template.id));
          } catch {
            Alert.alert('Hata', 'Silinemedi.');
          }
        },
      },
    ]);
  };

  const selectTemplate = (template: DietTemplate) => {
    if (onSelectTemplate) {
      Alert.alert(
        'Şablonu Yükle',
        `"${template.name}" şablonu mevcut planın üzerine yüklensin mi?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Yükle',
            onPress: () => {
              onSelectTemplate(template);
              navigation.goBack();
            },
          },
        ],
      );
    }
  };

  const renderTemplate = ({ item }: { item: DietTemplate }) => {
    const totalCals = item.meals.reduce((s, m) => s + m.totalCalories, 0);
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.cardBody}
          onPress={() => selectTemplate(item)}
          activeOpacity={onSelectTemplate ? 0.7 : 1}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {item.dailyCalorieTarget ? (
              <View style={[styles.calBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.calBadgeText, { color: colors.primary }]}>{item.dailyCalorieTarget} kcal</Text>
              </View>
            ) : totalCals > 0 ? (
              <View style={[styles.calBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.calBadgeText, { color: colors.primary }]}>{totalCals} kcal</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.mealRow}>
            {item.meals.map((m) => (
              <View key={m.id} style={[styles.mealChip, { backgroundColor: colors.border }]}>
                <Text style={styles.mealChipEmoji}>{getMealTypeEmoji(m.type)}</Text>
                <Text style={[styles.mealChipText, { color: colors.text }]}>{getMealTypeName(m.type)}</Text>
                <Text style={[styles.mealChipCount, { color: colors.textLight }]}>{m.foods.length} besin</Text>
              </View>
            ))}
          </View>

          {item.notes ? (
            <Text style={[styles.cardNotes, { color: colors.textLight }]} numberOfLines={2}>{item.notes}</Text>
          ) : null}

          <Text style={[styles.cardDate, { color: colors.textLight }]}>
            {item.createdAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteTemplate(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Diyet Şablonları</Text>
        {currentPlan ? (
          <TouchableOpacity onPress={() => setSaveModalVisible(true)} style={styles.backBtn}>
            <Ionicons name="save-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id!}
          renderItem={renderTemplate}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz Şablon Yok</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>
                Diyet planı oluştururken 💾 ikonuna basarak kendi şablonlarınızı ekleyin.
              </Text>
              {currentPlan && (
                <TouchableOpacity
                  style={[styles.saveBtnLarge, { backgroundColor: colors.primary }]}
                  onPress={() => setSaveModalVisible(true)}
                >
                  <Ionicons name="save-outline" size={20} color="#FFF" />
                  <Text style={styles.saveBtnText}>Mevcut Planı Şablon Kaydet</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListHeaderComponent={
            <View>
              {onSelectTemplate && templates.length > 0 && (
                <Text style={[styles.hint, { color: colors.textLight }]}>
                  Bir şablona dokunarak planınıza yükleyebilirsiniz.
                </Text>
              )}
              {/* Hazır Şablonlar */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Hazır Şablonlar</Text>
              {PRESET_TEMPLATES.map((preset) => {
                const totalCals = preset.meals.reduce((s, m) => s + m.totalCalories, 0);
                const presetAsTemplate: DietTemplate = {
                  ...preset,
                  id: '__preset__' + preset.name,
                  dietitianId: '',
                  createdAt: new Date(),
                };
                return (
                  <View key={preset.name} style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }, styles.presetCard]}>
                    <TouchableOpacity
                      style={styles.cardBody}
                      onPress={() => onSelectTemplate ? selectTemplate(presetAsTemplate) : undefined}
                      activeOpacity={onSelectTemplate ? 0.7 : 1}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{preset.name}</Text>
                        <View style={[styles.calBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.calBadgeText, { color: colors.primary }]}>
                            {preset.dailyCalorieTarget ?? totalCals} kcal
                          </Text>
                        </View>
                      </View>
                      {preset.description ? (
                        <Text style={[styles.cardNotes, { color: colors.textLight }]} numberOfLines={2}>{preset.description}</Text>
                      ) : null}
                      <View style={styles.mealRow}>
                        {preset.meals.map((m) => (
                          <View key={m.id} style={[styles.mealChip, { backgroundColor: colors.border }]}>
                            <Text style={styles.mealChipEmoji}>{getMealTypeEmoji(m.type)}</Text>
                            <Text style={[styles.mealChipText, { color: colors.text }]}>{getMealTypeName(m.type)}</Text>
                            <Text style={[styles.mealChipCount, { color: colors.textLight }]}>{m.foods.length} besin</Text>
                          </View>
                        ))}
                      </View>
                      {onSelectTemplate ? (
                        <View style={[styles.usePresetBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                          <Ionicons name="arrow-down-circle-outline" size={16} color={colors.primary} />
                          <Text style={[styles.usePresetText, { color: colors.primary }]}>Bu şablonu kullan</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
              {templates.length > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>📁 Kayıtlı Şablonlarım</Text>
              )}
            </View>
          }
        />
      )}

      {/* Şablon Adı Modal */}
      <Modal visible={saveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Şablon Adı</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Örn: Düşük Karbonhidrat Planı"
              placeholderTextColor={colors.textLight}
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => { setSaveModalVisible(false); setTemplateName(''); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textLight }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={saveTemplate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, marginBottom: 12 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  cardBody: { flex: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  calBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  calBadgeText: { fontSize: 12, fontWeight: '600' },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mealChipEmoji: { fontSize: 14 },
  mealChipText: { fontSize: 12, fontWeight: '600' },
  mealChipCount: { fontSize: 11 },
  cardNotes: { fontSize: 12, lineHeight: 17 },
  cardDate: { fontSize: 11 },
  deleteBtn: { paddingLeft: 12, paddingTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  presetCard: { marginBottom: 10 },
  usePresetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, alignSelf: 'flex-start', marginTop: 4,
  },
  usePresetText: { fontSize: 13, fontWeight: '600' },
  saveBtnLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: { width: '100%', borderRadius: 16, padding: 20, gap: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 15,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnPrimaryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
