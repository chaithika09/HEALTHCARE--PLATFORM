import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/theme/colors';

// Screens
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import OTPVerifyScreen from './src/screens/auth/OTPVerifyScreen';

import IncomingCallModal from './src/components/IncomingCallModal';

import PatientDashboard from './src/screens/patient/PatientDashboard';
import AppointmentsScreen from './src/screens/patient/AppointmentsScreen';
import BookAppointmentScreen from './src/screens/patient/BookAppointmentScreen';
import MedicalRecordsScreen from './src/screens/patient/MedicalRecordsScreen';
import PrescriptionsScreen from './src/screens/patient/PrescriptionsScreen';
import VideoConsultationScreen from './src/screens/patient/VideoConsultationScreen';
import ProfileScreen from './src/screens/patient/ProfileScreen';
import DoctorsScreen from './src/screens/patient/DoctorsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function PatientTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.card, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '700', color: Colors.text, fontSize: 18 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, backgroundColor: Colors.card, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse-outline';
          if (route.name === 'Dashboard') iconName = 'grid-outline';
          else if (route.name === 'Appointments') iconName = 'calendar-outline';
          else if (route.name === 'Records') iconName = 'folder-open-outline';
          else if (route.name === 'Prescriptions') iconName = 'medical-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Appointments' }} />
      <Tab.Screen name="Records" component={MedicalRecordsScreen} options={{ title: 'Records' }} />
      <Tab.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: 'Prescriptions' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <IncomingCallModal />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthStack} />
          ) : (
            <>
              <Stack.Screen name="PatientTab" component={PatientTabNavigator} />
              <Stack.Screen
                name="BookAppointment"
                component={BookAppointmentScreen}
                options={{ headerShown: true, title: 'Book Appointment', headerBackTitleVisible: false }}
              />
              <Stack.Screen
                name="Doctors"
                component={DoctorsScreen}
                options={{ headerShown: true, title: 'Find Doctors', headerBackTitleVisible: false }}
              />
              <Stack.Screen
                name="VideoConsultation"
                component={VideoConsultationScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
