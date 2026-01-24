// src/services/appointmentCalendarService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { createVideoCall } from './videoCallService';
import { logAuditEvent } from './auditService';
import { sendEmergencyNotification } from './smartNotificationService';

export interface AppointmentSlot {
  id?: string;
  dietitianId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isAvailable: boolean;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'monthly';
  maxDuration: number; // dakika
  appointmentType: 'consultation' | 'follow_up' | 'emergency' | 'group';
  price?: number;
  notes?: string;
  createdAt: Timestamp;
}

export interface VideoAppointment {
  id?: string;
  slotId: string;
  dietitianId: string;
  patientId: string;
  dietitianName: string;
  patientName: string;
  appointmentDate: Timestamp;
  duration: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'group';
  status: 'scheduled' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';
  videoCallId?: string;
  meetingLink?: string;
  agenda?: string;
  preparationNotes?: string;
  followUpRequired: boolean;
  price?: number;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  createdAt: Timestamp;
  confirmedAt?: Timestamp;
  remindersSent: number;
  lastReminderAt?: Timestamp;
}

export interface AppointmentReminder {
  id?: string;
  appointmentId: string;
  recipientId: string;
  reminderType: '24h' | '2h' | '15min';
  scheduledTime: Timestamp;
  isSent: boolean;
  sentAt?: Timestamp;
  message: string;
}

// Müsait zaman slotları oluşturma
export const createAvailabilitySlots = async (
  dietitianId: string,
  slots: Omit<AppointmentSlot, 'id' | 'dietitianId' | 'createdAt'>[]
) => {
  try {
    const createdSlots = [];
    
    for (const slot of slots) {
      const slotData: Omit<AppointmentSlot, 'id'> = {
        ...slot,
        dietitianId,
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'appointment_slots'), slotData);
      createdSlots.push({ id: docRef.id, ...slotData });
    }
    
    await logAuditEvent({
      userId: dietitianId,
      userRole: 'dietitian',
      action: 'availability_slots_created',
      resource: 'appointment_slots',
      details: { slotsCount: slots.length },
      severity: 'low',
    });

    console.log('✅ Müsaitlik slotları oluşturuldu:', createdSlots.length);
    return createdSlots;
  } catch (error) {
    console.error('❌ Slot oluşturma hatası:', error);
    throw error;
  }
};

// Randevu rezervasyonu
export const bookAppointment = async (
  slotId: string,
  patientId: string,
  patientName: string,
  agenda?: string,
  preparationNotes?: string
) => {
  try {
    // Slot bilgilerini al
    const slotDoc = await getDoc(doc(db, 'appointment_slots', slotId));
    if (!slotDoc.exists()) {
      throw new Error('Randevu slotu bulunamadı');
    }
    
    const slotData = slotDoc.data() as AppointmentSlot;
    if (!slotData.isAvailable) {
      throw new Error('Bu slot artık müsait değil');
    }

    // Randevu oluştur
    const appointmentDate = new Date(`${slotData.date}T${slotData.startTime}:00`);
    
    const appointment: Omit<VideoAppointment, 'id'> = {
      slotId,
      dietitianId: slotData.dietitianId,
      patientId,
      dietitianName: '', // Diyetisyen adı ayrıca çekilecek
      patientName,
      appointmentDate: Timestamp.fromDate(appointmentDate),
      duration: slotData.maxDuration,
      type: slotData.appointmentType as any,
      status: 'scheduled',
      agenda,
      preparationNotes,
      followUpRequired: false,
      price: slotData.price,
      paymentStatus: slotData.price ? 'pending' : undefined,
      createdAt: Timestamp.now(),
      remindersSent: 0,
    };

    const docRef = await addDoc(collection(db, 'video_appointments'), appointment);
    
    // Slot'u dolu olarak işaretle
    await updateDoc(doc(db, 'appointment_slots', slotId), {
      isAvailable: false,
    });

    // Video call oluştur
    const videoCall = await createVideoCall(
      docRef.id,
      slotData.dietitianId,
      patientId,
      '', // Diyetisyen adı
      patientName,
      appointmentDate,
      slotData.maxDuration
    );

    // Randevuya video call ID'sini ekle
    await updateDoc(doc(db, 'video_appointments', docRef.id), {
      videoCallId: videoCall.id,
      meetingLink: `diyetle://video-call/${videoCall.roomId}`,
    });

    // Hatırlatıcıları planla
    await scheduleAppointmentReminders(docRef.id, appointmentDate, [slotData.dietitianId, patientId]);

    await logAuditEvent({
      userId: patientId,
      userRole: 'patient',
      action: 'appointment_booked',
      resource: 'video_appointment',
      resourceId: docRef.id,
      details: { slotId, appointmentDate, type: slotData.appointmentType },
      severity: 'low',
    });

    console.log('✅ Randevu rezerve edildi:', docRef.id);
    return { id: docRef.id, videoCallId: videoCall.id, ...appointment };
  } catch (error) {
    console.error('❌ Randevu rezervasyon hatası:', error);
    throw error;
  }
};

