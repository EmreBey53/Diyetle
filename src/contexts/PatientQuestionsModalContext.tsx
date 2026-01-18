// src/contexts/PatientQuestionsModalContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Question } from '../models/Question';
import { getQuestionsByPatient } from '../services/questionService';
import { getCurrentUser } from '../services/authService';

interface PatientQuestionsModalContextType {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  questions: Question[];
  refreshQuestions: () => Promise<void>;
}

const PatientQuestionsModalContext = createContext<PatientQuestionsModalContextType | undefined>(undefined);

export const PatientQuestionsModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const refreshQuestions = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Hasta kendi user ID'sini kullanarak sorularını alır
        const questionsData = await getQuestionsByPatient(currentUser.id);
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      // Hata durumunda boş liste göster
      setQuestions([]);
    }
  };

  useEffect(() => {
    refreshQuestions();
  }, []);

  const openModal = () => {
    refreshQuestions();
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <PatientQuestionsModalContext.Provider value={{ modalVisible, openModal, closeModal, questions, refreshQuestions }}>
      {children}
    </PatientQuestionsModalContext.Provider>
  );
};

export const usePatientQuestionsModal = () => {
  const context = useContext(PatientQuestionsModalContext);
  if (context === undefined) {
    throw new Error('usePatientQuestionsModal must be used within a PatientQuestionsModalProvider');
  }
  return context;
};
