// src/contexts/QuestionsModalContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Question } from '../models/Question';
import { getQuestionsByDietitian } from '../services/questionService';
import { getCurrentUser } from '../services/authService';

interface QuestionsModalContextType {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  questions: Question[];
  refreshQuestions: () => Promise<void>;
}

const QuestionsModalContext = createContext<QuestionsModalContextType | undefined>(undefined);

export const QuestionsModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const refreshQuestions = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const questionsData = await getQuestionsByDietitian(currentUser.id);
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  useEffect(() => {
    refreshQuestions();
  }, []);

  const openModal = () => {
    refreshQuestions(); // Refresh when opening
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <QuestionsModalContext.Provider value={{ modalVisible, openModal, closeModal, questions, refreshQuestions }}>
      {children}
    </QuestionsModalContext.Provider>
  );
};

export const useQuestionsModal = () => {
  const context = useContext(QuestionsModalContext);
  if (context === undefined) {
    throw new Error('useQuestionsModal must be used within a QuestionsModalProvider');
  }
  return context;
};
