import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

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
import CreateAppointmentScreen from '../screens/CreateAppointmentScreen';
import DietitianAppointmentsScreen from '../screens/DietitianAppointmentsScreen';
import PatientAppointmentsScreen from '../screens/PatientAppointmentsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
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
          name="Questionnaire"
          component={QuestionnaireScreen}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