// Randevu onaylama (diyetisyen tarafından)
export const confirmAppointment = async (appointmentId: string, dietitianId: string) => {
  try {
    const appointmentRef = doc(db, 'video_appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      throw new Error('Randevu bulunamadı');
    }

    const appointmentData = appointmentDoc.data() as VideoAppointment;
    if (appointmentData.dietitianId !== dietitianId) {
      throw new Error('Bu randevuyu onaylama yetkiniz yok');
    }

    await updateDoc(appointmentRef, {
      status: 'confirmed',
      confirmedAt: Timestamp.now(),
    });

    // Danışana onay bildirimi gönder
    await sendEmergencyNotification(
      appointmentData.patientId,
      `✅ Randevunuz onaylandı! ${appointmentData.appointmentDate.toDate().toLocaleString('tr-TR')}`,
      'high'
    );

    await logAuditEvent({
      userId: dietitianId,
      userRole: 'dietitian',
      action: 'appointment_confirmed',
      resource: 'video_appointment',
      resourceId: appointmentId,
      severity: 'low',
    });

    console.log('✅ Randevu onaylandı:', appointmentId);
    return true;
  } catch (error) {
    console.error('❌ Randevu onaylama hatası:', error);
    throw error;
  }
};

// Randevu iptali
export const cancelAppointment = async (
  appointmentId: string, 
  userId: string, 
  reason: string,
  refundRequested: boolean = false
) => {
  try {
    const appointmentRef = doc(db, 'video_appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      throw new Error('Randevu bulunamadı');
    }

    const appointmentData = appointmentDoc.data() as VideoAppointment;
    
    // İptal yetkisi kontrolü
    if (appointmentData.dietitianId !== userId && appointmentData.patientId !== userId) {
      throw new Error('Bu randevuyu iptal etme yetkiniz yok');
    }

    // İptal zamanı kontrolü (24 saat öncesinden iptal edilebilir)
    const appointmentTime = appointmentData.appointmentDate.toDate();
    const hoursUntilAppointment = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 24) {
      console.warn('⚠️ 24 saatten az kala iptal');
    }

    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: reason,
      refundRequested,
    });

    // Slot'u tekrar müsait yap
    await updateDoc(doc(db, 'appointment_slots', appointmentData.slotId), {
      isAvailable: true,
    });

    // Karşı tarafa bildirim gönder
    const otherUserId = userId === appointmentData.dietitianId 
      ? appointmentData.patientId 
      : appointmentData.dietitianId;
    
    await sendEmergencyNotification(
      otherUserId,
      `❌ Randevunuz iptal edildi. Sebep: ${reason}`,
      'high'
    );

    await logAuditEvent({
      userId,
      userRole: userId === appointmentData.dietitianId ? 'dietitian' : 'patient',
      action: 'appointment_cancelled',
      resource: 'video_appointment',
      resourceId: appointmentId,
      details: { reason, refundRequested, hoursUntilAppointment },
      severity: 'medium',
    });

    console.log('✅ Randevu iptal edildi:', appointmentId);
    return true;
  } catch (error) {
    console.error('❌ Randevu iptal hatası:', error);
    throw error;
  }
};

