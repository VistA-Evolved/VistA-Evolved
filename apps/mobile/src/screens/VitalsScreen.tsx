import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { API_BASE } from '../config';

interface VitalEntry {
  label: string;
  key: string;
  unit: string;
  placeholder: string;
  keyboardType: 'numeric' | 'default';
}

const VITAL_FIELDS: VitalEntry[] = [
  { label: 'Blood Pressure (Systolic)', key: 'bpSystolic', unit: 'mmHg', placeholder: '120', keyboardType: 'numeric' },
  { label: 'Blood Pressure (Diastolic)', key: 'bpDiastolic', unit: 'mmHg', placeholder: '80', keyboardType: 'numeric' },
  { label: 'Heart Rate', key: 'heartRate', unit: 'bpm', placeholder: '72', keyboardType: 'numeric' },
  { label: 'Temperature', key: 'temperature', unit: '°F', placeholder: '98.6', keyboardType: 'numeric' },
  { label: 'Respiratory Rate', key: 'respRate', unit: '/min', placeholder: '16', keyboardType: 'numeric' },
  { label: 'SpO2', key: 'spo2', unit: '%', placeholder: '98', keyboardType: 'numeric' },
  { label: 'Weight', key: 'weight', unit: 'lbs', placeholder: '180', keyboardType: 'numeric' },
  { label: 'Height', key: 'height', unit: 'in', placeholder: '70', keyboardType: 'numeric' },
  { label: 'Pain Level', key: 'pain', unit: '0-10', placeholder: '0', keyboardType: 'numeric' },
];

export default function VitalsScreen() {
  const [dfn, setDfn] = useState('46');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const updateValue = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const saveVitals = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/vista/vitals/record`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dfn, vitals: values }),
      });
      const data = await res.json();
      if (data.ok) {
        Alert.alert('Saved', 'Vitals recorded successfully');
        setValues({});
      } else {
        Alert.alert('Error', data.error || 'Failed to save vitals');
      }
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    }
    setSaving(false);
  }, [dfn, values]);

  const filledCount = Object.values(values).filter(v => v.trim()).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Record Vitals</Text>
        <View style={styles.dfnRow}>
          <Text style={styles.dfnLabel}>Patient DFN:</Text>
          <TextInput style={styles.dfnInput} value={dfn} onChangeText={setDfn} keyboardType="numeric" />
        </View>
      </View>

      {VITAL_FIELDS.map(field => (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.fieldInput}
              value={values[field.key] || ''}
              onChangeText={v => updateValue(field.key, v)}
              placeholder={field.placeholder}
              placeholderTextColor="#475569"
              keyboardType={field.keyboardType}
            />
            <Text style={styles.unit}>{field.unit}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={saveVitals}
        disabled={saving || filledCount === 0}
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Saving...' : `Save Vitals (${filledCount}/${VITAL_FIELDS.length})`}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  dfnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dfnLabel: { color: '#94a3b8', fontSize: 14 },
  dfnInput: { backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, width: 80, textAlign: 'center' },
  fieldRow: { marginHorizontal: 16, marginBottom: 12 },
  fieldLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: { flex: 1, backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 18, fontWeight: '600' },
  unit: { color: '#64748b', fontSize: 14, marginLeft: 8, width: 44 },
  saveBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
