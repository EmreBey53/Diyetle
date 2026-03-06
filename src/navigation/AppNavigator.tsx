import React, { useEffect, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import * as Notifications from 'expo-notifications';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DietitianTabNavigator from './DietitianTabNavigator';
import PatientTabNavigator from './PatientTabNavigator';
import PatientsListScreen from '../screens/PatientsListScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import AddEditPatientScreen from '../screens/AddEditPatientScreen';
import PatientProfileScreen from '../screens/PatientProfileScreen';
import CreateDietPlanScreen from '../screens/CreateDietPlanScreen';
import SendQuestionScreen from '../screens/SendQuestionScreen';
import PatientDietPlanScreen from '../screens/PatientDietPlanScreen';
import DietitianPlansListScreen from '../screens/DietitianPlansListScreen';
import DietPlanDetailScreen from '../screens/DietPlanDetailScreen';
import EditDietPlanScreen from '../screens/EditDietPlanScreen';
import PatientQuestionsScreen from '../screens/PatientQuestionsScreen';
import DietitianQuestionsScreen from '../screens/DietitianQuestionsScreen';
import AnswerQuestionScreen from '../screens/AnswerQuestionScreen';
import PatientProgressScreen from '../screens/PatientProgressScreen';
import ViewPatientProgressScreen from '../screens/ViewPatientProgressScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChangeEmailScreen from '../screens/ChangeEmailScreen';
import PatientMealPhotoScreen from '../screens/PatientMealPhotoScreen';
import DietitianMealPhotosScreen from '../screens/DietitianMealPhotosScreen';
import PatientRemindersSettingsScreen from '../screens/PatientRemindersSettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatSelectionScreen from '../screens/ChatSelectionScreen';
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import VideoCallSelectionScreen from '../screens/VideoCallSelectionScreen';
import AppointmentCalendarScreen from '../screens/AppointmentCalendarScreen';
import KVKKConsentScreen from '../screens/KVKKConsentScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import CreateAppointmentScreen from '../screens/CreateAppointmentScreen';
import DietitianAppointmentsScreen from '../screens/DietitianAppointmentsScreen';
import PatientAppointmentsScreen from '../screens/PatientAppointmentsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import MoodTrackerScreen from '../screens/MoodTrackerScreen';
import ExerciseLogScreen from '../screens/ExerciseLogScreen';
import DietPlanTemplatesScreen from '../screens/DietPlanTemplatesScreen';
import BroadcastMessageScreen from '../screens/BroadcastMessageScreen';
import BadgesScreen from '../screens/BadgesScreen';
import SelectDietitianScreen from '../screens/SelectDietitianScreen';
import DietitianProfileScreen from '../screens/DietitianProfileScreen';
import WaterTrackingScreen from '../screens/WaterTrackingScreen';

import { configureGoogleSignIn } from '../services/authService';

configureGoogleSignIn();

const Stack = createStackNavigator();

export default function AppNavigator() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      const nav = navigationRef.current;
      if (!nav || !nav.isReady()) return;

      switch (data?.type) {
        case 'new_appointment':
        case 'appointment_reminder':
          nav.navigate('PatientAppointments' as never);
          break;
        case 'new_message':
          nav.navigate('ChatSelection' as never);
          break;
        case 'new_diet_plan':
          nav.navigate('PatientDietPlan' as never);
          break;
        case 'new_patient':
          nav.navigate('PatientsList' as never);
          break;
        case 'diet_expiring':
        case 'diet_expired':
          nav.navigate('DietitianHome' as never);
          break;
        default:
          break;
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
            letterSpacing: 0.5,
          },
          headerTitleAlign: 'center',
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ headerShown: false, gestureEnabled: false }} />

        <Stack.Screen
          name="DietitianHome"
          component={DietitianTabNavigator}
          options={{ headerShown: false, gestureEnabled: false, headerLeft: () => null }}
        />
        <Stack.Screen
          name="PatientHome"
          component={PatientTabNavigator}
          options={{ headerShown: false, gestureEnabled: false, headerLeft: () => null }}
        />

        <Stack.Screen
          name="KVKKConsent"
          component={KVKKConsentScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="PendingApproval"
          component={PendingApprovalScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Questionnaire"
          component={QuestionnaireScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="SelectDietitian"
          component={SelectDietitianScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />

        <Stack.Screen
          name="PatientsList"
          component={PatientsListScreen}
          options={({ navigation }) => ({
            title: 'Danışanlarım',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('DietitianHome');
                  }
                }}
                style={{ marginLeft: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Danışan Detayı' }} />
        <Stack.Screen name="AddPatient" component={AddEditPatientScreen} options={{ title: 'Yeni Danışan' }} />
        <Stack.Screen name="EditPatient" component={AddEditPatientScreen} options={{ title: 'Danışan Düzenle' }} />
        <Stack.Screen name="PatientProfile" component={PatientProfileScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="EditPatientProfile" component={AddEditPatientScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="CreateDietPlan" component={CreateDietPlanScreen} options={{ title: 'Diyet Planı Oluştur' }} />
        <Stack.Screen name="SendQuestion" component={SendQuestionScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="PatientProgress" component={PatientProgressScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="ViewPatientProgress" component={ViewPatientProgressScreen} options={{ title: 'Danışan İlerlemesi' }} />
        <Stack.Screen name="PatientDietPlan" component={PatientDietPlanScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="DietitianPlansList" component={DietitianPlansListScreen} options={{ title: 'Diyet Planları' }} />
        <Stack.Screen name="DietPlanDetail" component={DietPlanDetailScreen} options={{ title: 'Plan Detayı' }} />
        <Stack.Screen name="EditDietPlan" component={EditDietPlanScreen} options={{ title: 'Planı Düzenle' }} />
        <Stack.Screen name="PatientQuestions" component={PatientQuestionsScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="DietitianQuestions" component={DietitianQuestionsScreen} options={{ title: 'Danışan Soruları' }} />
        <Stack.Screen name="AnswerQuestion" component={AnswerQuestionScreen} options={{ title: 'Soruyu Cevapla' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatSelection" component={ChatSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VideoCallSelection" component={VideoCallSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AppointmentCalendar" component={AppointmentCalendarScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateAppointment" component={CreateAppointmentScreen} options={{ title: 'Yeni Randevu Oluştur' }} />
        <Stack.Screen name="DietitianAppointments" component={DietitianAppointmentsScreen} options={{ title: 'Randevularım' }} />
        <Stack.Screen name="PatientAppointments" component={PatientAppointmentsScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="DietitianMealPhotos" component={DietitianMealPhotosScreen} options={{ title: 'Hastanın Öğün Fotoğrafları' }} />
        <Stack.Screen name="PatientMealPhoto" component={PatientMealPhotoScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="PatientRemindersSettings" component={PatientRemindersSettingsScreen} options={{ headerTitle: '' }} />
        <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MoodTracker" component={MoodTrackerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DietPlanTemplates" component={DietPlanTemplatesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BroadcastMessage" component={BroadcastMessageScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Badges" component={BadgesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DietitianProfile" component={DietitianProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WaterTracking" component={WaterTrackingScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
