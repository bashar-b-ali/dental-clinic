import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { hasPassword as checkHasPassword } from '../utils/auth';
import { colors, fontSize } from '../utils/theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import SetPasswordScreen from '../screens/SetPasswordScreen';
import LockScreen from '../screens/LockScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PatientsScreen from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import AddPatientScreen from '../screens/AddPatientScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import AddAppointmentScreen from '../screens/AddAppointmentScreen';
import BillingScreen from '../screens/BillingScreen';
import AddPaymentScreen from '../screens/AddPaymentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import PatientFilesScreen from '../screens/PatientFilesScreen';
import FileViewerScreen from '../screens/FileViewerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Context so Settings can trigger password change
const PasswordActionContext = createContext<{
  onChangePassword: () => void;
}>({ onChangePassword: () => {} });

export function usePasswordAction() {
  return useContext(PasswordActionContext);
}

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Patients') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Appointments') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Billing') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: t('tab_dashboard') }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ tabBarLabel: t('tab_patients') }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ tabBarLabel: t('tab_appointments') }} />
      <Tab.Screen name="Billing" component={BillingScreen} options={{ tabBarLabel: t('tab_billing') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tab_settings') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoading, isOnboarded, doctor } = useData();
  const { t } = useLanguage();

  const [authChecked, setAuthChecked] = useState(false);
  const [passwordExists, setPasswordExists] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    checkHasPassword().then((has) => {
      setPasswordExists(has);
      if (!has) setIsAuthenticated(true);
      setAuthChecked(true);
    });
  }, []);

  // After onboarding completes, if no password set, prompt to create one
  useEffect(() => {
    if (isOnboarded && authChecked && !passwordExists) {
      setNeedsPasswordSetup(true);
    }
  }, [isOnboarded, authChecked, passwordExists]);

  const handleUnlock = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handlePasswordSetComplete = useCallback(() => {
    setPasswordExists(true);
    setIsAuthenticated(true);
    setNeedsPasswordSetup(false);
    setChangingPassword(false);
  }, []);

  const handleChangePassword = useCallback(() => {
    setChangingPassword(true);
  }, []);

  // Loading
  if (isLoading || !authChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Lock screen on cold start
  if (isOnboarded && passwordExists && !isAuthenticated) {
    return <LockScreen doctorName={doctor?.name} onUnlock={handleUnlock} />;
  }

  // First-time password setup after onboarding
  if (needsPasswordSetup) {
    return (
      <SetPasswordScreen
        isChangeMode={false}
        onComplete={handlePasswordSetComplete}
      />
    );
  }

  // Change password overlay
  if (changingPassword) {
    return (
      <SetPasswordScreen
        isChangeMode={true}
        onComplete={handlePasswordSetComplete}
        onCancel={() => setChangingPassword(false)}
      />
    );
  }

  return (
    <PasswordActionContext.Provider value={{ onChangePassword: handleChangePassword }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card, elevation: 0, shadowOpacity: 0 },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700', fontSize: fontSize.lg },
            cardStyle: { backgroundColor: colors.bg },
          }}
        >
          {!isOnboarded ? (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="AddPatient" component={AddPatientScreen} options={{ title: t('header_patient') }} />
              <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: t('header_patientDetail') }} />
              <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} options={{ title: t('header_appointment') }} />
              <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: t('header_appointmentDetail') }} />
              <Stack.Screen name="AddPayment" component={AddPaymentScreen} options={{ title: t('header_recordPayment') }} />
              <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: t('header_reports') }} />
              <Stack.Screen name="PatientFiles" component={PatientFilesScreen} options={{ title: t('header_patientFiles') }} />
              <Stack.Screen name="FileViewer" component={FileViewerScreen} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PasswordActionContext.Provider>
  );
}
