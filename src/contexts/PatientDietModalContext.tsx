import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';

interface PatientDietModalContextType {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  refreshData: () => Promise<void>;
}

const PatientDietModalContext = createContext<PatientDietModalContextType | undefined>(undefined);

export const PatientDietModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const refreshData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await getPatientProfileByUserId(currentUser.id);
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openModal = () => {
    refreshData();
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <PatientDietModalContext.Provider value={{ modalVisible, openModal, closeModal, refreshData }}>
      {children}
    </PatientDietModalContext.Provider>
  );
};

export const usePatientDietModal = () => {
  const context = useContext(PatientDietModalContext);
  if (context === undefined) {
    throw new Error('usePatientDietModal must be used within a PatientDietModalProvider');
  }
  return context;
};
