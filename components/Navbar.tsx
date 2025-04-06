import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getCurrentUser } from '../services/auth';

const logo = require('../assets/images/logo.png');
const logoLight = require('../assets/images/logo-light.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC<{ transparent?: boolean }> = ({ transparent }) => {
    const navigation = useNavigation<NavigationProp>();
    const canGoBack = navigation.canGoBack();
    const insets = useSafeAreaInsets();

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const user = await getCurrentUser();
            setIsLoggedIn(!!user);
        };

        // Check on mount and when navbar regains focus
        const unsubscribe = navigation.addListener('focus', checkUser);
        checkUser();

        return unsubscribe;
    }, [navigation]);

    return (
        <View className={transparent ? 'bg-transparent' : 'bg-white'} style={{ paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View className={`flex-row items-center justify-between px-4 py-3 ${transparent ? 'bg-transparent' : 'bg-white'}`}>
                {/* Left: Back or logo */}
                {canGoBack ? (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <IcoMoonIcon name="return" size={50} color={transparent ? "#fff" : "#000"} />
                    </TouchableOpacity>
                ) : (
                    <Image
                        source={transparent ? logoLight : logo}
                        style={{ width: 100, height: 54, resizeMode: 'contain' }}
                    />
                )}

                {/* Center: Logo if back button exists */}
                {canGoBack && (
                    <Image
                        source={transparent ? logoLight : logo}
                        style={{ width: 100, height: 54, resizeMode: 'contain' }}
                    />
                )}

                {/* Right: Profile/Login button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate(isLoggedIn ? 'Profile' : 'Login')}
                    className="btn-icon" >
                    <IcoMoonIcon name="profile" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Navbar;
