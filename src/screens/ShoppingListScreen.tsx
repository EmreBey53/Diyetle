import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { getActiveDietPlans } from '../services/dietPlanService';
import { Meal, getMealTypeName, getMealTypeEmoji } from '../models/DietPlan';

interface ShoppingItem {
  id: string;
  name: string;
  portion?: string;
  mealType: Meal['type'] | 'custom';
  mealName: string;
  checked: boolean;
  isCustom?: boolean;
}

const STORAGE_KEY_CHECKED = 'shopping_checked_ids';
const STORAGE_KEY_CUSTOM = 'shopping_custom_items';
const STORAGE_KEY_PLAN_ID = 'shopping_plan_id';

export default function ShoppingListScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [planTitle, setPlanTitle] = useState('');
  const [hasPlan, setHasPlan] = useState(true);

  // Manuel ekleme
  const [addText, setAddText] = useState('');
  const [addPortion, setAddPortion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadChecked = async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_CHECKED);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveChecked = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...ids]));
    } catch {}
  };

  const loadCustomItems = async (): Promise<ShoppingItem[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveCustomItems = async (customItems: ShoppingItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customItems));
    } catch {}
  };

  const loadShoppingList = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      const profile = await getPatientProfileByUserId(user.id);
      if (!profile) return;

      const [savedPlanId, checkedIds, customItems, plans] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_PLAN_ID).catch(() => null),
        loadChecked(),
        loadCustomItems(),
        getActiveDietPlans(profile.id!).catch(() => []),
      ]);

      if (plans.length === 0) {
        setHasPlan(false);
        const customWithChecked = customItems.map((i) => ({
          ...i,
          checked: checkedIds.has(i.id),
        }));
        setItems(customWithChecked);
        return;
      }

      setHasPlan(true);
      const plan = plans[0];
      setPlanTitle(plan.title);

      // Plan degisti mi kontrol et — degistiyse checked sifirla
      let effectiveChecked = checkedIds;
      if (plan.id && savedPlanId && savedPlanId !== plan.id) {
        // Yeni diyet plani — isaretleri temizle, custom'ları koru
        effectiveChecked = new Set<string>();
        await saveChecked(effectiveChecked);
        await AsyncStorage.setItem(STORAGE_KEY_PLAN_ID, plan.id);
        Alert.alert(
          'Yeni Diyet Planı',
          'Diyetisyeniniz planınızı güncelledi. Alışveriş listesi yeni plana göre yenilendi.',
          [{ text: 'Tamam' }]
        );
      } else if (plan.id && !savedPlanId) {
        await AsyncStorage.setItem(STORAGE_KEY_PLAN_ID, plan.id);
      }

      const planItems: ShoppingItem[] = [];
      plan.meals.forEach((meal) => {
        meal.foods.forEach((food) => {
          planItems.push({
            id: `${meal.id}-${food.id}`,
            name: food.name,
            portion: food.portion,
            mealType: meal.type,
            mealName: meal.name || getMealTypeName(meal.type),
            checked: effectiveChecked.has(`${meal.id}-${food.id}`),
            isCustom: false,
          });
        });
      });

      // Tekrar edenleri birlestir (aynı isimli besinler)
      const merged: ShoppingItem[] = [];
      planItems.forEach((item) => {
        const existing = merged.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
        if (!existing) merged.push(item);
      });

      const customWithChecked = customItems.map((i) => ({
        ...i,
        checked: effectiveChecked.has(i.id),
      }));

      setItems([...merged, ...customWithChecked]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ekrana her odaklanmada (geri gelindiginde de) taze veri cek
  useFocusEffect(useCallback(() => { loadShoppingList(); }, [loadShoppingList]));

  const toggleItem = async (id: string) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    const checkedIds = new Set(newItems.filter((i) => i.checked).map((i) => i.id));
    await saveChecked(checkedIds);
  };

  const clearChecked = () => {
    Alert.alert('Tamamlananları Sil', 'İşaretlenen ürünler listeden kaldırılsın mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const remaining = items.filter((i) => !i.checked);
          setItems(remaining);
          const remainingCustom = remaining.filter((i) => i.isCustom);
          await saveCustomItems(remainingCustom);
          await saveChecked(new Set());
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    const name = addText.trim();
    if (!name) return;
    const newItem: ShoppingItem = {
      id: `custom-${Date.now()}`,
      name,
      portion: addPortion.trim() || undefined,
      mealType: 'custom',
      mealName: 'Ekstra',
      checked: false,
      isCustom: true,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    const customItems = newItems.filter((i) => i.isCustom);
    await saveCustomItems(customItems);
    setAddText('');
    setAddPortion('');
    setShowAddForm(false);
  };

  const shareList = async () => {
    const unchecked = items.filter((i) => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('Liste boş', 'Paylaşılacak ürün kalmadı.');
      return;
    }
    const header = planTitle ? `Alışveriş Listesi (${planTitle})\n\n` : 'Alışveriş Listesi\n\n';
    const text = header + unchecked.map((i) => `• ${i.name}${i.portion ? ` (${i.portion})` : ''}`).join('\n');
    await Share.share({ message: text });
  };

  const checkedCount = items.filter((i) => i.checked).length;

  const planItems = items.filter((i) => !i.isCustom);
  const customItems = items.filter((i) => i.isCustom);

  const grouped = planItems.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.mealType as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const mealOrder: Array<Meal['type']> = ['breakfast', 'lunch', 'dinner', 'snack'];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Alışveriş Listesi</Text>
          {planTitle ? (
            <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>{planTitle}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={shareList} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View> 

      {/* Progress bar */}
      {items.length > 0 && (
        <View style={[styles.progressRow, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.textLight }]}>
              {checkedCount}/{items.length} tamamlandı
            </Text>
            {checkedCount > 0 && (
              <TouchableOpacity onPress={clearChecked}>
                <Text style={[styles.clearText, { color: colors.error || '#EF4444' }]}>Tamamlananları sil</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${(checkedCount / items.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.listContent, isEmpty && styles.listContentCenter]}>
        {/* Bos state */}
        {isEmpty && !showAddForm && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={72} color={colors.textLight} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasPlan ? 'Besin Tanımlanmamış' : 'Diyet Planı Yok'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>
              {hasPlan
                ? 'Diyet planınızdaki öğünlere henüz besin eklenmemiş. Diyetisyeniniz planı güncelleyince liste otomatik dolacak.'
                : 'Diyetisyeniniz henüz bir plan oluşturmadı. Plan hazır olduğunda besinler buraya otomatik eklenecek.'}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.primary }]}>
              Aşağıdan kendi ürünlerinizi ekleyebilirsiniz.
            </Text>
          </View>
        )}

        {/* Plan ogunleri */}
        {mealOrder.map((mealType) => {
          const group = grouped[mealType];
          if (!group || group.length === 0) return null;
          return (
            <View key={mealType} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>{getMealTypeEmoji(mealType)}</Text>
                <Text style={[styles.groupTitle, { color: colors.text }]}>{getMealTypeName(mealType)}</Text>
                <View style={[styles.groupBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.groupBadgeText, { color: colors.primary }]}>{group.length}</Text>
                </View>
              </View>
              {group.map((item) => (
                <ShoppingItemRow key={item.id} item={item} colors={colors} onToggle={toggleItem} />
              ))}
            </View>
          );
        })}

        {/* Manuel eklenenler */}
        {customItems.length > 0 && (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupEmoji}>{'✏️'}</Text>
              <Text style={[styles.groupTitle, { color: colors.text }]}>Ekstra Ürünler</Text>
              <View style={[styles.groupBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.groupBadgeText, { color: colors.primary }]}>{customItems.length}</Text>
              </View>
            </View>
            {customItems.map((item) => (
              <ShoppingItemRow key={item.id} item={item} colors={colors} onToggle={toggleItem} />
            ))}
          </View>
        )}

        {/* Manuel ekleme formu */}
        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.addFormTitle, { color: colors.text }]}>Ürün Ekle</Text>
            <TextInput
              ref={inputRef}
              style={[styles.addInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Ürün adı (örn. Süt, Yumurta)"
              placeholderTextColor={colors.textLight}
              value={addText}
              onChangeText={setAddText}
              returnKeyType="next"
              autoFocus
            />
            <TextInput
              style={[styles.addInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Miktar (opsiyonel, orn. 2 lt, 6 adet)"
              placeholderTextColor={colors.textLight}
              value={addPortion}
              onChangeText={setAddPortion}
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
            />
            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={[styles.addFormBtn, styles.addFormBtnCancel, { borderColor: colors.border }]}
                onPress={() => { setShowAddForm(false); setAddText(''); setAddPortion(''); }}
              >
                <Text style={[styles.addFormBtnText, { color: colors.textLight }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addFormBtn, { backgroundColor: colors.primary, opacity: addText.trim() ? 1 : 0.5 }]}
                onPress={handleAddItem}
                disabled={!addText.trim()}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addFormBtnConfirmText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Alt buton: Ürün Ekle */}
      {!showAddForm && (
        <View style={[styles.addBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.addBarBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setShowAddForm(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBarBtnText}>Ürün Ekle</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ShoppingItemRow({
  item,
  colors,
  onToggle,
}: {
  item: ShoppingItem;
  colors: ReturnType<typeof getColors>;
  onToggle: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: colors.cardBackground,
          borderColor: item.checked ? colors.primary + '40' : colors.border,
        },
      ]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: item.checked ? colors.primary : colors.border,
            backgroundColor: item.checked ? colors.primary : 'transparent',
          },
        ]}
      >
        {item.checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            { color: item.checked ? colors.textLight : colors.text },
            item.checked && styles.itemChecked,
          ]}
        >
          {item.name}
        </Text>
        {item.portion ? (
          <Text style={[styles.itemPortion, { color: colors.textLight }]}>{item.portion}</Text>
        ) : null}
      </View>
      {item.checked && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, gap: 12,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  progressRow: {
    paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1,
  },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  clearText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, gap: 20, paddingBottom: 40 },
  listContentCenter: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyHint: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  groupEmoji: { fontSize: 18 },
  groupTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  groupBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  groupBadgeText: { fontSize: 12, fontWeight: '700' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: 12, borderWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemChecked: { textDecorationLine: 'line-through' },
  itemPortion: { fontSize: 12, marginTop: 2 },
  addForm: {
    borderRadius: 14, borderWidth: 1, padding: 16, gap: 12,
  },
  addFormTitle: { fontSize: 15, fontWeight: '700' },
  addInput: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15,
  },
  addFormActions: { flexDirection: 'row', gap: 10 },
  addFormBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  addFormBtnCancel: { borderWidth: 1 },
  addFormBtnText: { fontSize: 15, fontWeight: '600' },
  addFormBtnConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  addBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
  },
  addBarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  addBarBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
