import { calculateBMI, getBMIStatus, getBMIColor } from '../src/models/Patient';

describe('calculateBMI', () => {
  it('normal kilolu hesaplar (70kg, 175cm → 22.9)', () => {
    expect(calculateBMI(70, 175)).toBe(22.9);
  });

  it('zayıf hesaplar (50kg, 175cm → 16.3)', () => {
    expect(calculateBMI(50, 175)).toBe(16.3);
  });

  it('fazla kilolu hesaplar (90kg, 175cm → 29.4)', () => {
    expect(calculateBMI(90, 175)).toBe(29.4);
  });

  it('obez hesaplar (120kg, 175cm → 39.2)', () => {
    expect(calculateBMI(120, 175)).toBe(39.2);
  });

  it('1 ondalık hassasiyetle döner', () => {
    const bmi = calculateBMI(68, 172);
    const parts = bmi.toString().split('.');
    expect(parts.length).toBeLessThanOrEqual(2);
    if (parts[1]) expect(parts[1].length).toBeLessThanOrEqual(1);
  });
});

describe('getBMIStatus', () => {
  it('< 18.5 → Zayıf', () => {
    expect(getBMIStatus(16)).toBe('Zayıf');
    expect(getBMIStatus(18.4)).toBe('Zayıf');
  });

  it('18.5 - 24.9 → Normal', () => {
    expect(getBMIStatus(18.5)).toBe('Normal');
    expect(getBMIStatus(22)).toBe('Normal');
    expect(getBMIStatus(24.9)).toBe('Normal');
  });

  it('25 - 29.9 → Fazla Kilolu', () => {
    expect(getBMIStatus(25)).toBe('Fazla Kilolu');
    expect(getBMIStatus(27)).toBe('Fazla Kilolu');
    expect(getBMIStatus(29.9)).toBe('Fazla Kilolu');
  });

  it('>= 30 → Obez', () => {
    expect(getBMIStatus(30)).toBe('Obez');
    expect(getBMIStatus(40)).toBe('Obez');
  });
});

describe('getBMIColor', () => {
  it('Zayıf → turuncu (#FFA500)', () => {
    expect(getBMIColor(17)).toBe('#FFA500');
  });

  it('Normal → yeşil (#4CAF50)', () => {
    expect(getBMIColor(22)).toBe('#4CAF50');
  });

  it('Fazla Kilolu → koyu turuncu (#FF9800)', () => {
    expect(getBMIColor(27)).toBe('#FF9800');
  });

  it('Obez → kırmızı (#F44336)', () => {
    expect(getBMIColor(35)).toBe('#F44336');
  });
});
