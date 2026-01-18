// src/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

type ThemeMode = 'light' | 'dark';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@diyetle_theme_preference';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Load theme preference from storage
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('System theme changed to:', colorScheme);
      if (themePreference === 'system') {
        updateThemeFromSystem(colorScheme);
      }
    });

    return () => subscription.remove();
  }, [themePreference]);

  // Update theme when preference changes
  useEffect(() => {
    console.log('Theme preference changed to:', themePreference);
    if (themePreference === 'system') {
      const systemTheme = Appearance.getColorScheme();
      console.log('Current system theme:', systemTheme);
      updateThemeFromSystem(systemTheme);
    } else {
      setTheme(themePreference);
    }
  }, [themePreference]);

  const updateThemeFromSystem = (colorScheme: ColorSchemeName) => {
    const newTheme = colorScheme === 'dark' ? 'dark' : 'light';
    console.log('Updating theme from system:', colorScheme, '-> Setting theme to:', newTheme);
    setTheme(newTheme);
  };

  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      console.log('Loaded saved preference:', savedPreference);
      if (savedPreference === 'dark' || savedPreference === 'light' || savedPreference === 'system') {
        setThemePreferenceState(savedPreference);
      } else {
        // İlk açılışta sistem temasını kullan
        console.log('No saved preference, using system theme');
        setThemePreferenceState('system');
        const systemTheme = Appearance.getColorScheme();
        console.log('Initial system theme:', systemTheme);
        updateThemeFromSystem(systemTheme);
      }
    } catch (error) {
      console.error('Theme yükleme hatası:', error);
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      setThemePreferenceState(preference);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
      console.error('Theme kaydetme hatası:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme: ThemePreference = theme === 'light' ? 'dark' : 'light';
      await setThemePreference(newTheme);
    } catch (error) {
      console.error('Theme değiştirme hatası:', error);
    }
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
