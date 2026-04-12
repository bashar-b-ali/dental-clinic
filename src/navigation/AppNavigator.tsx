import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { hasPassword as checkHasPassword } from '../utils/auth';
import { colors, fontSize, spacing, borderRadius } from '../utils/theme';

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

// Context so Settings can trigger password change
const PasswordActionContext = createContext<{
  onChangePassword: () => void;
}>({ onChangePassword: () => {} });

export function usePasswordAction() {
  return useContext(PasswordActionContext);
}

interface TabDef {
  name: string;
  icon: string;
  iconFocused: string;
  label: string;
  Component: React.ComponentType<any>;
}

function MainTabs() {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const tabs: TabDef[] = [
    { name: 'Dashboard', icon: 'home-outline', iconFocused: 'home', label: t('tab_dashboard'), Component: DashboardScreen },
    { name: 'Patients', icon: 'people-outline', iconFocused: 'people', label: t('tab_patients'), Component: PatientsScreen },
    { name: 'Appointments', icon: 'calendar-outline', iconFocused: 'calendar', label: t('tab_appointments'), Component: AppointmentsScreen },
    { name: 'Billing', icon: 'wallet-outline', iconFocused: 'wallet', label: t('tab_billing'), Component: BillingScreen },
    { name: 'Settings', icon: 'settings-outline', iconFocused: 'settings', label: t('tab_settings'), Component: SettingsScreen },
  ];

  const handleTabPress = (index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentPage(index);
  };

  return (
    <View style={styles.tabContainer}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        overdrag
      >
        {tabs.map((tab) => (
          <View key={tab.name} style={styles.page}>
            <tab.Component />
          </View>
        ))}
      </PagerView>

      {/* Custom Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        {tabs.map((tab, index) => {
          const isFocused = currentPage === index;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, isFocused && styles.tabIconWrapperActive]}>
                <Ionicons
                  name={(isFocused ? tab.iconFocused : tab.icon) as any}
                  size={22}
                  color={isFocused ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperActive: {
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
