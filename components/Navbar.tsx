import React from 'react';
import { View, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const logo = require('../assets/images/logo.png');
const logoLight = require('../assets/images/logo-light.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC = ({transparent}) => {
    const navigation = useNavigation<NavigationProp>();
    const canGoBack = navigation.canGoBack();
    const insets = useSafeAreaInsets();

    return (
        <View className={transparent ? "bg-transparent" : "bg-white"} style={{ paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View className={`flex-row items-center justify-between px-4 py-3 ${transparent ? 'bg-transparent' : 'bg-white'}`}>
                {/* Left: Back button or logo */}
                {canGoBack ? (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <IcoMoonIcon name="return" size={50} color={transparent ? "#fff" : "#000"} />
                    </TouchableOpacity>
                ) : (
                    <Image source={transparent ? logoLight : logo} style={{ width: 100, height: 54, resizeMode: 'contain' }} />
                )}

                {/* Center: Logo only if back is shown */}
                {canGoBack && (
                    <Image source={transparent ? logoLight : logo} style={{ width: 100, height: 54, resizeMode: 'contain' }} />
                )}

                {/* Right: Account/Login */}
                <TouchableOpacity onPress={() => navigation.navigate('Login')} className="btn-icon">
                    <IcoMoonIcon name="profile" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Navbar;