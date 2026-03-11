import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { API_BASE } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface Patient { dfn: string; name: string; }

export default function HomeScreen({ navigation }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/vista/default-patient-list`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setPatients(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search patients..."
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.dfn}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientRow}
              onPress={() => navigation.navigate('Patient', { dfn: item.dfn, name: item.name })}
            >
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientDfn}>DFN: {item.dfn}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No patients found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  search: { margin: 16, padding: 12, borderRadius: 8, backgroundColor: '#1e293b', color: '#e2e8f0', fontSize: 16 },
  patientRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  patientName: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  patientDfn: { color: '#64748b', fontSize: 12, marginTop: 2 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
