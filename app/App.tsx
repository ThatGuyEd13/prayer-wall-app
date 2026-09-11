import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { colors } from './src/theme';
import { Header } from './src/components/Header';
import { TabBar } from './src/components/TabBar';
import { Toast } from './src/components/Toast';
import { ComposeSheet } from './src/components/ComposeSheet';
import { AdminActionSheet } from './src/components/AdminActionSheet';
import { SignInScreen } from './src/screens/SignInScreen';
import { CodeScreen } from './src/screens/CodeScreen';
import { PinScreen } from './src/screens/PinScreen';
import { SetPinScreen } from './src/screens/SetPinScreen';
import { WallScreen } from './src/screens/WallScreen';
import { PrayScreen } from './src/screens/PrayScreen';
import { MineScreen } from './src/screens/MineScreen';
import { NoticesScreen } from './src/screens/NoticesScreen';
import { AdminScreen } from './src/screens/AdminScreen';

function Shell() {
  const { ui } = useApp();

  if (!ui.loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  if (ui.auth === 'signin') return <SignInScreen />;
  if (ui.auth === 'code') return <CodeScreen />;
  if (ui.auth === 'setpin') return <SetPinScreen />;
  if (ui.auth === 'pin') return <PinScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <Header />
      {ui.tab === 'wall' && <WallScreen />}
      {ui.tab === 'pray' && <PrayScreen />}
      {ui.tab === 'mine' && <MineScreen />}
      {ui.tab === 'notices' && <NoticesScreen />}
      {ui.tab === 'admin' && <AdminScreen />}
      <TabBar />
      <Toast />
      <ComposeSheet />
      <AdminActionSheet />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
