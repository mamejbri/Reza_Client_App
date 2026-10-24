import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../src/ui/AppAlert';
import { updatePassword } from '../services/auth';
import { useI18n } from '../src/i18n/LocaleProvider';
import AppIcon from '../src/icons/AppIcon';
import { AuthInput, AuthButton, BRAND } from '../src/ui/AuthKit';

type ChangePasswordModalProps = {
    visible: boolean;
    onClose: () => void;
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useI18n();
    const insets = useSafeAreaInsets();

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert(t('common.error'), t('common.fillAllFields'));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert(t('common.error'), t('common.passwordMismatch'));
            return;
        }

        setLoading(true);
        const result = await updatePassword(currentPassword, newPassword);
        setLoading(false);

        if (result.success) {
            Alert.alert(t('common.success'), t('password.saved'));
            onClose();
        } else {
            Alert.alert(t('common.error'), result.error || t('password.error'));
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <AppIcon name="lock-closed-outline" size={20} color={BRAND} />
                        </View>
                        <Text style={styles.title}>{t('profile.changePassword')}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
                            <AppIcon name="close" size={24} color="#16120F" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.fields}>
                        <AuthInput
                            icon="key-outline"
                            placeholder={t('password.current')}
                            secure
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            autoComplete="current-password"
                            textContentType="password"
                        />
                        <AuthInput
                            icon="lock-closed-outline"
                            placeholder={t('password.new')}
                            secure
                            value={newPassword}
                            onChangeText={setNewPassword}
                            autoComplete="new-password"
                            textContentType="newPassword"
                        />
                        <AuthInput
                            icon="shield-checkmark-outline"
                            placeholder={t('password.confirm')}
                            secure
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            autoComplete="new-password"
                            textContentType="newPassword"
                        />
                    </View>

                    <AuthButton label={t('common.save')} onPress={handleSubmit} loading={loading} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(12,8,6,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#DDD8D2', marginBottom: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(197,51,52,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { flex: 1, fontSize: 19, fontWeight: '800', color: '#16120F' },
    fields: { gap: 12, marginBottom: 20 },
});

export default ChangePasswordModal;
