import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { API_BASE } from '../config';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  status: string;
  raw?: string;
}

export default function MedsScreen() {
  const [dfn, setDfn] = useState('46');
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeds();
  }, [dfn]);

  async function loadMeds() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/vista/meds/coversheet?dfn=${dfn}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.results) {
        setMeds(data.results.map((r: Record<string, string>) => ({
          name: r.name || r.drug || 'Unknown',
          dosage: r.dosage || r.dose || '',
          frequency: r.frequency || r.schedule || '',
          status: r.status || 'Active',
          raw: typeof r === 'string' ? r : undefined,
        })));
      } else if (data.ok && data.data) {
        setMeds(data.data.map((line: string) => parseMedLine(line)));
      } else {
        setMeds([]);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medications</Text>
        <View style={styles.dfnRow}>
          <Text style={styles.dfnLabel}>DFN:</Text>
          <TextInput style={styles.dfnInput} value={dfn} onChangeText={setDfn} keyboardType="numeric" />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={meds}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.medCard}>
              <View style={[styles.statusDot, { backgroundColor: item.status === 'Active' ? '#22c55e' : '#94a3b8' }]} />
              <View style={styles.medContent}>
                <Text style={styles.medName}>{item.name}</Text>
                {item.dosage ? <Text style={styles.medDetail}>{item.dosage}</Text> : null}
                {item.frequency ? <Text style={styles.medDetail}>{item.frequency}</Text> : null}
                {item.raw ? <Text style={styles.medRaw}>{item.raw}</Text> : null}
              </View>
              <Text style={styles.statusLabel}>{item.status}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No medications found for DFN {dfn}</Text>}
        />
      )}
    </View>
  );
}

function parseMedLine(line: string): Medication {
  const parts = line.split('^');
  return {
    name: parts[0] || line,
    dosage: parts[1] || '',
    frequency: parts[2] || '',
    status: parts[3] || 'Active',
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  dfnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dfnLabel: { color: '#94a3b8', fontSize: 14 },
  dfnInput: { backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, width: 80, textAlign: 'center' },
  medCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 10, padding: 14, alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  medContent: { flex: 1 },
  medName: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  medDetail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  medRaw: { color: '#64748b', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  statusLabel: { color: '#64748b', fontSize: 12 },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
