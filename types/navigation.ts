import { ImageSourcePropType } from 'react-native';

export type RootStackParamList = {
  Home: undefined;
  Booking: { background: ImageSourcePropType; category: string };
  Login: undefined;
  Signup: undefined;
  Appointments: undefined;
  ReservationDetail: {
    reservation: any;
    startInEditMode: boolean;
  };
  SearchResults: {
    query: string;
    category: string;
    coords: { lat: number; lng: number } | null;
  };
};