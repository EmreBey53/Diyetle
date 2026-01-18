// src/services/pdfService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { DietPlan } from '../models/DietPlan';
import { Patient } from '../models/Patient';
import { Progress } from '../models/Progress';
import {
  GOAL_OPTIONS,
  DIETARY_RESTRICTIONS,
  HEALTH_CONDITIONS,
  FOOD_ALLERGIES,
  ACTIVITY_LEVELS,
} from '../models/Questionnaire';

// Diyet Planı PDF
export const generateDietPlanPDF = async (plan: DietPlan, patient: Patient) => {
  try {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { margin: 20px; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 15px;
          background-color: #fff;
          line-height: 1.4;
          font-size: 12px;
        }

        /* Üst Başlık - Kompakt */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .brand-section {
          flex: 1;
        }
        .brand-name {
          font-size: 22px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: -1px;
          margin: 0;
        }
        .subtitle {
          font-size: 11px;
          color: #666;
          margin-top: 3px;
        }
        .date-box {
          text-align: right;
          font-size: 10px;
          color: #666;
        }

        /* Danışan Bilgileri Kartı - Kompakt */
        .patient-card {
          background: #f9fbe7;
          border-left: 4px solid #4CAF50;
          padding: 10px 15px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          border-radius: 4px;
        }
        .patient-info-item {
          font-size: 11px;
        }
        .patient-info-label {
          font-weight: 700;
          color: #4CAF50;
          display: block;
          margin-bottom: 3px;
          font-size: 9px;
          letter-spacing: 0.3px;
        }
        .patient-info-value {
          color: #2c3e50;
          font-size: 12px;
          font-weight: 600;
        }

        /* Plan Başlığı */
        .plan-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e8e8e8;
        }

        /* Diyet Listesi Tablosu - Kompakt */
        .diet-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .meal-row {
          border-bottom: 1px solid #e8e8e8;
          page-break-inside: avoid;
        }
        .meal-header-cell {
          width: 28%;
          vertical-align: top;
          padding: 8px 10px;
          background-color: #f8f9fa;
          border-right: 2px solid #4CAF50;
        }
        .meal-name {
          font-weight: bold;
          font-size: 13px;
          color: #2c3e50;
          display: block;
          margin-bottom: 4px;
        }
        .meal-time {
          font-size: 11px;
          color: #666;
          display: block;
          margin-bottom: 5px;
        }
        .meal-calories {
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
        }

        /* Besin Listesi - Kompakt */
        .food-content-cell {
          padding: 8px 12px;
          vertical-align: top;
          background-color: #fff;
        }
        .food-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        .food-item {
          margin-bottom: 5px;
          font-size: 11px;
          line-height: 1.4;
          padding: 4px 8px;
          background-color: #fafafa;
          border-left: 2px solid #4CAF50;
          border-radius: 2px;
        }
        .food-name {
          font-weight: 600;
          color: #2c3e50;
        }
        .food-calories {
          color: #666;
          font-size: 10px;
          margin-left: 5px;
        }

        /* Alt Bilgi - Kompakt */
        .footer {
          margin-top: 15px;
          padding: 8px 15px;
          border-top: 1px solid #4CAF50;
          background-color: #f8f9fa;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-radius: 4px;
        }
        .disclaimer {
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid #ddd;
          font-size: 9px;
          color: #999;
        }
      </style>
    </head>
    <body>

      <div class="header-container">
        <div class="brand-section">
          <div class="brand-name">Diyetle</div>
          <div class="subtitle">Kişiye Özel Diyet Listesi</div>
        </div>
        <div class="date-box">
          Oluşturulma Tarihi:<br>
          <strong>${new Date().toLocaleDateString('tr-TR')}</strong>
        </div>
      </div>

      <div class="patient-card">
        <div class="patient-info-item">
          <span class="patient-info-label">DANIŞAN</span>
          <span class="patient-info-value">${patient.name}</span>
        </div>
        ${patient.weight ? `
        <div class="patient-info-item">
          <span class="patient-info-label">MEVCUT KİLO</span>
          <span class="patient-info-value">${patient.weight} kg</span>
        </div>` : ''}
        ${patient.bmi ? `
        <div class="patient-info-item">
          <span class="patient-info-label">VKI (BMI)</span>
          <span class="patient-info-value">${patient.bmi}</span>
        </div>` : ''}
        <div class="patient-info-item">
          <span class="patient-info-label">HEDEF KALORİ</span>
          <span class="patient-info-value">${plan.dailyCalorieTarget} kcal</span>
        </div>
      </div>

      ${plan.title || plan.description ? `
      <div class="plan-title">
        ${plan.title}${plan.description ? ` - ${plan.description}` : ''}
      </div>
      ` : ''}

      <table class="diet-table">
        ${plan.meals.map(meal => `
          <tr class="meal-row">
            <td class="meal-header-cell">
              <span class="meal-name">${meal.name}</span>
              <span class="meal-time">${meal.time}</span>
              <span class="meal-calories">${meal.totalCalories} kcal</span>
            </td>

            <td class="food-content-cell">
              <ul class="food-list">
                ${meal.foods.map(food => `
                  <li class="food-item">
                    <span class="food-name">${food.name}</span>${food.calories > 0 ? `<span class="food-calories">(${food.calories} kcal)</span>` : ''}
                  </li>
                `).join('')}
              </ul>
            </td>
          </tr>
        `).join('')}
      </table>

      <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px;">
        Bu diyet listesi kişiye özel hazırlanmıştır. <strong>Diyetle</strong> uygulaması ile oluşturulmuştur.
      </div>

    </body>
    </html>
    `;

    // PDF oluştur
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    console.log('✅ PDF oluşturuldu:', uri);

    // PDF'i paylaş
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${patient.name} - Diyet Listesi`
      });
    }

    return uri;
  } catch (error: any) {
    console.error('❌ PDF hatası:', error);
    throw new Error(error.message);
  }
};

