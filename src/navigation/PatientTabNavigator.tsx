import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { PatientDietModalProvider, usePatientDietModal } from '../contexts/PatientDietModalContext';
import { PatientQuestionsModalProvider, usePatientQuestionsModal } from '../contexts/PatientQuestionsModalContext';
import PatientHomeScreenNew from '../screens/PatientHomeScreenNew';
import PatientDietPlanScreen from '../screens/PatientDietPlanScreen';
import PatientQuestionsScreen from '../screens/PatientQuestionsScreen';
import PatientSettingsScreen from '../screens/PatientSettingsScreen';
import PatientDietModal from '../components/PatientDietModal';
import PatientQuestionsModal from '../components/PatientQuestionsModal';

const Tab = createBottomTabNavigator();

function TabNavigatorContent() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const navigation = useNavigation<any>();
  const { modalVisible: dietModalVisible, openModal: openDietModal, closeModal: closeDietModal } = usePatientDietModal();
  const { modalVisible: questionsModalVisible, openModal: openQuestionsModal, closeModal: closeQuestionsModal, questions } = usePatientQuestionsModal();

  // Double-tap detection for home screen refresh
  const lastTapTime = useRef(0);
  const homeScreenRef = useRef<any>(null);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'PatientHome') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'PatientDiet') {
              iconName = focused ? 'restaurant' : 'restaurant-outline';
            } else if (route.name === 'PatientMessages') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'PatientSettings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 85,
            paddingBottom: 10,
            paddingTop: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: 0.3,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen
          name="PatientHome"
          options={{
            headerShown: false,
            tabBarLabel: 'Ana Ekran',
          }}
          listeners={{
            tabPress: (e) => {
              const now = Date.now();
              const DOUBLE_TAP_DELAY = 300; // 300ms

              if (lastTapTime.current && now - lastTapTime.current < DOUBLE_TAP_DELAY) {
                // Double tap detected - trigger refresh
                e.preventDefault();
                if (homeScreenRef.current?.refresh) {
                  homeScreenRef.current.refresh();
                }
                lastTapTime.current = 0;
              } else {
                // Single tap - just navigate (default behavior)
                lastTapTime.current = now;
              }
            },
          }}
        >
          {(props) => <PatientHomeScreenNew {...props} ref={homeScreenRef} />}
        </Tab.Screen>
        <Tab.Screen
          name="PatientDiet"
          component={PatientDietPlanScreen}
          options={{
            headerTitle: '',
            tabBarLabel: 'Diyet',
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openDietModal();
            },
          }}
        />
        <Tab.Screen
          name="PatientMessages"
          component={PatientQuestionsScreen}
          options={{
            headerTitle: '',
            tabBarLabel: 'Mesajlar',
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openQuestionsModal();
            },
          }}
        />
        <Tab.Screen
          name="PatientSettings"
          component={PatientSettingsScreen}
          options={{
            headerTitle: '',
            tabBarLabel: 'Ayarlar',
          }}
        />
      </Tab.Navigator>

      {/* Global Diet Modal */}
      <PatientDietModal
        visible={dietModalVisible}
        onClose={closeDietModal}
        onViewFullDiet={() => {
          navigation.navigate('PatientDietPlan');
        }}
      />

      {/* Global Questions Modal */}
      <PatientQuestionsModal
        visible={questionsModalVisible}
        onClose={closeQuestionsModal}
        questions={questions}
        onQuestionPress={(question) => {
          navigation.navigate('PatientQuestions');
        }}
        onSendNewQuestion={() => {
          navigation.navigate('SendQuestion');
        }}
      />
    </>
  );
}

export default function PatientTabNavigator() {
  return (
    <PatientDietModalProvider>
      <PatientQuestionsModalProvider>
        <TabNavigatorContent />
      </PatientQuestionsModalProvider>
    </PatientDietModalProvider>
  );
}
