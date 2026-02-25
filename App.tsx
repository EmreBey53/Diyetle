import { Buffer } from '@craftzdog/react-native-buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer as any;
}

if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (fn: any) => setTimeout(fn, 0),
    version: '',
    platform: 'react-native'
  } as any;
}

import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(() => {});

    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
