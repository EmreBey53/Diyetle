export interface Question {
  id?: string;
  patientId: string;
  patientName?: string;
  dietitianId: string;
  question: string;
  answer?: string;
  isAnswered: boolean;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const getQuestionStatusColor = (isAnswered: boolean): string => {
  return isAnswered ? '#4CAF50' : '#FF9800';
};

export const getQuestionStatusText = (isAnswered: boolean): string => {
  return isAnswered ? 'Cevaplanmış' : 'Bekliyor';
};
