// App.tsx
// React Native için polyfills
import { Buffer } from '@craftzdog/react-native-buffer';

// Global polyfills
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer as any;
}

if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  } as any;
}

// Stream polyfill
if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (fn: any) => setTimeout(fn, 0),
    version: '',
    platform: 'react-native'
  } as any;
}

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

// Bildirim handler'ını ayarla
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
    // Bildirim listener'larını ayarla
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Bildirim alındı:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data
      });
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Bildirime tıklandı:', {
        title: response.notification.request.content.title,
        data: response.notification.request.content.data
      });
      
      // Bildirim tipine göre yönlendirme yapılabilir
      const data = response.notification.request.content.data;
      if (data?.type === 'chat_message' && data?.chatRoomId) {
        console.log('💬 Chat ekranına yönlendirilecek:', {
          chatRoomId: data.chatRoomId,
          senderName: data.senderName
        });
        // Burada navigation yapılabilir (NavigationContainer ref gerekli)
      }
    });

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