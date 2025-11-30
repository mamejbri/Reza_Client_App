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
import EditReservationForm from '../../components/EditReservationForm';
import EstablishmentBookingScreen from '../screens/EstablishmentBookingScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="Home">
    <Stack.Screen name="Home" component={HomeScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Booking" component={BookingScreen} options={{ headerTransparent: true, header: () => <Navbar transparent /> }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Signup" component={SignupScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ header: () => <Navbar /> }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}options={{ headerShown: false }}/>
    <Stack.Screen name="EstablishmentBooking"component={EstablishmentBookingScreen}options={{ header: () => <Navbar /> }}
    />
  </Stack.Navigator>
);

export default AppNavigator;
