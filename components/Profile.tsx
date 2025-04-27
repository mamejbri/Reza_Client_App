import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { logout, getCurrentUser, updateCurrentUser } from '../services/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { launchImageLibrary } from 'react-native-image-picker';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Profile: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [photo, setPhoto] = useState<string | undefined>();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [originalFirstName, setOriginalFirstName] = useState('');
    const [originalLastName, setOriginalLastName] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const user = await getCurrentUser();
            if (user) {
                setEmail(user.email || '');
                setPhone(user.phone || '');
                setFirstName(user.firstName || '');
                setLastName(user.lastName || '');
                setPhoto(user.photo);
                setOriginalFirstName(user.firstName || '');
                setOriginalLastName(user.lastName || '');
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await logout();
        Alert.alert('Déconnecté', 'Vous avez été déconnecté.');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir votre nom et prénom.');
            return;
        }
        setLoading(true);
        const result = await updateCurrentUser({ firstName, lastName, photo });
        setLoading(false);

        if (result.success) {
            Alert.alert('Succès', 'Profil mis à jour.');
            setEditing(false);
            setOriginalFirstName(firstName);
            setOriginalLastName(lastName);
        } else {
            Alert.alert('Erreur', 'Échec de la mise à jour du profil.');
        }
    };

    const handleCancel = () => {
        setFirstName(originalFirstName);
        setLastName(originalLastName);
        setEditing(false);
    };

    const pickImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                maxWidth: 512,
                maxHeight: 512,
                quality: 0.7,
                includeBase64: true
            });

            if (result.assets && result.assets.length > 0) {
                const pickedBase64 = result.assets[0].base64;
                const pickedUri = result.assets[0].uri;

                if (pickedBase64) {
                    const base64Image = `data:${result.assets[0].type};base64,${pickedBase64}`;
                    setPhoto(base64Image);

                    setLoading(true);
                    const updateResult = await updateCurrentUser({ photo: base64Image });
                    setLoading(false);

                    if (updateResult.success) {
                        Alert.alert('Succès', 'Photo de profil mise à jour.');
                    } else {
                        Alert.alert('Erreur', 'Échec de la mise à jour de la photo.');
                    }
                } else {
                    Alert.alert('Erreur', 'Impossible de convertir l\'image.');
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de sélectionner une image.');
        }
    };

    return (
        <View className="flex-1 bg-white pt-4 pb-8">
            {/* Profile photo */}
            <View className="flex gap-2.5 items-center mb-9">
                <TouchableOpacity onPress={pickImage}>
                    {photo ? (
                        <Image source={{ uri: photo }} className="w-[100] h-[100] rounded-full" />
                    ) : (
                        <View className="w-[100] h-[100] rounded-full bg-gray-300 items-center justify-center">
                            <IcoMoonIcon name="profile" size={40} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Greeting or Name */}
                <Text className="text-lg font-semibold">
                    {firstName || lastName ? `${firstName} ${lastName}` : 'Bonjour'}
                </Text>

                {/* Always show Change Photo button */}
                <TouchableOpacity onPress={pickImage} className="btn-small">
                    <Text className="btn-small-text">Modifier ma photo de profil</Text>
                </TouchableOpacity>
            </View>

            {/* Mes coordonnées */}
            <TouchableOpacity
                className="flex-row gap-3 mb-3.5 items-center"
                onPress={() => { if (!editing) setEditing(true); }}
                activeOpacity={editing ? 1 : 0.7}
            >
                <Text className="text-base font-bold">Mes coordonnées</Text>
                {!editing && (
                    <IcoMoonIcon name="pen" size={20} color="#C53334" />
                )}
            </TouchableOpacity>

            {/* Editable fields */}
            <View className="flex gap-2 mb-6">
                <View className="flex gap-1">
                    <Text className="text-sm font-medium">Prénom</Text>
                    <TextInput
                        value={firstName}
                        editable={editing}
                        onChangeText={setFirstName}
                        className="input-base bg-gray-100 text-black"
                        placeholder="Votre prénom"
                        placeholderTextColor="#000"
                    />
                </View>

                <View className="flex gap-1">
                    <Text className="text-sm font-medium">Nom</Text>
                    <TextInput
                        value={lastName}
                        editable={editing}
                        onChangeText={setLastName}
                        className="input-base bg-gray-100 text-black"
                        placeholder="Votre nom"
                        placeholderTextColor="#000"
                    />
                </View>

                <View className="flex gap-1">
                    <Text className="text-sm font-medium">E-mail</Text>
                    <TextInput
                        value={email}
                        editable={false}
                        className="input-base bg-gray-100 text-black"
                        placeholderTextColor="#000"
                    />
                </View>

                <View className="flex gap-1">
                    <Text className="text-sm font-medium">Téléphone</Text>
                    <TextInput
                        value={phone}
                        editable={false}
                        className="input-base bg-gray-100 text-black"
                        placeholderTextColor="#000"
                    />
                </View>
            </View>

            {/* Buttons */}
            <View className="flex-column gap-3.5">
                {editing ? (
                    <>
                        <TouchableOpacity onPress={handleSave} className="btn-primary w-full">
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="btn-primary-text text-center">Enregistrer</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleCancel} className="btn-outline w-full">
                            <Text className="btn-outline-text text-center">Annuler</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity className="btn-primary w-full">
                            <Text className="btn-primary-text text-center">Modifier mon mot de passe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLogout} className="btn-primary w-full">
                            <Text className="btn-primary-text text-center">Déconnexion</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
};

export default Profile;
