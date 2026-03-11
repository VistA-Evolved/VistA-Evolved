import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { API_BASE } from '../config';

interface ServerStatus {
  ok: boolean;
  vista?: string;
  serverVersion?: string;
}

export default function MoreScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/vista/ping`)
      .then(r => r.json())
      .then(setServerStatus)
      .catch(() => setServerStatus({ ok: false }));
  }, []);

  const menuItems = [
    { label: 'Server Connection', value: serverStatus ? (serverStatus.ok ? 'Connected' : 'Disconnected') : 'Checking...', color: serverStatus?.ok ? '#22c55e' : '#ef4444' },
    { label: 'VistA Status', value: serverStatus?.vista || 'Unknown', color: '#94a3b8' },
    { label: 'API Endpoint', value: API_BASE, color: '#64748b' },
    { label: 'App Version', value: '1.0.0', color: '#64748b' },
    { label: 'Total Modules', value: '157', color: '#3b82f6' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONNECTION</Text>
        {menuItems.map((item, i) => (
          <View key={i} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={[styles.menuValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.menuItem}>
          <Text style={styles.menuLabel}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#2563eb' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>VistA-Evolved Mobile</Text>
          <Text style={styles.aboutText}>
            Complete mobile client for the VistA-Evolved healthcare platform.
            Provides clinical access to 157 VistA modules via RPC Broker.
          </Text>
          <Text style={styles.aboutText}>
            Built from VA Roll & Scroll documentation, FileMan data dictionary,
            and RPC catalog (File #8994, 4,517 RPCs).
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  menuLabel: { color: '#e2e8f0', fontSize: 15 },
  menuValue: { fontSize: 14 },
  aboutBox: { marginHorizontal: 16, backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  aboutTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  aboutText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  logoutBtn: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#dc2626', borderRadius: 10, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
