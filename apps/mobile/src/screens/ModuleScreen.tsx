import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { API_BASE } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'Module'>;

const ENDPOINT_MAP: Record<string, string> = {
  allergies: '/vista/allergies',
  vitals: '/vista/vitals',
  problems: '/vista/problems',
  notes: '/vista/notes',
  labs: '/vista/labs',
  meds: '/vista/meds/coversheet',
};

export default function ModuleScreen({ route }: Props) {
  const { moduleId, dfn } = route.params;
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpc, setRpc] = useState('');

  useEffect(() => {
    const endpoint = ENDPOINT_MAP[moduleId] || `/vista/${moduleId}/summary`;
    fetch(`${API_BASE}${endpoint}${dfn ? `?dfn=${dfn}` : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d.results || d.data || []); setRpc(d.rpcUsed || ''); setLoading(false); })
      .catch(() => setLoading(false));
  }, [moduleId, dfn]);

  if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

  return (
    <ScrollView style={styles.container}>
      {rpc ? <Text style={styles.rpcBadge}>RPC: {Array.isArray(rpc) ? rpc.join(', ') : rpc}</Text> : null}

      {data.length === 0 ? (
        <Text style={styles.empty}>No records found</Text>
      ) : (
        data.map((item, i) => (
          <View key={i} style={styles.card}>
            {Object.entries(item as Record<string, unknown>).slice(0, 6).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.label}>{k}</Text>
                <Text style={styles.value}>{String(v ?? '')}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  rpcBadge: { color: '#3b82f6', fontSize: 11, backgroundColor: '#1e293b', padding: 6, borderRadius: 4, marginBottom: 12, textAlign: 'center' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { color: '#64748b', fontSize: 12, flex: 1 },
  value: { color: '#e2e8f0', fontSize: 14, flex: 2, textAlign: 'right' },
});
