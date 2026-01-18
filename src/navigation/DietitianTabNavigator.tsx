// src/navigation/DietitianTabNavigator.tsx
import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { PatientsModalProvider, usePatientsModal } from '../contexts/PatientsModalContext';
import { QuestionsModalProvider, useQuestionsModal } from '../contexts/QuestionsModalContext';
import PatientsModal from '../components/PatientsModal';
import QuestionsModal from '../components/QuestionsModal';
import DietitianHomeScreen from '../screens/DietitianHomeScreen';
import PatientsListScreen from '../screens/PatientsListScreen';
import DietitianQuestionsScreen from '../screens/DietitianQuestionsScreen';
import DietitianSettingsScreen from '../screens/DietitianSettingsScreen';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

function TabNavigatorContent() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { modalVisible: patientsModalVisible, openModal: openPatientsModal, closeModal: closePatientsModal, patients } = usePatientsModal();
  const { modalVisible: questionsModalVisible, openModal: openQuestionsModal, closeModal: closeQuestionsModal, questions } = useQuestionsModal();
  const navigation = useNavigation<any>();

  // Double-tap detection for home screen refresh
  const lastTapTime = useRef(0);
  const homeScreenRef = useRef<any>(null);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'PatientsList') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Messages') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Settings') {
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
          name="Home"
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
          {(props) => <DietitianHomeScreen {...props} ref={homeScreenRef} />}
        </Tab.Screen>
        <Tab.Screen
          name="PatientsList"
          component={PatientsListScreen}
          options={{
            title: 'Danışanlarım',
            tabBarLabel: 'Danışanlar',
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openPatientsModal();
            },
          }}
        />
        <Tab.Screen
          name="Messages"
          component={DietitianQuestionsScreen}
          options={{
            title: 'Mesajlar',
            tabBarLabel: 'Mesajlar',
            tabBarBadge: undefined,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openQuestionsModal();
            },
          }}
        />
        <Tab.Screen
          name="Settings"
          component={DietitianSettingsScreen}
          options={{
            title: 'Ayarlar',
            tabBarLabel: 'Ayarlar',
          }}
        />
      </Tab.Navigator>

      {/* Global Patients Modal */}
      <PatientsModal
        visible={patientsModalVisible}
        onClose={closePatientsModal}
        patients={patients}
        onPatientPress={(patient) => {
          closePatientsModal();
          navigation.navigate('PatientDetail', { patient });
        }}
        onAddPatient={() => {
          closePatientsModal();
          navigation.navigate('AddPatient');
        }}
      />

      {/* Global Questions Modal */}
      <QuestionsModal
        visible={questionsModalVisible}
        onClose={closeQuestionsModal}
        questions={questions}
        onQuestionPress={(question) => {
          closeQuestionsModal();
          navigation.navigate('AnswerQuestion', { question });
        }}
      />
    </>
  );
}

export default function DietitianTabNavigator() {
  return (
    <PatientsModalProvider>
      <QuestionsModalProvider>
        <TabNavigatorContent />
      </QuestionsModalProvider>
    </PatientsModalProvider>
  );
}
