// components/ReviewSection.tsx
import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import AppIcon from '../src/icons/AppIcon';
import { translate, useI18n } from '../src/i18n/LocaleProvider';

/** Raw review shape from API (flexible on client fields) */
type RawReview = {
  id: number;
  rating: number;
  contenu?: string | null;
  createdDate?: string | null;

  // any of these may exist depending on your backend mapping:
  clientName?: string | null;
  clientLastName?: string | null;
  clientFirstName?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  prenom?: string | null;
  nom?: string | null;

  clientEmail?: string | null;
  clientAvatarUrl?: string | null;

  client?: {
    firstName?: string | null;
    lastName?: string | null;
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
  } | null;
};

type Props = {
  loading?: boolean;
  average?: number;
  count?: number;
  reviews?: RawReview[];
};

/** Normalize names/avatars from many possible backend field names */
const getClientMeta = (r: RawReview) => {
  const first =
    r.clientFirstName ??
    r.firstName ??
    r.prenom ??
    r.client?.firstName ??
    r.client?.prenom ??
    r.clientName ??
    null;

  const last =
    r.clientLastName ??
    r.lastName ??
    r.nom ??
    r.client?.lastName ??
    r.client?.nom ??
    null;

  const email = r.clientEmail ?? r.client?.email ?? null;

  const avatar =
    r.clientAvatarUrl ??
    r.client?.avatarUrl ??
    r.client?.photoUrl ??
    null;

  const displayName =
    [first, last].filter(Boolean).join(' ').trim() ||
    first ||
    last ||
    (email ?? translate('reviews.user'));

  const initials = (first?.[0] ?? '') + (last?.[0] ?? '');
  return { displayName, initials: initials.toUpperCase() || 'U', avatar };
};

const StarRow = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map((i) => (
      <AppIcon
        key={i}
        name={i <= Math.round(rating ?? 0) ? 'star' : 'star-outline'}
        size={size}
        color={i <= Math.round(rating ?? 0) ? BRAND : '#D6D1CB'}
      />
    ))}
  </View>
);

const ReviewCard: React.FC<{ r: RawReview }> = ({ r }) => {
  const { displayName, initials, avatar } = getClientMeta(r);
  const text = (r.contenu ?? '').trim();
  const date = r.createdDate && dayjs(r.createdDate).isValid() ? dayjs(r.createdDate).format('D MMM YYYY') : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarInitials]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <View style={styles.metaRow}>
            <StarRow rating={r.rating ?? 0} />
            {!!date && <Text style={styles.date}>{date}</Text>}
          </View>
        </View>
      </View>

      {!!text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const ReviewSection: React.FC<Props> = ({ loading, average, count, reviews }) => {
  const { t } = useI18n();
  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    );
  }

  const items = Array.isArray(reviews) ? reviews : [];
  const hasSummary = typeof average === 'number' && typeof count === 'number' && count > 0;

  return (
    <View>
      {/* Summary */}
      {hasSummary && (
        <View style={styles.summary}>
          <Text style={styles.summaryScore}>{average!.toFixed(1)}</Text>
          <View style={{ gap: 4 }}>
            <StarRow rating={average!} size={18} />
            <Text style={styles.summaryCount}>{t('common.reviews', { count: count! })}</Text>
          </View>
        </View>
      )}

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <AppIcon name="chatbubble-ellipses-outline" size={26} color={MUTED} />
          <Text style={styles.emptyText}>{t('reviews.none')}</Text>
        </View>
      ) : (
        <View>{items.map((r) => <ReviewCard key={r.id} r={r} />)}</View>
      )}
    </View>
  );
};

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryScore: { fontSize: 44, lineHeight: 50, fontWeight: '800', color: INK, letterSpacing: -1 },
  summaryCount: { fontSize: 14, color: MUTED, fontWeight: '500' },

  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarInitials: { backgroundColor: 'rgba(197,51,52,0.12)', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 14, fontWeight: '800', color: BRAND },
  name: { fontSize: 15, fontWeight: '700', color: INK },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  date: { fontSize: 12, color: MUTED },
  text: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#3A3530' },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, borderRadius: 18, backgroundColor: '#F5F3F0' },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
});

export default ReviewSection;
