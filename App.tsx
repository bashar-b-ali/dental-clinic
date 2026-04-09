import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DataProvider } from './src/context/DataContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </DataProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
