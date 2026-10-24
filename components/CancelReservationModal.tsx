import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../src/i18n/LocaleProvider';
import AppIcon from '../src/icons/AppIcon';

const BRAND = '#C53334';

type Props = {
    isVisible: boolean;
    onKeep: () => void;
    onCancel: () => void;
};

const CancelReservationModal = ({ isVisible, onKeep, onCancel }: Props) => {
    const { t } = useI18n();
    return (
        <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onKeep}>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onKeep} />
                <View style={styles.card}>
                    <View style={styles.badge}>
                        <AppIcon name="calendar-clear-outline" size={28} color={BRAND} />
                    </View>

                    <Text style={styles.title}>{t('cancelModal.title')}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.button, styles.keep]} onPress={onKeep} activeOpacity={0.85}>
                            <Text style={styles.keepText}>{t('cancelModal.keep')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel} activeOpacity={0.7}>
                            <Text style={styles.cancelText}>{t('cancelModal.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(12,8,6,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingTop: 26,
        paddingHorizontal: 22,
        paddingBottom: 18,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
    },
    badge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(197,51,52,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: '#16120F', textAlign: 'center' },
    actions: { alignSelf: 'stretch', marginTop: 22, gap: 8 },
    button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    keep: { backgroundColor: BRAND },
    keepText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    cancel: { backgroundColor: '#F5F3F0' },
    cancelText: { fontSize: 16, fontWeight: '700', color: BRAND },
});

export default CancelReservationModal;
