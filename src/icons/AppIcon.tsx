import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * App-wide icon (Ionicons). The legacy IcoMoon names still used across screens are mapped
 * to their Ionicons equivalent; any other name is passed straight to Ionicons.
 */
const LEGACY: Record<string, string> = {
  return: 'chevron-back',
  profile: 'person-outline',
  time: 'time-outline',
  clock: 'time-outline',
  date: 'calendar-outline',
  calendar: 'calendar-outline',
  info: 'information-circle-outline',
  location: 'location-outline',
  search: 'search',
  star: 'star',
  'star-solid': 'star',
  book: 'book-outline',
  'book-open': 'book-outline',
  notifcations: 'notifications-outline',
  pen: 'create-outline',
  setting: 'settings-outline',
};

type Props = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

const AppIcon: React.FC<Props> = ({ name, size = 20, color = '#111', style }) => (
  <Ionicons name={LEGACY[name] ?? name} size={size} color={color} style={style} />
);

export default AppIcon;
