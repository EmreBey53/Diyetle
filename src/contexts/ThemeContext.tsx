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
      if (themePreference === 'system') {
        updateThemeFromSystem(colorScheme);
      }
    });

    return () => subscription.remove();
  }, [themePreference]);

  // Update theme when preference changes
  useEffect(() => {
    if (themePreference === 'system') {
      const systemTheme = Appearance.getColorScheme();
      updateThemeFromSystem(systemTheme);
    } else {
      setTheme(themePreference);
    }
  }, [themePreference]);

  const updateThemeFromSystem = (colorScheme: ColorSchemeName) => {
    const newTheme = colorScheme === 'dark' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedPreference === 'dark' || savedPreference === 'light' || savedPreference === 'system') {
        setThemePreferenceState(savedPreference);
      } else {
        // İlk açılışta sistem temasını kullan
        setThemePreferenceState('system');
        const systemTheme = Appearance.getColorScheme();
        updateThemeFromSystem(systemTheme);
      }
    } catch (error) {
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      setThemePreferenceState(preference);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme: ThemePreference = theme === 'light' ? 'dark' : 'light';
      await setThemePreference(newTheme);
    } catch (error) {
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
