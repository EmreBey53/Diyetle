export interface Appointment {
  id: string;
  dietitianId: string;
  patientId: string;
  date: string; // ISO format: 2025-11-21
  time: string; // HH:mm format: 14:30
  startDateTime: number; // Unix timestamp
  meetingLink: string; // Zoom, Google Meet URL
  status: 'scheduled' | 'completed' | 'cancelled';
  patientName: string;
  patientPhone?: string;
  dietitianName: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppointmentFormData {
  patientId: string;
  date: string;
  time: string;
  meetingLink: string;
  notes?: string;
  meetingType?: 'link' | 'app';
}

export interface NotificationPayload {
  appointmentId: string;
  dietitianId: string;
  patientId: string;
  type: 'appointment_scheduled' | 'appointment_reminder' | 'appointment_cancelled';
  title: string;
  body: string;
  scheduledTime: number;
}