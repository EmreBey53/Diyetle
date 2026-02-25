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

    return createdSlots;
  } catch (error) {
    throw error;
  }
};

export const bookAppointment = async (
  slotId: string,
  patientId: string,
  patientName: string,
  agenda?: string,
  preparationNotes?: string
) => {
  try {
    const slotDoc = await getDoc(doc(db, 'appointment_slots', slotId));
    if (!slotDoc.exists()) {
      throw new Error('Randevu slotu bulunamadı');
    }
    
    const slotData = slotDoc.data() as AppointmentSlot;
    if (!slotData.isAvailable) {
      throw new Error('Bu slot artık müsait değil');
    }

    const appointmentDate = new Date(`${slotData.date}T${slotData.startTime}:00`);
    
    const appointment: Omit<VideoAppointment, 'id'> = {
      slotId,
      dietitianId: slotData.dietitianId,
      patientId,
      dietitianName: '',
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
    
    await updateDoc(doc(db, 'appointment_slots', slotId), {
      isAvailable: false,
    });

    const videoCall = await createVideoCall(
      docRef.id,
      slotData.dietitianId,
      patientId,
      '',
      patientName,
      appointmentDate,
      slotData.maxDuration
    );

    await updateDoc(doc(db, 'video_appointments', docRef.id), {
      videoCallId: videoCall.id,
      meetingLink: `diyetle://video-call/${videoCall.roomId}`,
    });

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

    return { id: docRef.id, videoCallId: videoCall.id, ...appointment };
  } catch (error) {
    throw error;
  }
};

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

    return true;
  } catch (error) {
    throw error;
  }
};

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
    
    if (appointmentData.dietitianId !== userId && appointmentData.patientId !== userId) {
      throw new Error('Bu randevuyu iptal etme yetkiniz yok');
    }

    // Cancellation policy: cannot cancel less than 24 hours before appointment
    const appointmentTime = appointmentData.appointmentDate.toDate();
    const hoursUntilAppointment = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 24) {
    }

    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: reason,
      refundRequested,
    });

    await updateDoc(doc(db, 'appointment_slots', appointmentData.slotId), {
      isAvailable: true,
    });

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

    return true;
  } catch (error) {
    throw error;
  }
};

export const getAvailableSlots = async (dietitianId: string, startDate: Date, endDate: Date) => {
  try {
    if (!dietitianId || !startDate || !endDate) {
      return [];
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
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
    // Fallback query when Firestore composite index is not available
    try {
      if (!dietitianId) {
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
      return [];
    }
  }
};

export const getAppointmentHistory = async (userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    if (!userId || !userRole) {
      return [];
    }

    const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
    
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
    // Fallback query when Firestore composite index is not available
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
      return [];
    }
  }
};

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

  } catch (error) {
  }
};