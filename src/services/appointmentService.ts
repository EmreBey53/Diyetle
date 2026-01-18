import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Appointment, AppointmentFormData } from '../models/Appointment';

const APPOINTMENTS_COLLECTION = 'appointments';

// CREATE APPOINTMENT
export const createAppointment = async (
  dietitianId: string,
  formData: AppointmentFormData,
  patientName: string,
  dietitianName: string
): Promise<string> => {
  try {
    // Parse date and time to Unix timestamp
    const [year, month, day] = formData.date.split('-');
    const [hours, minutes] = formData.time.split(':');
    const appointmentDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
    const startDateTime = appointmentDate.getTime();

    const appointmentData = {
      dietitianId,
      patientId: formData.patientId,
      date: formData.date,
      time: formData.time,
      startDateTime,
      meetingLink: formData.meetingLink,
      status: 'scheduled',
      patientName,
      patientPhone: '',
      dietitianName,
      notes: formData.notes || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), appointmentData);
    console.log('✅ Randevu oluşturuldu, ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Randevu oluşturma hatası:', error);
    throw new Error(error.message);
  }
};

// GET APPOINTMENTS FOR DIETITIAN
export const getDietitianAppointments = async (
  dietitianId: string
): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const appointments: Appointment[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        dietitianId: data.dietitianId,
        patientId: data.patientId,
        date: data.date,
        time: data.time,
        startDateTime: data.startDateTime,
        meetingLink: data.meetingLink,
        status: data.status,
        patientName: data.patientName,
        patientPhone: data.patientPhone || '',
        dietitianName: data.dietitianName,
        notes: data.notes || '',
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      } as Appointment;
    });

    console.log('✅ Diyetisyen randevuları yüklendi:', appointments.length);
    return appointments;
  } catch (error: any) {
    console.error('❌ Randevular yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// GET APPOINTMENTS FOR PATIENT
export const getPatientAppointments = async (
  patientId: string
): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('patientId', '==', patientId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const appointments: Appointment[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        dietitianId: data.dietitianId,
        patientId: data.patientId,
        date: data.date,
        time: data.time,
        startDateTime: data.startDateTime,
        meetingLink: data.meetingLink,
        status: data.status,
        patientName: data.patientName,
        patientPhone: data.patientPhone || '',
        dietitianName: data.dietitianName,
        notes: data.notes || '',
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      } as Appointment;
    });

    console.log('✅ Hasta randevuları yüklendi:', appointments.length);
    return appointments;
  } catch (error: any) {
    console.error('❌ Randevular yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// REAL-TIME LISTENER FOR APPOINTMENTS
export const subscribeToAppointments = (
  dietitianId: string,
  onAppointmentsUpdate: (appointments: Appointment[]) => void
) => {
  try {
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const appointments: Appointment[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          dietitianId: data.dietitianId,
          patientId: data.patientId,
          date: data.date,
          time: data.time,
          startDateTime: data.startDateTime,
          meetingLink: data.meetingLink,
          status: data.status,
          patientName: data.patientName,
          patientPhone: data.patientPhone || '',
          dietitianName: data.dietitianName,
          notes: data.notes || '',
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        } as Appointment;
      });

      onAppointmentsUpdate(appointments.sort((a, b) => b.startDateTime - a.startDateTime));
    });

    return unsubscribe;
  } catch (error: any) {
    console.error('❌ Subscription hatası:', error);
    return () => {};
  }
};

// UPDATE APPOINTMENT
export const updateAppointment = async (
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<void> => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Randevu güncellendi:', appointmentId);
  } catch (error: any) {
    console.error('❌ Randevu güncelleme hatası:', error);
    throw new Error(error.message);
  }
};

// CANCEL APPOINTMENT
export const cancelAppointment = async (appointmentId: string): Promise<void> => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Randevu iptal edildi:', appointmentId);
  } catch (error: any) {
    console.error('❌ Randevu iptal hatası:', error);
    throw new Error(error.message);
  }
};

// DELETE APPOINTMENT
export const deleteAppointment = async (
  appointmentId: string
): Promise<void> => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await deleteDoc(appointmentRef);
    console.log('✅ Randevu silindi:', appointmentId);
  } catch (error: any) {
    console.error('❌ Randevu silme hatası:', error);
    throw new Error(error.message);
  }
};

// GET UPCOMING APPOINTMENTS (next 7 days)
export const getUpcomingAppointments = async (
  dietitianId: string
): Promise<Appointment[]> => {
  try {
    const appointments = await getDietitianAppointments(dietitianId);
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const upcoming = appointments.filter(
      (apt) =>
        apt.startDateTime >= now &&
        apt.startDateTime <= sevenDaysFromNow &&
        apt.status === 'scheduled'
    );

    console.log('✅ Yaklaşan randevular:', upcoming.length);
    return upcoming;
  } catch (error: any) {
    console.error('❌ Yaklaşan randevular hatası:', error);
    throw new Error(error.message);
  }
};