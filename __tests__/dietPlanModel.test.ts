import {
  calculateTotalCalories,
  getMealTypeName,
  getMealTypeEmoji,
  getDaysUntilExpiry,
  isExpired,
  getDietStatus,
  getDayName,
  formatExpiryInfo,
  getStatusColor,
  getStatusEmoji,
  Meal,
  DietPlan,
} from '../src/models/DietPlan';

const makeMeal = (calories: number, type: Meal['type'] = 'lunch'): Meal => ({
  id: 'meal1',
  type,
  name: 'Test Öğünü',
  foods: [],
  totalCalories: calories,
});

describe('calculateTotalCalories', () => {
  it('birden fazla öğünün kalorilerini toplar', () => {
    const meals = [makeMeal(400), makeMeal(600), makeMeal(200)];
    expect(calculateTotalCalories(meals)).toBe(1200);
  });

  it('boş öğün listesi → 0', () => {
    expect(calculateTotalCalories([])).toBe(0);
  });

  it('tek öğün → o öğünün kalorisi', () => {
    expect(calculateTotalCalories([makeMeal(350)])).toBe(350);
  });
});

describe('getMealTypeName', () => {
  it('breakfast → Kahvaltı', () => expect(getMealTypeName('breakfast')).toBe('Kahvaltı'));
  it('lunch → Öğle Yemeği', () => expect(getMealTypeName('lunch')).toBe('Öğle Yemeği'));
  it('dinner → Akşam Yemeği', () => expect(getMealTypeName('dinner')).toBe('Akşam Yemeği'));
  it('snack → Ara Öğün', () => expect(getMealTypeName('snack')).toBe('Ara Öğün'));
});

describe('getMealTypeEmoji', () => {
  it('breakfast → 🌅', () => expect(getMealTypeEmoji('breakfast')).toBe('🌅'));
  it('lunch → ☀️', () => expect(getMealTypeEmoji('lunch')).toBe('☀️'));
  it('dinner → 🌙', () => expect(getMealTypeEmoji('dinner')).toBe('🌙'));
  it('snack → 🍎', () => expect(getMealTypeEmoji('snack')).toBe('🍎'));
});

describe('getDayName', () => {
  it('0 → Pazar', () => expect(getDayName(0)).toBe('Pazar'));
  it('1 → Pazartesi', () => expect(getDayName(1)).toBe('Pazartesi'));
  it('6 → Cumartesi', () => expect(getDayName(6)).toBe('Cumartesi'));
});

describe('isExpired', () => {
  it('geçmiş tarih → expired', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    expect(isExpired(past)).toBe(true);
  });

  it('gelecek tarih → not expired', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    expect(isExpired(future)).toBe(false);
  });

  it('string tarih formatını da kabul eder', () => {
    const pastStr = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    expect(isExpired(pastStr)).toBe(true);
  });
});

describe('getDaysUntilExpiry', () => {
  it('yarın sona eriyorsa ~1 gün döner', () => {
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
    expect(getDaysUntilExpiry(tomorrow)).toBe(1);
  });

  it('7 gün sonra sona eriyorsa 7 döner', () => {
    const inWeek = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    expect(getDaysUntilExpiry(inWeek)).toBe(7);
  });

  it('dün sona erdiyse negatif döner', () => {
    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
    expect(getDaysUntilExpiry(yesterday)).toBeLessThan(0);
  });
});

describe('getDietStatus', () => {
  const basePlan: DietPlan = {
    patientId: 'p1',
    patientName: 'Test',
    dietitianId: 'd1',
    title: 'Test Plan',
    startDate: new Date(),
    expiryDate: new Date(),
    meals: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('status alanı varsa onu döner', () => {
    expect(getDietStatus({ ...basePlan, status: 'archived' })).toBe('archived');
  });

  it('status yok ama süresi dolmuşsa expired döner', () => {
    const expired = { ...basePlan, status: undefined as any, expiryDate: new Date(Date.now() - 1000) };
    expect(getDietStatus(expired)).toBe('expired');
  });

  it('status yok ve süresi dolmamışsa active döner', () => {
    const active = { ...basePlan, status: undefined as any, expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24) };
    expect(getDietStatus(active)).toBe('active');
  });
});

describe('getStatusColor', () => {
  it('active → yeşil', () => expect(getStatusColor('active')).toBe('#4CAF50'));
  it('expired → kırmızı', () => expect(getStatusColor('expired')).toBe('#FF6B6B'));
  it('archived → gri', () => expect(getStatusColor('archived')).toBe('#999999'));
});

describe('getStatusEmoji', () => {
  it('active → ✅', () => expect(getStatusEmoji('active')).toBe('✅'));
  it('expired → ⏰', () => expect(getStatusEmoji('expired')).toBe('⏰'));
  it('archived → 📦', () => expect(getStatusEmoji('archived')).toBe('📦'));
});

describe('formatExpiryInfo', () => {
  it('süresi dolmuşsa "Süresi doldu" içerir', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
    expect(formatExpiryInfo(past)).toContain('Süresi doldu');
  });

  it('çok gün varsa gün sayısı içerir', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5);
    const result = formatExpiryInfo(future);
    expect(result).toContain('gün kaldı');
  });
});
