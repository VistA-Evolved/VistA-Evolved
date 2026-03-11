import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { API_BASE } from '../config';

interface Appointment {
  date: string;
  time: string;
  clinic: string;
  provider: string;
  status: string;
  raw?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleScreen() {
  const [dfn, setDfn] = useState('46');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { loadAppointments(); }, [dfn]);

  async function loadAppointments() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/scheduling/appointments?dfn=${dfn}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.results) {
        setAppointments(data.results.map((r: Record<string, string>) => ({
          date: r.date || r.appointmentDate || '',
          time: r.time || r.appointmentTime || '',
          clinic: r.clinic || r.location || '',
          provider: r.provider || '',
          status: r.status || 'Scheduled',
        })));
      } else if (data.ok && data.data) {
        setAppointments(data.data.map((line: string) => parseApptLine(line)));
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  }

  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <View style={styles.dfnRow}>
          <Text style={styles.dfnLabel}>DFN:</Text>
          <TextInput style={styles.dfnInput} value={dfn} onChangeText={setDfn} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.calendar}>
        {weekDates.map(d => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today.toISOString().slice(0, 10);
          const isSelected = iso === selectedDate;
          return (
            <TouchableOpacity
              key={iso}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(iso)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{DAYS[d.getDay()]}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayNumSelected]}>{d.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.apptCard}>
              <View style={styles.apptTime}>
                <Text style={styles.apptTimeText}>{item.time || '--:--'}</Text>
                <Text style={styles.apptDateText}>{item.date}</Text>
              </View>
              <View style={styles.apptContent}>
                <Text style={styles.apptClinic}>{item.clinic || 'Clinic not specified'}</Text>
                {item.provider ? <Text style={styles.apptProvider}>{item.provider}</Text> : null}
                <Text style={[styles.apptStatus, { color: item.status === 'Scheduled' ? '#22c55e' : '#f59e0b' }]}>{item.status}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.empty}>No appointments found</Text>
              <Text style={styles.emptyHint}>Appointments from VistA Scheduling will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function parseApptLine(line: string): Appointment {
  const parts = line.split('^');
  return { date: parts[0] || '', time: parts[1] || '', clinic: parts[2] || '', provider: parts[3] || '', status: parts[4] || 'Scheduled' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  dfnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dfnLabel: { color: '#94a3b8', fontSize: 14 },
  dfnInput: { backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, width: 80, textAlign: 'center' },
  calendar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#1e293b' },
  dayCellSelected: { backgroundColor: '#2563eb' },
  dayLabel: { color: '#64748b', fontSize: 11, marginBottom: 4 },
  dayLabelSelected: { color: '#bfdbfe' },
  dayNum: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  dayNumToday: { color: '#3b82f6' },
  dayNumSelected: { color: '#fff' },
  apptCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 10, overflow: 'hidden' },
  apptTime: { backgroundColor: '#334155', padding: 12, alignItems: 'center', justifyContent: 'center', width: 72 },
  apptTimeText: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  apptDateText: { color: '#64748b', fontSize: 10, marginTop: 2 },
  apptContent: { flex: 1, padding: 12 },
  apptClinic: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  apptProvider: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  apptStatus: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: '#94a3b8', fontSize: 16 },
  emptyHint: { color: '#475569', fontSize: 13, marginTop: 4 },
});
