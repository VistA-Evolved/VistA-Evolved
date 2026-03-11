import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import PatientScreen from './screens/PatientScreen';
import ModuleScreen from './screens/ModuleScreen';
import VitalsScreen from './screens/VitalsScreen';
import MedsScreen from './screens/MedsScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import ScanScreen from './screens/ScanScreen';
import MoreScreen from './screens/MoreScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Patient: { dfn: string; name: string };
  Module: { moduleId: string; moduleName: string; dfn?: string };
};

export type TabParamList = {
  Home: undefined;
  Vitals: undefined;
  Meds: undefined;
  Schedule: undefined;
  Scan: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠', Vitals: '💓', Meds: '💊', Schedule: '📅', Scan: '📷', More: '⚙️',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.6 }}>
      {icons[label] || '•'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#e2e8f0',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Patients' }} />
      <Tab.Screen name="Vitals" component={VitalsScreen} />
      <Tab.Screen name="Meds" component={MedsScreen} options={{ title: 'Medications' }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Barcode' }} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#e2e8f0',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Patient" component={PatientScreen} options={({ route }) => ({ title: route.params.name })} />
        <Stack.Screen name="Module" component={ModuleScreen} options={({ route }) => ({ title: route.params.moduleName })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
