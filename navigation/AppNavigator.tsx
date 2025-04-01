import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import Navbar from '../components/Navbar';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="Home">
    <Stack.Screen name="Home" component={HomeScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Booking" component={BookingScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Signup" component={SignupScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ header: () => <Navbar /> }} />
  </Stack.Navigator>
);

export default AppNavigator;
