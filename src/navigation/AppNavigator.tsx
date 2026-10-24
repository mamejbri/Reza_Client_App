import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ReservationDetailScreen from '../screens/ReservationDetailScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import Navbar from '../../components/Navbar';
import type { RootStackParamList } from '../../types/navigation';
import EstablishmentBookingScreen from '../screens/EstablishmentBookingScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Home"
    // Soft screen changes: a short fade with a slight upward drift instead of the platform default.
    screenOptions={{ animation: 'fade_from_bottom', animationDuration: 280 }}
  >
    <Stack.Screen name="Home" component={HomeScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Booking" component={BookingScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="Signup" component={SignupScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="EstablishmentBooking" component={EstablishmentBookingScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }}
    />
  </Stack.Navigator>
);

export default AppNavigator;
