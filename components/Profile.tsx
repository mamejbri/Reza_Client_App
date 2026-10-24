// src/screens/Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { Alert } from '../src/ui/AppAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { launchImageLibrary } from 'react-native-image-picker';
import AppIcon from '../src/icons/AppIcon';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { logout } from '../services/auth';
import { clearCachedUser } from '../services/user'; // keep if you rely on it elsewhere
import { getClientProfile, updateClientProfile } from '../services/clients';
import { useI18n } from '../src/i18n/LocaleProvider';
import { useResponsive } from '../src/utils/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Profile: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const { scale } = useResponsive();
  const avatarSize = scale(96);
  const avatar = { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 };

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [originalFirstName, setOriginalFirstName] = useState('');
  const [originalLastName, setOriginalLastName] = useState('');

  const hydrate = useCallback(async () => {
    const user = await getClientProfile();
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoto(user.photo || undefined);
      setOriginalFirstName(user.firstName || '');
      setOriginalLastName(user.lastName || '');
    } else {
      // Not logged in or 401
      setEmail(''); setPhone(''); setFirstName(''); setLastName(''); setPhoto(undefined);
    }
  }, []);

  // Load from server when this screen mounts AND when it regains focus
  useEffect(() => {
    hydrate();
    const unsub = navigation.addListener('focus', hydrate);
    return unsub;
  }, [hydrate, navigation]);

  const handleLogout = async () => {
    await logout();
    await clearCachedUser?.();
    // wipe local UI instantly
    setEmail(''); setPhone(''); setFirstName(''); setLastName(''); setPhoto(undefined);
    setEditing(false);
    Alert.alert(t('profile.loggedOutTitle'), t('profile.loggedOut'));
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('profile.namesRequired'));
      return;
    }
    setLoading(true);
    const result = await updateClientProfile({ firstName, lastName, photo });
    setLoading(false);

    if (result.success) {
      Alert.alert(t('common.success'), t('profile.saved'));
      setEditing(false);
      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
    } else {
      Alert.alert(t('common.error'), result.message || t('profile.saveError'));
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
        maxWidth: 512, maxHeight: 512, quality: 0.7,
        includeBase64: true,
      });
      if (result.assets?.length) {
        const asset = result.assets[0];
        if (asset.base64 && asset.type) {
          const base64Image = `data:${asset.type};base64,${asset.base64}`;
          setPhoto(base64Image);
          setLoading(true);
          const updateResult = await updateClientProfile({ photo: base64Image });
          setLoading(false);
          if (updateResult.success) Alert.alert(t('common.success'), t('profile.photoSaved'));
          else Alert.alert(t('common.error'), updateResult.message || t('profile.photoError'));
        } else {
          Alert.alert(t('common.error'), t('profile.photoConvertError'));
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('profile.photoPickError'));
    }
  };

  const field = (label: string, icon: string, value: string, opts: { onChange?: (v: string) => void; placeholder?: string } = {}) => {
    const editable = editing && !!opts.onChange;
    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.field, editable && styles.fieldEditable]}>
          <AppIcon name={icon} size={18} color={editable ? BRAND : MUTED} />
          <TextInput
            value={value}
            editable={editable}
            onChangeText={opts.onChange}
            placeholder={opts.placeholder}
            placeholderTextColor={MUTED}
            style={styles.fieldInput}
          />
          {!opts.onChange && <AppIcon name="lock-closed-outline" size={15} color="#BDB7B0" />}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* IDENTITY */}
      <View style={styles.identity}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.85} accessibilityLabel={t('profile.editPhoto')}>
          <View style={[styles.avatarRing, { borderRadius: avatarSize / 2 + 5 }]}>
            {photo ? (
              <Image source={{ uri: photo }} style={avatar} />
            ) : (
              <View style={[avatar, styles.avatarEmpty]}>
                <AppIcon name="profile" size={40} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <AppIcon name="camera-outline" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>
          {firstName || lastName ? `${firstName} ${lastName}` : t('profile.hello')}
        </Text>
        {!!email && <Text style={styles.email}>{email}</Text>}
      </View>

      {/* CONTACT CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('profile.contact')}</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton} hitSlop={8} accessibilityRole="button">
              <AppIcon name="pen" size={18} color={BRAND} />
            </TouchableOpacity>
          )}
        </View>

        {field(t('profile.firstName'), 'person-outline', firstName, { onChange: setFirstName, placeholder: t('profile.firstNamePlaceholder') })}
        {field(t('profile.lastName'), 'person-outline', lastName, { onChange: setLastName, placeholder: t('profile.lastNamePlaceholder') })}
        {field(t('profile.email'), 'mail-outline', email)}
        {field(t('profile.phone'), 'call-outline', phone)}

        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={[styles.button, styles.buttonGhost]}>
              <Text style={styles.buttonGhostText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={[styles.button, styles.buttonPrimary]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonPrimaryText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ACCOUNT ACTIONS */}
      {!editing && (
        <View style={[styles.card, styles.menu]}>
          <TouchableOpacity onPress={() => setPasswordModalVisible(true)} activeOpacity={0.7} style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <AppIcon name="lock-closed-outline" size={18} color={BRAND} />
            </View>
            <Text style={styles.menuText}>{t('profile.changePassword')}</Text>
            <AppIcon name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={MUTED} />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <AppIcon name="log-out-outline" size={18} color={BRAND} />
            </View>
            <Text style={[styles.menuText, { color: BRAND }]}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ChangePasswordModal visible={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />
    </View>
  );
};

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';
const SURFACE = '#F5F3F0';

const styles = StyleSheet.create({
  container: { paddingTop: 24, paddingBottom: 16, gap: 16 },

  identity: { alignItems: 'center', gap: 4, marginBottom: 8 },
  avatarRing: { padding: 3, borderWidth: 2, borderColor: BRAND, backgroundColor: '#fff' },
  avatarEmpty: { backgroundColor: '#D6D1CB', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    end: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND,
    borderWidth: 3,
    borderColor: '#FAF9F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 12, fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  email: { fontSize: 14, color: MUTED },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: INK },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197,51,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: MUTED },
  field: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: SURFACE,
  },
  fieldEditable: { backgroundColor: '#FFFFFF', borderColor: BRAND },
  fieldInput: { flex: 1, height: '100%', fontSize: 16, color: INK, paddingVertical: 0 },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: BRAND },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonGhost: { borderWidth: 1.5, borderColor: '#E4E0DB' },
  buttonGhostText: { color: INK, fontSize: 16, fontWeight: '600' },

  menu: { paddingVertical: 4, gap: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(197,51,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: INK },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.1)', marginStart: 50 },
});

export default Profile;
