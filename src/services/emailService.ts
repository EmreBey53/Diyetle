/**
 * E-posta Servisi — Resend.com
 *
 * Kurulum:
 * 1. resend.com → API Keys → Create API Key
 * 2. src/config/env.ts içindeki RESEND_API_KEY fallback değerini kendi key'inizle doldurun
 *
 * Ücretsiz limit: 3.000 mail/ay, 100/gün
 * Spark planıyla çalışır (Firebase Blaze gerekmez)
 */

import { ENV } from '../config/env';

const RESEND_API_URL = 'https://api.resend.com/emails';
const APP_NAME = 'Diyetle';
// Domain: mobnet.online — Resend'de doğrulanmış
const FROM_ADDRESS = 'Diyetle <diyetle@mobnet.online>';

const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  const apiKey = ENV.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[emailService] RESEND_API_KEY tanımlı değil, mail atlandı.');
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API hatası: ${response.status} — ${err}`);
  }
};

// ─── Diyetisyen Onay Bildirimi ────────────────────────────────────────────────

export const sendDietitianApprovedEmail = async (
  email: string,
  displayName: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 28px;">
        <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: -0.5px;">🥗 ${APP_NAME}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Sağlıklı Yaşam Platformu</p>
      </div>
      <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 8px;">Haberler iyi, ${displayName}! 🎊</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Diyetle platformuna katılım başvurun onaylandı. Artık hesabına giriş yapabilir, hastalarını ekleyebilir ve diyet planları oluşturabilirsin.
      </p>
      <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 10px; padding: 18px; margin: 24px 0;">
        <p style="color: #166534; margin: 0; font-weight: 700; font-size: 15px;">✅ Hesabın aktif edildi</p>
        <p style="color: #166534; margin: 8px 0 0; font-size: 14px;">Uygulamaya giriş yaparak hemen başlayabilirsin. Başarılar!</p>
      </div>
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Sorularında bize yazabilirsin: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;
  await sendMail(email, `${APP_NAME} — Hesabın onaylandı, artık aktifsin! ✅`, html);
};

// ─── Diyetisyen Red Bildirimi ────────────────────────────────────────────────

export const sendDietitianRejectedEmail = async (
  email: string,
  displayName: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 28px;">
        <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: -0.5px;">🥗 ${APP_NAME}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Sağlıklı Yaşam Platformu</p>
      </div>
      <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 8px;">Merhaba ${displayName},</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Diyetle platformuna katılım başvurunu inceledik. Maalesef şu aşamada başvurunu onaylayamıyoruz.
      </p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 18px; margin: 24px 0;">
        <p style="color: #991B1B; margin: 0; font-size: 14px; line-height: 1.6;">
          Daha fazla bilgi almak veya itirazda bulunmak için bizimle iletişime geçebilirsin.
        </p>
      </div>
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Bize ulaş: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;
  await sendMail(email, `${APP_NAME} — Başvuru durumun hakkında`, html);
};

// ─── Hoşgeldin Maili (Hasta) ──────────────────────────────────────────────────

export const sendWelcomeEmailPatient = async (
  email: string,
  displayName: string,
  dietitianName?: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 28px;">
        <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: -0.5px;">🥗 ${APP_NAME}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Sağlıklı Yaşam Platformu</p>
      </div>
      <h2 style="color: #1F2937; font-size: 24px; margin-bottom: 8px;">Hoş geldin, ${displayName}! 🎉</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Harika bir karar verdin! Artık sağlıklı yaşam yolculuğun başlıyor.
        ${dietitianName
          ? `Diyetisyenin <strong>${dietitianName}</strong> seninle birlikte her adımda yanında olacak.`
          : 'Yakında bir diyetisyen sana atanacak ve birlikte hedefe ulaşacaksınız.'}
      </p>
      <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <p style="color: #166534; margin: 0 0 12px; font-weight: 700; font-size: 15px;">📱 Uygulama ile neler yapabilirsin?</p>
        <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 2; font-size: 14px;">
          <li>Diyetisyeninle mesajlaş, sorularını sor</li>
          <li>Diyet planını takip et, öğünlerini kaydet</li>
          <li>Yediklerini fotoğrafla, yapay zeka analiz etsin</li>
          <li>İlerleni gör, motivasyonunu yüksek tut</li>
          <li>Rozetler kazan, başarılarını kutla 🏆</li>
        </ul>
      </div>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Hazır mısın? Uygulamayı aç ve hadi başlayalım! 💪
      </p>
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Sorularında bize yazabilirsin: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;
  await sendMail(email, `Hoş geldin ${displayName}! Yolculuğun başlıyor 🥗`, html);
};

// ─── Hoşgeldin Maili (Diyetisyen) ────────────────────────────────────────────

export const sendWelcomeEmailDietitian = async (
  email: string,
  displayName: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 28px;">
        <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: -0.5px;">🥗 ${APP_NAME}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Sağlıklı Yaşam Platformu</p>
      </div>
      <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 8px;">Başvurun alındı, ${displayName}! 📋</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Diyetle platformuna diyetisyen olarak katılmak için başvurduğun için teşekkür ederiz. Ekibimiz başvurunu inceliyor.
      </p>
      <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 18px; margin: 24px 0;">
        <p style="color: #92400E; margin: 0; font-weight: 700; font-size: 15px;">⏳ Ne kadar sürer?</p>
        <p style="color: #92400E; margin: 8px 0 0; font-size: 14px; line-height: 1.6;">
          Genellikle <strong>1-3 iş günü</strong> içinde e-posta ile bilgilendiriyoruz. Onaylandıktan sonra hastalarınla hemen çalışmaya başlayabilirsin.
        </p>
      </div>
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Sorularında bize yazabilirsin: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;
  await sendMail(email, `Başvurun alındı ${displayName} — inceliyoruz! 📋`, html);
};

// ─── Diyet Planı Paylaşımı ────────────────────────────────────────────────────

export interface DietPlanEmailData {
  patientEmail: string;
  patientName: string;
  dietitianName: string;
  planName: string;
  planDescription?: string;
  startDate?: string;
  endDate?: string;
  dailyCalorieTarget?: number;
  dailyWaterGoal?: number;
  meals?: Array<{
    name: string;
    time?: string;
    foods?: Array<{ name: string; amount?: string; calories?: number }>;
  }>;
  notes?: string;
}

export const sendDietPlanEmail = async (data: DietPlanEmailData): Promise<void> => {
  const mealsHtml = data.meals && data.meals.length > 0
    ? data.meals.map((meal) => `
        <div style="background: #F9FAFB; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <p style="color: #1F2937; font-weight: 700; margin: 0 0 6px;">
            🍽️ ${meal.name}${meal.time ? ` — ${meal.time}` : ''}
          </p>
          ${meal.foods && meal.foods.length > 0 ? `
            <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 14px; line-height: 1.7;">
              ${meal.foods.map((f) =>
                `<li>${f.name}${f.amount ? ` — ${f.amount}` : ''}${f.calories ? ` (${f.calories} kcal)` : ''}</li>`
              ).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')
    : '<p style="color: #6B7280;">Öğün detayı bulunmuyor.</p>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🥗 ${APP_NAME}</h1>
      </div>
      <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 8px;">Yeni planın hazır, ${data.patientName}! 🥦</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Diyetisyenin <strong>${data.dietitianName}</strong> sana yeni bir diyet planı hazırladı. Hadi bakalım! 💪
      </p>
      <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #166534; margin: 0 0 12px;">📌 ${data.planName}</h3>
        ${data.planDescription ? `<p style="color: #374151; margin: 0 0 10px;">${data.planDescription}</p>` : ''}
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
          ${data.startDate ? `<span style="background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; display: inline-block; margin: 2px;">📅 Başlangıç: ${data.startDate}</span>` : ''}
          ${data.endDate ? `<span style="background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; display: inline-block; margin: 2px;">📅 Bitiş: ${data.endDate}</span>` : ''}
          ${data.dailyCalorieTarget ? `<span style="background: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 6px; font-size: 13px; display: inline-block; margin: 2px;">🔥 ${data.dailyCalorieTarget} kcal/gün</span>` : ''}
          ${data.dailyWaterGoal ? `<span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-size: 13px; display: inline-block; margin: 2px;">💧 ${data.dailyWaterGoal}L su/gün</span>` : ''}
        </div>
      </div>
      <h3 style="color: #1F2937;">Öğünler</h3>
      ${mealsHtml}
      ${data.notes ? `
        <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 8px; padding: 14px; margin-top: 16px;">
          <p style="color: #5B21B6; font-weight: 600; margin: 0 0 6px;">📝 Diyetisyen Notu</p>
          <p style="color: #374151; margin: 0;">${data.notes}</p>
        </div>
      ` : ''}
      <p style="color: #374151; font-size: 15px; margin-top: 20px; line-height: 1.6;">
        Planını takip etmek ve diyetisyeninle iletişimde kalmak için uygulamayı kullanmayı unutma!
      </p>
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Sorularında bize yazabilirsin: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  await sendMail(data.patientEmail, `${data.dietitianName} yeni planını hazırladı! 🥦`, html);
};

