// src/models/PatientProfile.ts
export interface PatientProfile {
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  gender?: 'male' | 'female';
  dietitianId: string;
  dietitianName?: string;
  createdAt: Date;
  updatedAt: Date;
}