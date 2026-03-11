import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { API_BASE } from '../config';

export default function ScanScreen() {
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookupBarcode() {
    if (!barcode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/vista/psb/rpc/psb-validate-order?barcode=${encodeURIComponent(barcode)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Barcode Scanner</Text>
        <Text style={styles.subtitle}>BCMA Medication Administration</Text>
      </View>

      <View style={styles.scanArea}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.cameraText}>Camera barcode scanning</Text>
          <Text style={styles.cameraHint}>Requires expo-camera permission grant</Text>
        </View>
      </View>

      <View style={styles.manualEntry}>
        <Text style={styles.manualLabel}>Manual Barcode Entry</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.barcodeInput}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Enter barcode or order ID..."
            placeholderTextColor="#475569"
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.lookupBtn, loading && { opacity: 0.5 }]}
            onPress={lookupBarcode}
            disabled={loading}
          >
            <Text style={styles.lookupBtnText}>{loading ? '...' : 'Verify'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultStatus, { color: result.ok ? '#22c55e' : '#ef4444' }]}>
              {result.ok ? 'VERIFIED' : 'NOT FOUND'}
            </Text>
          </View>
          {result.rpcUsed && (
            <Text style={styles.rpcUsed}>RPC: {String(result.rpcUsed)}</Text>
          )}
          {result.data && Array.isArray(result.data) && result.data.length > 0 && (
            <Text style={styles.resultData}>{result.data.join('\n')}</Text>
          )}
          {result.error && <Text style={styles.resultError}>{String(result.error)}</Text>}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>BCMA Integration</Text>
        <Text style={styles.infoText}>
          Scans wristband and medication barcodes to verify the Five Rights of medication administration
          (Right Patient, Right Drug, Right Dose, Right Route, Right Time) via PSB VALIDATE ORDER RPC.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 2 },
  scanArea: { marginHorizontal: 16, marginBottom: 16 },
  cameraPlaceholder: { height: 180, backgroundColor: '#1e293b', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed' },
  cameraIcon: { fontSize: 48, marginBottom: 8 },
  cameraText: { color: '#94a3b8', fontSize: 14 },
  cameraHint: { color: '#475569', fontSize: 12, marginTop: 4 },
  manualEntry: { marginHorizontal: 16, marginBottom: 16 },
  manualLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  barcodeInput: { flex: 1, backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'monospace' },
  lookupBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  lookupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  resultHeader: { marginBottom: 8 },
  resultStatus: { fontSize: 16, fontWeight: '700' },
  rpcUsed: { color: '#3b82f6', fontSize: 12, marginBottom: 6 },
  resultData: { color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace' },
  resultError: { color: '#ef4444', fontSize: 13 },
  infoBox: { marginHorizontal: 16, backgroundColor: '#172554', borderRadius: 10, padding: 14 },
  infoTitle: { color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  infoText: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
});
