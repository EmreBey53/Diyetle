// src/contexts/PatientsModalContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../models/Patient';
import { getPatientsByDietitian } from '../services/patientService';
import { getCurrentUser } from '../services/authService';

interface PatientsModalContextType {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  patients: Patient[];
  refreshPatients: () => Promise<void>;
}

const PatientsModalContext = createContext<PatientsModalContextType | undefined>(undefined);

export const PatientsModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  const refreshPatients = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const patientsData = await getPatientsByDietitian(currentUser.id);
        setPatients(patientsData);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  useEffect(() => {
    refreshPatients();
  }, []);

  const openModal = () => {
    refreshPatients(); // Refresh when opening
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <PatientsModalContext.Provider value={{ modalVisible, openModal, closeModal, patients, refreshPatients }}>
      {children}
    </PatientsModalContext.Provider>
  );
};

export const usePatientsModal = () => {
  const context = useContext(PatientsModalContext);
  if (context === undefined) {
    throw new Error('usePatientsModal must be used within a PatientsModalProvider');
  }
  return context;
};