// Müsait slotları getirme
export const getAvailableSlots = async (dietitianId: string, startDate: Date, endDate: Date) => {
  try {
    // Parametre kontrolü
    if (!dietitianId || !startDate || !endDate) {
      console.warn('⚠️ getAvailableSlots: Gerekli parametreler eksik', {
        dietitianId: !!dietitianId,
        startDate: !!startDate,
        endDate: !!endDate
      });
      return [];
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Index ile optimized query
    const q = query(
      collection(db, 'appointment_slots'),
      where('dietitianId', '==', dietitianId),
      where('isAvailable', '==', true),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date'),
      orderBy('startTime')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AppointmentSlot));
  } catch (error) {
    console.error('❌ Müsait slot getirme hatası:', error);
    
    // Fallback: Index yoksa basit query
    try {
      if (!dietitianId) {
        console.warn('⚠️ Fallback: dietitianId eksik');
        return [];
      }

      const fallbackQ = query(
        collection(db, 'appointment_slots'),
        where('dietitianId', '==', dietitianId),
        where('isAvailable', '==', true)
      );

      const snapshot = await getDocs(fallbackQ);
      const slots = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AppointmentSlot))
        .filter(slot => {
          if (!startDate || !endDate || !slot.date) return true;
          const slotDate = new Date(slot.date);
          return slotDate >= startDate && slotDate <= endDate;
        })
        .sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.startTime.localeCompare(b.startTime);
        });

      return slots;
    } catch (fallbackError) {
      console.error('❌ Fallback müsait slot hatası:', fallbackError);
      return [];
    }
  }
};

// Randevu geçmişi
export const getAppointmentHistory = async (userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    // Parametreleri kontrol et
    if (!userId || !userRole) {
      console.warn('⚠️ getAppointmentHistory: userId veya userRole eksik');
      return [];
    }

    const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
    
    // Index ile optimized query
    const q = query(
      collection(db, 'video_appointments'),
      where(field, '==', userId),
      orderBy('appointmentDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VideoAppointment));
  } catch (error) {
    console.error('❌ Randevu geçmişi getirme hatası:', error);
    
    // Fallback: Index yoksa basit query
    try {
      const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
      const fallbackQ = query(
        collection(db, 'video_appointments'),
        where(field, '==', userId)
      );

      const snapshot = await getDocs(fallbackQ);
      const appointments = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VideoAppointment))
        .sort((a, b) => {
          if (!a.appointmentDate && !b.appointmentDate) return 0;
          if (!a.appointmentDate) return 1;
          if (!b.appointmentDate) return -1;
          return b.appointmentDate.toMillis() - a.appointmentDate.toMillis();
        });

      return appointments;
    } catch (fallbackError) {
      console.error('❌ Fallback randevu geçmişi hatası:', fallbackError);
      return [];
    }
  }
};

// Hatırlatıcı planlama
const scheduleAppointmentReminders = async (
  appointmentId: string, 
  appointmentDate: Date, 
  recipients: string[]
) => {
  try {
    const reminders = [
      { type: '24h' as const, hours: 24 },
      { type: '2h' as const, hours: 2 },
      { type: '15min' as const, hours: 0.25 },
    ];

    for (const recipient of recipients) {
      for (const reminder of reminders) {
        const reminderTime = new Date(appointmentDate.getTime() - (reminder.hours * 60 * 60 * 1000));
        
        if (reminderTime > new Date()) {
          const reminderData: Omit<AppointmentReminder, 'id'> = {
            appointmentId,
            recipientId: recipient,
            reminderType: reminder.type,
            scheduledTime: Timestamp.fromDate(reminderTime),
            isSent: false,
            message: `🔔 Randevunuz ${reminder.type === '24h' ? '24 saat' : reminder.type === '2h' ? '2 saat' : '15 dakika'} sonra başlayacak`,
          };

          await addDoc(collection(db, 'appointment_reminders'), reminderData);
        }
      }
    }

    console.log('✅ Hatırlatıcılar planlandı:', appointmentId);
  } catch (error) {
    console.error('❌ Hatırlatıcı planlama hatası:', error);
  }
};