// ─── Randevu Hatırlatıcısı ────────────────────────────────────────────────────

export const sendAppointmentReminderEmail = async (
  email: string,
  patientName: string,
  dietitianName: string,
  appointmentDate: string,
  appointmentTime: string,
  isVideoCall: boolean
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🥗 ${APP_NAME}</h1>
      </div>
      <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 8px;">Randevunu unutma, ${patientName}! 📅</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Yaklaşan randevunu hatırlatmak istedik. Hazır ol! 😊
      </p>
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 10px;"><strong style="color: #1E40AF;">👨‍⚕️ Diyetisyen:</strong> <span style="color: #374151;">${dietitianName}</span></p>
        <p style="margin: 0 0 10px;"><strong style="color: #1E40AF;">📅 Tarih:</strong> <span style="color: #374151;">${appointmentDate}</span></p>
        <p style="margin: 0 0 10px;"><strong style="color: #1E40AF;">🕐 Saat:</strong> <span style="color: #374151;">${appointmentTime}</span></p>
        <p style="margin: 0;"><strong style="color: #1E40AF;">📍 Tür:</strong> <span style="color: #374151;">${isVideoCall ? '🎥 Video Görüşme' : '🏥 Yüz Yüze'}</span></p>
      </div>
      ${isVideoCall ? `
        <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 10px; padding: 16px; margin-top: 4px;">
          <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
            📱 Video görüşmene <strong>${APP_NAME}</strong> uygulaması üzerinden katılabilirsin. Bağlantı sorunlarından kaçınmak için birkaç dakika önceden hazır ol!
          </p>
        </div>
      ` : ''}
      <p style="color: #6B7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
        Sorularında bize yazabilirsin: <a href="mailto:diyetle@mobnet.online" style="color: #10B981;">diyetle@mobnet.online</a><br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;
  await sendMail(email, `Randevunu unutma ${patientName}! 📅 ${appointmentDate} — ${appointmentTime}`, html);
};
