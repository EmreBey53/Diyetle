// src/constants/colors.ts

// Light Theme Colors
export const lightColors = {
  primary: '#4CAF50',
  secondary: '#FF9800',
  accent: '#2196F3',
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  text: '#333333',
  textLight: '#666666',
  border: '#DDDDDD',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',

  // BMI Colors
  bmiUnderweight: '#FFE4B5',
  bmiNormal: '#D4EDDA',
  bmiOverweight: '#FFF3CD',
  bmiObese: '#F8D7DA',
};

// Dark Theme Colors
export const darkColors = {
  primary: '#66BB6A',
  secondary: '#FFB74D',
  accent: '#42A5F5',
  background: '#121212',
  cardBackground: '#1E1E1E',
  white: '#FFFFFF',
  black: '#000000',
  text: '#E0E0E0',
  textLight: '#B0B0B0',
  border: '#333333',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFB74D',
  info: '#42A5F5',

  // BMI Colors (darker variants)
  bmiUnderweight: '#4A3F2A',
  bmiNormal: '#2A4A2F',
  bmiOverweight: '#4A4229',
  bmiObese: '#4A2929',
};

// Default export for backward compatibility
export const colors = lightColors;

// Function to get colors based on theme
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;