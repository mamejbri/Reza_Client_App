// src/components/Navbar.tsx (or wherever your Navbar lives)
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StatusBar, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../src/icons/AppIcon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getCurrentUser } from '../services/user';     // ✅ add
import LocaleSwitcher from '../src/i18n/LocaleSwitcher';
import { useResponsive } from '../src/utils/responsive';

const logo = require('../assets/images/logo.png');
const logoLight = require('../assets/images/logo-light.png');

const BRAND = '#C53334';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC<{ transparent?: boolean }> = ({ transparent }) => {
  const navigation = useNavigation<NavigationProp>();
  const canGoBack = navigation.canGoBack();
  const insets = useSafeAreaInsets();
  const { scale } = useResponsive();
  const logoStyle = { width: scale(84), height: scale(40), resizeMode: 'contain' as const };
  const iconBox = scale(42);
  const roundBox = { width: iconBox, height: iconBox, borderRadius: iconBox / 2 };

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      setIsLoggedIn(!!user);
    };

    const unsubscribe = navigation.addListener('focus', checkUser);
    checkUser();

    return unsubscribe;
  }, [navigation]);

  const logoButton = (
    <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
      <Image source={transparent ? logoLight : logo} style={logoStyle} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        { paddingTop: insets.top, backgroundColor: transparent ? 'transparent' : '#FFFFFF' },
        !transparent && styles.bar,
      ]}
    >
      <StatusBar barStyle={transparent ? 'light-content' : 'dark-content'} backgroundColor={transparent ? 'transparent' : '#fff'} />
      <View style={styles.row}>
        {/* Logo is centered on the whole bar (not between the side items) when a back button exists */}
        {canGoBack && (
          <View style={styles.center} pointerEvents="box-none">
            {logoButton}
          </View>
        )}

        {/* Left: Back or logo */}
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={[styles.iconButton, roundBox, transparent ? styles.iconButtonLight : styles.iconButtonDark]}
          >
            <AppIcon name="return" size={scale(22)} color={transparent ? '#fff' : '#111'} />
          </TouchableOpacity>
        ) : (
          logoButton
        )}

        {/* Right: Language/currency + Login/Profile */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LocaleSwitcher light={transparent} />
          <TouchableOpacity
            onPress={() => navigation.navigate(isLoggedIn ? 'Appointments' : 'Login')}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={[styles.iconButton, styles.profileButton, roundBox]}
          >
            <AppIcon name="profile" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    backgroundColor: '#F3F3F1',
  },
  iconButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  profileButton: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

export default Navbar;