// Helper functions to get labels from IDs
const getGoalLabels = (ids: string[]) => {
  return ids.map(id => GOAL_OPTIONS.find(opt => opt.id === id)).filter(Boolean);
};

const getDietaryRestrictionLabels = (ids: string[]) => {
  return ids.map(id => DIETARY_RESTRICTIONS.find(opt => opt.id === id)).filter(Boolean);
};

const getHealthConditionLabels = (ids: string[]) => {
  return ids.map(id => HEALTH_CONDITIONS.find(opt => opt.id === id)).filter(Boolean);
};

const getFoodAllergyLabels = (ids: string[]) => {
  return ids.map(id => FOOD_ALLERGIES.find(opt => opt.id === id)).filter(Boolean);
};

const getActivityLevelLabel = (id: string) => {
  return ACTIVITY_LEVELS.find(opt => opt.id === id);
};

// Anamnez Formu PDF (Diyet Listesi ile)
export const generateAnamnesisFormPDF = async (
  patient: Patient,
  progressList: Progress[],
  dietPlan?: DietPlan
) => {
  try {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { margin: 20px; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          padding: 15px;
          color: #333;
          font-size: 12px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header h1 { color: #4CAF50; margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0 0; font-size: 11px; color: #666; }
        .section { margin-bottom: 15px; page-break-inside: avoid; }
        .section h2 {
          background: #4CAF50;
          color: white;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 14px;
          margin: 0 0 8px 0;
        }
        .info-row { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th { background: #4CAF50; color: white; padding: 5px 8px; text-align: left; font-size: 11px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; }

        /* Sayfa Sonu */
        .page-break { page-break-before: always; margin: 0; padding: 0; }

        /* Diyet Listesi Stilleri - Kompakt */
        .diet-section { margin-top: 10px; }
        .meal-card {
          background: #f8f9fa;
          padding: 8px 10px;
          margin-bottom: 10px;
          border-left: 3px solid #4CAF50;
          border-radius: 3px;
          page-break-inside: avoid;
        }
        .meal-header {
          font-size: 13px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 4px;
        }
        .meal-time {
          font-size: 11px;
          color: #666;
          margin-bottom: 3px;
        }
        .meal-calories {
          display: inline-block;
          background: #4CAF50;
          color: white;
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .food-list {
          list-style-type: none;
          padding: 0;
          margin: 5px 0 0 0;
        }
        .food-item {
          padding: 4px 0;
          border-bottom: 1px solid #e8e8e8;
          font-size: 11px;
          line-height: 1.3;
        }
        .food-item:last-child { border-bottom: none; }
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 5px;
        }
        .tag {
          display: inline-block;
          background: #f0f0f0;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          border: 1px solid #ddd;
        }
        .tag-primary { background: #E8F5E9; border-color: #4CAF50; color: #2E7D32; }
        .tag-warning { background: #FFF3E0; border-color: #FF9800; color: #E65100; }
        .tag-danger { background: #FFEBEE; border-color: #F44336; color: #C62828; }
        .activity-level {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          display: inline-block;
          border: 1px solid #ddd;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🥗 DİYET LİSTESİ</h1>
        <p>${patient.name} - Kişiye Özel Plan</p>
      </div>
      <div class="section">
        <h2>👤 Kişisel Bilgiler</h2>
        <div class="info-row"><strong>Ad Soyad:</strong> ${patient.name}</div>
        <div class="info-row"><strong>E-posta:</strong> ${patient.email}</div>
        ${patient.phone ? `<div class="info-row"><strong>Telefon:</strong> ${patient.phone}</div>` : ''}
        ${patient.age ? `<div class="info-row"><strong>Yaş:</strong> ${patient.age}</div>` : ''}
      </div>
      <div class="section">
        <h2>📏 Vücut Ölçüleri</h2>
        ${patient.weight ? `<div class="info-row"><strong>Kilo:</strong> ${patient.weight} kg</div>` : ''}
        ${patient.height ? `<div class="info-row"><strong>Boy:</strong> ${patient.height} cm</div>` : ''}
        ${patient.targetWeight ? `<div class="info-row"><strong>Hedef Kilo:</strong> ${patient.targetWeight} kg</div>` : ''}
        ${patient.bmi ? `<div class="info-row"><strong>BMI:</strong> ${patient.bmi}</div>` : ''}
      </div>
      ${patient.goals && patient.goals.length > 0 ? `
      <div class="section">
        <h2>🎯 Hedefler</h2>
        <div class="tags-container">
          ${getGoalLabels(patient.goals).map(goal =>
            `<span class="tag">${goal?.icon} ${goal?.label}</span>`
          ).join('')}
        </div>
      </div>
      ` : ''}
      ${patient.dietaryRestrictions && patient.dietaryRestrictions.length > 0 ? `
      <div class="section">
        <h2>🍽️ Beslenme Tercihleri</h2>
        <div class="tags-container">
          ${getDietaryRestrictionLabels(patient.dietaryRestrictions).map(restriction =>
            `<span class="tag tag-primary">${restriction?.icon} ${restriction?.label}</span>`
          ).join('')}
        </div>
      </div>
      ` : ''}
      ${patient.healthConditions && patient.healthConditions.length > 0 && patient.healthConditions[0] !== 'none' ? `
      <div class="section">
        <h2>🩺 Sağlık Durumu</h2>
        <div class="tags-container">
          ${getHealthConditionLabels(patient.healthConditions).map(condition =>
            `<span class="tag tag-warning">${condition?.icon} ${condition?.label}</span>`
          ).join('')}
        </div>
      </div>
      ` : ''}
      ${patient.foodAllergies && patient.foodAllergies.length > 0 && patient.foodAllergies[0] !== 'none' ? `
      <div class="section">
        <h2>🥜 Gıda Alerjileri</h2>
        <div class="tags-container">
          ${getFoodAllergyLabels(patient.foodAllergies).map(allergy =>
            `<span class="tag tag-danger">${allergy?.icon} ${allergy?.label}</span>`
          ).join('')}
        </div>
      </div>
      ` : ''}
      ${patient.activityLevel ? `
      <div class="section">
        <h2>⚡ Aktivite Seviyesi</h2>
        <div class="activity-level">
          ${getActivityLevelLabel(patient.activityLevel)?.icon} ${getActivityLevelLabel(patient.activityLevel)?.label}
        </div>
      </div>
      ` : ''}
      ${progressList.length > 0 ? `
      <div class="section">
        <h2>📊 İlerleme Kayıtları</h2>
        <table>
          <tr><th>Tarih</th><th>Kilo</th><th>Boy</th><th>BMI</th></tr>
          ${progressList.map(p => `
            <tr>
              <td>${new Date(p.recordDate).toLocaleDateString('tr-TR')}</td>
              <td>${p.weight} kg</td>
              <td>${p.height} cm</td>
              <td>${p.bmi}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      ` : ''}

      ${dietPlan ? `
      <!-- SAYFA SONU - DİYET LİSTESİ YENİ SAYFADA BAŞLASIN -->
      <div class="page-break"></div>

      <div class="header">
        <h1>🥗 DİYET LİSTESİ</h1>
        <p>${dietPlan.title || 'Kişiye Özel Plan'}</p>
      </div>

      <div class="section" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; padding: 5px 8px; background: #f5f5f5; border-radius: 3px;">
          <span><strong>Günlük Kalori:</strong> ${dietPlan.dailyCalorieTarget} kcal</span>
          <span><strong>Başlangıç:</strong> ${new Date(dietPlan.startDate).toLocaleDateString('tr-TR')}</span>
          <span><strong>Durum:</strong> ${dietPlan.isActive ? '✅ Aktif' : '❌ Pasif'}</span>
        </div>
      </div>

      <div class="diet-section">
        <h2>🍽️ Günlük Öğünler</h2>
        ${dietPlan.meals.map(meal => `
          <div class="meal-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="meal-header">${meal.name} - ${meal.time}</div>
              <span class="meal-calories">${meal.totalCalories} kcal</span>
            </div>
            <ul class="food-list">
              ${meal.foods.map(food => `
                <li class="food-item">
                  • ${food.name}
                  ${food.calories > 0 ? `<span style="color: #666; font-size: 10px;"> (${food.calories} kcal)</span>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px;">
        Bu form <strong>Diyetle</strong> uygulaması ile oluşturulmuştur.
      </div>
    </body>
    </html>
    `;

    // PDF oluştur
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    console.log('✅ Diyet Listesi PDF oluşturuldu:', uri);

    // PDF'i paylaş
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${patient.name} - Diyet Listesi`
      });
    }

    return uri;
  } catch (error: any) {
    console.error('❌ Anamnez hatası:', error);
    throw new Error(error.message);
  }
};