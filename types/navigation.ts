import { ImageSourcePropType } from 'react-native';

export type RootStackParamList = {
    Home: undefined;
    Booking: { background: ImageSourcePropType };
    Login: undefined;
    Signup: undefined;
    Appointments: undefined;
    ReservationDetail: { reservation: any };
  };
  