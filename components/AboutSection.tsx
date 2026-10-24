import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import AppIcon from '../src/icons/AppIcon';
import { useI18n } from '../src/i18n/LocaleProvider';
import { useResponsive } from '../src/utils/responsive';

type OpeningHoursLike = {
  day?: string | { name?: string } | any;

  // lowercase keys
  heureOuvertureMatin?: any;
  heureFermetureMatin?: any;
  heureOuvertureMidi?: any;
  heureFermetureMidi?: any;

  // Uppercase-first (in case your JSON comes like this)
  HeureOuvertureMatin?: any;
  HeureFermetureMatin?: any;
  HeureOuvertureMidi?: any;
  HeureFermetureMidi?: any;
};

interface Props {
  images: string[];
  description: string;
  /** Hours directly from establishment.openingHours (backend DTO). Optional. */
  openingHours?: OpeningHoursLike[] | null;
}

/* ---------- helpers ---------- */

const toHmStr = (val: any): string | undefined => {
  if (val == null) return undefined;

  if (typeof val === 'string') {
    const hhmm = val.slice(0, 5);
    const [hh, mm] = hhmm.split(':');
    const h = Number(hh), m = Number(mm);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return undefined;
  }

  if (typeof val === 'object') {
    const h = (val.hour ?? val.H ?? val.h) as number | undefined;
    const m = (val.minute ?? val.M ?? val.m) as number | undefined;
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h!).padStart(2, '0')}:${String(m!).padStart(2, '0')}`;
    }
  }

  return undefined;
};

type NormHours = {
  day?: string;
  hmOpen?: string;  // morning open
  hmClose?: string; // morning close
  emOpen?: string;  // evening open (midi)
  emClose?: string; // evening close (midi)
};

const normalizeRow = (row?: OpeningHoursLike | null): NormHours => {
  if (!row) return {};
  // accept both lower- and Uppercase-first keys
  const mo = row.heureOuvertureMatin ?? row.HeureOuvertureMatin;
  const mc = row.heureFermetureMatin ?? row.HeureFermetureMatin;
  const eo = row.heureOuvertureMidi  ?? row.HeureOuvertureMidi;
  const ec = row.heureFermetureMidi  ?? row.HeureFermetureMidi;

  const day =
    typeof row.day === 'string'
      ? row.day
      : row.day?.name ?? String(row.day ?? '');

  return {
    day,
    hmOpen:  toHmStr(mo),
    hmClose: toHmStr(mc),
    emOpen:  toHmStr(eo),
    emClose: toHmStr(ec),
  };
};

const WEEK_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const;

const normalizeAll = (arr?: OpeningHoursLike[] | null): NormHours[] => {
  const rows = Array.isArray(arr) ? arr.map(normalizeRow) : [];
  return rows.sort((a, b) => {
    const ia = WEEK_ORDER.indexOf((a.day ?? '').toUpperCase() as any);
    const ib = WEEK_ORDER.indexOf((b.day ?? '').toUpperCase() as any);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
};

const composeRowRanges = (r: NormHours): string | null => {
  const { hmOpen: mo, hmClose: mc, emOpen: eo, emClose: ec } = r;
  const parts: string[] = [];

  // single continuous range
  if (mo && ec && !mc && !eo) return `${mo}–${ec}`;

  if (mo && mc) parts.push(`${mo}–${mc}`);
  if (eo && ec) parts.push(`${eo}–${ec}`);

  if (parts.length === 0) {
    const start = mo || eo;
    const end   = ec || mc;
    if (start && end) return `${start}–${end}`;
    return null;
  }
  return parts.join(', ');
};

const DAY_LABEL = (t: (key: string) => string, d?: string) => {
  const up = (d ?? '').toUpperCase();
  return (WEEK_ORDER as readonly string[]).includes(up) ? t(`days.${up}`) : d ?? '';
};

/* ---------------- component ---------------- */

const AboutSection: React.FC<Props> = ({ images, description, openingHours }) => {
  const hours = useMemo(() => normalizeAll(openingHours), [openingHours]);
  const { t } = useI18n();
  const { contentWidth } = useResponsive();
  // one photo ≈ the content width (minus page padding) so the next one peeks in
  const photoWidth = Math.round(contentWidth * 0.8);
  // getDay(): 0 = Sunday … 6 = Saturday; WEEK_ORDER starts on Monday
  const today = WEEK_ORDER[(new Date().getDay() + 6) % 7];

  return (
    <View style={{ paddingBottom: 16 }}>
      {/* Gallery */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={photoWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 12 }}
          style={{ marginBottom: 20 }}
        >
          {images.map((img) => (
            <Image
              key={img}
              source={{ uri: img }}
              style={[styles.photo, { width: photoWidth, height: Math.round(photoWidth * 0.62) }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('about.title')}</Text>
        {description?.length > 0 ? (
          <Text style={styles.description}>{description}</Text>
        ) : (
          <Text style={styles.muted}>{t('about.noDescription')}</Text>
        )}
      </View>

      {/* Opening hours */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <AppIcon name="time" size={18} color={BRAND} />
          </View>
          <Text style={styles.cardTitle}>{t('about.hours')}</Text>
        </View>

        {hours.length > 0 ? (
          <View>
            {hours.map((row, idx) => {
              const label = composeRowRanges(row);
              const isToday = (row.day ?? '').toUpperCase() === today;
              return (
                <View
                  key={`oh-${idx}`}
                  style={[styles.hourRow, idx > 0 && styles.hourRowBorder, isToday && styles.hourRowToday]}
                >
                  <Text style={[styles.day, isToday && styles.today]}>{DAY_LABEL(t, row.day)}</Text>
                  <Text style={[styles.hours, !label && styles.closed, isToday && styles.today]}>
                    {label ?? t('about.closed')}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.muted}>{t('about.noHours')}</Text>
        )}
      </View>
    </View>
  );
};

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';

const styles = StyleSheet.create({
  photo: { borderRadius: 18, backgroundColor: '#ECE9E5' },
  card: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(197,51,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: INK },
  description: { fontSize: 15, lineHeight: 23, color: '#3A3530' },
  muted: { fontSize: 14, color: MUTED },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8 },
  hourRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
  hourRowToday: { backgroundColor: 'rgba(197,51,52,0.07)', borderRadius: 10, borderTopColor: 'transparent' },
  day: { fontSize: 15, color: INK, fontWeight: '500' },
  hours: { fontSize: 15, color: INK, fontWeight: '600' },
  closed: { color: MUTED, fontWeight: '500' },
  today: { color: BRAND, fontWeight: '800' },
});

export default AboutSection;
