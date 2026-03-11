import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { API_BASE } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'Patient'>;

const CLINICAL_SECTIONS = [
  { id: 'allergies', label: 'Allergies', endpoint: '/vista/allergies', color: '#ef4444' },
  { id: 'vitals', label: 'Vitals', endpoint: '/vista/vitals', color: '#22c55e' },
  { id: 'problems', label: 'Problems', endpoint: '/vista/problems', color: '#f59e0b' },
  { id: 'notes', label: 'Notes', endpoint: '/vista/notes', color: '#3b82f6' },
  { id: 'labs', label: 'Labs', endpoint: '/vista/labs', color: '#8b5cf6' },
  { id: 'meds', label: 'Medications', endpoint: '/vista/meds/coversheet', color: '#06b6d4' },
];

export default function PatientScreen({ route, navigation }: Props) {
  const { dfn } = route.params;
  const [sections, setSections] = useState<Record<string, { loading: boolean; count: number; data: unknown[] }>>({});

  useEffect(() => {
    CLINICAL_SECTIONS.forEach(s => {
      setSections(prev => ({ ...prev, [s.id]: { loading: true, count: 0, data: [] } }));
      fetch(`${API_BASE}${s.endpoint}?dfn=${dfn}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          const results = d.results || d.data || [];
          setSections(prev => ({ ...prev, [s.id]: { loading: false, count: d.count ?? results.length, data: results } }));
        })
        .catch(() => setSections(prev => ({ ...prev, [s.id]: { loading: false, count: 0, data: [] } })));
    });
  }, [dfn]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dfnLabel}>DFN: {dfn}</Text>
      </View>

      {CLINICAL_SECTIONS.map(s => (
        <TouchableOpacity
          key={s.id}
          style={styles.sectionCard}
          onPress={() => navigation.navigate('Module', { moduleId: s.id, moduleName: s.label, dfn })}
        >
          <View style={[styles.colorBar, { backgroundColor: s.color }]} />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>{s.label}</Text>
            {sections[s.id]?.loading ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <Text style={styles.sectionCount}>{sections[s.id]?.count ?? 0}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.moduleLink}>View all 157 VistA modules...</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  dfnLabel: { color: '#64748b', fontSize: 12 },
  sectionCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, borderRadius: 8, backgroundColor: '#1e293b', overflow: 'hidden' },
  colorBar: { width: 4 },
  sectionContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionLabel: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  sectionCount: { color: '#94a3b8', fontSize: 20, fontWeight: '700' },
  moduleLink: { color: '#3b82f6', textAlign: 'center', marginTop: 24, marginBottom: 40, fontSize: 14 },
});
