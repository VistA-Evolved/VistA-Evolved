"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Patient {
  dfn: string;
  name: string;
}

interface SearchResult {
  ok: boolean;
  count: number;
  results: Patient[];
  rpcUsed: string;
  error?: string;
}

interface PatientDemographics {
  dfn: string;
  name: string;
  dob: string;
  sex: string;
}

interface DemographicsResult {
  ok: boolean;
  patient?: PatientDemographics;
  rpcUsed?: string;
  error?: string;
}

interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reactions: string;
}

interface AllergiesResult {
  ok: boolean;
  count?: number;
  results?: Allergy[];
  rpcUsed?: string;
  error?: string;
}

interface Vital {
  type: string;
  value: string;
  takenAt: string;
}

interface VitalsResult {
  ok: boolean;
  count?: number;
  results?: Vital[];
  rpcUsed?: string;
  error?: string;
}

interface Note {
  id: string;
  title: string;
  date: string;
  author: string;
  location: string;
  status: string;
}

interface NotesResult {
  ok: boolean;
  count?: number;
  results?: Note[];
  rpcUsed?: string;
  error?: string;
}

interface Medication {
  id: string;
  name: string;
  sig: string;
  status: string;
}

interface MedicationsResult {
  ok: boolean;
  count?: number;
  results?: Medication[];
  rpcUsed?: string;
  error?: string;
}

const API_BASE = "http://127.0.0.1:3001";
const DEBOUNCE_MS = 400;

export default function PatientSearchPage() {
  const [query, setQuery] = useState("SMI");
  const [debouncedQuery, setDebouncedQuery] = useState("SMI");
  const [results, setResults] = useState<Patient[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [demographics, setDemographics] = useState<PatientDemographics | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [allergyLoading, setAllergyLoading] = useState(false);
  const [allergyError, setAllergyError] = useState<string | null>(null);
  const [newAllergen, setNewAllergen] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [newVitalType, setNewVitalType] = useState("BP");
  const [newVitalValue, setNewVitalValue] = useState("");
  const [addVitalLoading, setAddVitalLoading] = useState(false);
  const [addVitalError, setAddVitalError] = useState<string | null>(null);
  const [addVitalSuccess, setAddVitalSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [addNoteLoading, setAddNoteLoading] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  const [addNoteSuccess, setAddNoteSuccess] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [medsError, setMedsError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query input
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Fetch results when debounced query changes
  const fetchPatients = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setCount(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/vista/patient-search?q=${encodeURIComponent(trimmed)}`
      );
      const data: SearchResult = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || `Server error (${res.status})`);
        setResults([]);
        setCount(null);
      } else {
        setResults(data.results);
        setCount(data.count);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
      setResults([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(debouncedQuery);
  }, [debouncedQuery, fetchPatients]);

  // Fetch allergies for a given patient DFN
  const fetchAllergies = useCallback(async (dfn: string) => {
    setAllergyLoading(true);
    setAllergyError(null);
    try {
      const allergyRes = await fetch(
        `${API_BASE}/vista/allergies?dfn=${encodeURIComponent(dfn)}`
      );
      const allergyData: AllergiesResult = await allergyRes.json();

      if (!allergyRes.ok || !allergyData.ok) {
        setAllergyError(allergyData.error || `Server error (${allergyRes.status})`);
      } else {
        setAllergies(allergyData.results || []);
      }
    } catch (err) {
      setAllergyError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setAllergyLoading(false);
    }
  }, []);

  // Fetch vitals for a given patient DFN
  const fetchVitals = useCallback(async (dfn: string) => {
    setVitalsLoading(true);
    setVitalsError(null);
    try {
      const res = await fetch(
        `${API_BASE}/vista/vitals?dfn=${encodeURIComponent(dfn)}`
      );
      const data: VitalsResult = await res.json();

      if (!res.ok || !data.ok) {
        setVitalsError(data.error || `Server error (${res.status})`);
      } else {
        setVitals(data.results || []);
      }
    } catch (err) {
      setVitalsError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setVitalsLoading(false);
    }
  }, []);

  // Fetch notes for a given patient DFN
  const fetchNotes = useCallback(async (dfn: string) => {
    setNotesLoading(true);
    setNotesError(null);
    try {
      const res = await fetch(
        `${API_BASE}/vista/notes?dfn=${encodeURIComponent(dfn)}`
      );
      const data: NotesResult = await res.json();

      if (!res.ok || !data.ok) {
        setNotesError(data.error || `Server error (${res.status})`);
      } else {
        setNotes(data.results || []);
      }
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setNotesLoading(false);
    }
  }, []);

  // Fetch medications for a given patient DFN
  const fetchMedications = useCallback(async (dfn: string) => {
    setMedsLoading(true);
    setMedsError(null);
    try {
      const res = await fetch(
        `${API_BASE}/vista/medications?dfn=${encodeURIComponent(dfn)}`
      );
      const data: MedicationsResult = await res.json();

      if (!res.ok || !data.ok) {
        setMedsError(data.error || `Server error (${res.status})`);
      } else {
        setMedications(data.results || []);
      }
    } catch (err) {
      setMedsError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setMedsLoading(false);
    }
  }, []);

  // Fetch demographics when a patient is selected
  const selectPatient = useCallback(async (pt: Patient) => {
    setSelected(pt);
    setDemographics(null);
    setDemoError(null);
    setDemoLoading(true);
    setAllergies([]);
    setAllergyError(null);
    setNewAllergen("");
    setAddError(null);
    setAddSuccess(null);
    setVitals([]);
    setVitalsError(null);
    setNewVitalValue("");
    setAddVitalError(null);
    setAddVitalSuccess(null);
    setNotes([]);
    setNotesError(null);
    setNewNoteTitle("");
    setNewNoteText("");
    setAddNoteError(null);
    setAddNoteSuccess(null);
    setMedications([]);
    setMedsError(null);

    try {
      const res = await fetch(
        `${API_BASE}/vista/patient-demographics?dfn=${encodeURIComponent(pt.dfn)}`
      );
      const data: DemographicsResult = await res.json();

      if (!res.ok || !data.ok) {
        setDemoError(data.error || `Server error (${res.status})`);
      } else if (data.patient) {
        setDemographics(data.patient);
      }
    } catch (err) {
      setDemoError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setDemoLoading(false);
    }

    // Fetch allergies, vitals, notes, and medications in parallel
    await Promise.all([
      fetchAllergies(pt.dfn),
      fetchVitals(pt.dfn),
      fetchNotes(pt.dfn),
      fetchMedications(pt.dfn),
    ]);
  }, [fetchAllergies, fetchVitals, fetchNotes, fetchMedications]);

  // Add a new allergy for the selected patient
  const addAllergy = useCallback(async () => {
    if (!selected || newAllergen.trim().length < 2) return;
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/vista/allergies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dfn: selected.dfn, allergyText: newAllergen.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setAddError(data.error || `Server error (${res.status})`);
      } else {
        setAddSuccess(`Added ${data.allergen}`);
        setNewAllergen("");
        // Refresh allergies list
        await fetchAllergies(selected.dfn);
      }
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setAddLoading(false);
    }
  }, [selected, newAllergen, fetchAllergies]);

  // Add a vital for the selected patient
  const VITAL_TYPES = ["BP", "T", "P", "R", "HT", "WT", "PO2", "PN"];
  const addVital = useCallback(async () => {
    if (!selected || newVitalValue.trim().length < 1) return;
    setAddVitalLoading(true);
    setAddVitalError(null);
    setAddVitalSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/vista/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dfn: selected.dfn, type: newVitalType, value: newVitalValue.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setAddVitalError(data.error || `Server error (${res.status})`);
      } else {
        setAddVitalSuccess(`Recorded ${data.type} ${data.value}`);
        setNewVitalValue("");
        // Refresh vitals list
        await fetchVitals(selected.dfn);
      }
    } catch (err) {
      setAddVitalError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setAddVitalLoading(false);
    }
  }, [selected, newVitalType, newVitalValue, fetchVitals]);

  // Add a new note for the selected patient
  const addNote = useCallback(async () => {
    if (!selected || newNoteTitle.trim().length < 1 || newNoteText.trim().length < 1) return;
    setAddNoteLoading(true);
    setAddNoteError(null);
    setAddNoteSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/vista/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dfn: selected.dfn, title: newNoteTitle.trim(), text: newNoteText.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setAddNoteError(data.error || `Server error (${res.status})`);
      } else {
        setAddNoteSuccess(`Note created (ID: ${data.id})`);
        setNewNoteTitle("");
        setNewNoteText("");
        // Refresh notes list
        await fetchNotes(selected.dfn);
      }
    } catch (err) {
      setAddNoteError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
    } finally {
      setAddNoteLoading(false);
    }
  }, [selected, newNoteTitle, newNoteText, fetchNotes]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Home
        </Link>

        <h1 className={styles.title}>Patient Search</h1>
        <p className={styles.subtitle}>
          Search VistA patients by last name (via ORWPT LIST ALL)
        </p>

        <div className={styles.searchBox}>
          <label htmlFor="patient-query" className={styles.label}>
            Search patients
          </label>
          <input
            id="patient-query"
            className={styles.input}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a last name prefix…"
            autoFocus
          />
        </div>

        {selected && (
          <div className={styles.patientHeader}>
            <h2 className={styles.patientHeaderTitle}>Patient Header</h2>
            {demoLoading && (
              <p className={styles.loading}>Loading demographics…</p>
            )}
            {demoError && (
              <div className={styles.error}>{demoError}</div>
            )}
            {demographics && (
              <div className={styles.patientGrid}>
                <div className={styles.patientField}>
                  <span className={styles.patientFieldLabel}>Name</span>
                  <span className={styles.patientFieldValue}>{demographics.name}</span>
                </div>
                <div className={styles.patientField}>
                  <span className={styles.patientFieldLabel}>DFN</span>
                  <span className={styles.patientFieldValue}>{demographics.dfn}</span>
                </div>
                <div className={styles.patientField}>
                  <span className={styles.patientFieldLabel}>DOB</span>
                  <span className={styles.patientFieldValue}>{demographics.dob}</span>
                </div>
                <div className={styles.patientField}>
                  <span className={styles.patientFieldLabel}>Sex</span>
                  <span className={styles.patientFieldValue}>{demographics.sex}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className={styles.allergiesSection}>
            <h2 className={styles.allergiesSectionTitle}>Allergies</h2>
            {allergyLoading && (
              <p className={styles.loading}>Loading allergies…</p>
            )}
            {allergyError && (
              <div className={styles.error}>{allergyError}</div>
            )}
            {!allergyLoading && !allergyError && allergies.length === 0 && (
              <p className={styles.empty}>No known allergies.</p>
            )}
            {!allergyLoading && !allergyError && allergies.length > 0 && (
              <ul className={styles.allergyList}>
                {allergies.map((a) => (
                  <li key={a.id} className={styles.allergyItem}>
                    <div className={styles.allergyName}>{a.allergen}</div>
                    <div className={styles.allergyMeta}>
                      {a.severity && (
                        <span className={styles.allergySeverity}>{a.severity}</span>
                      )}
                      {a.reactions && (
                        <span className={styles.allergyReactions}>{a.reactions.replace(/;/g, ", ")}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Phase 5D: Add Allergy form */}
            <div className={styles.addAllergyForm}>
              <h3 className={styles.addAllergyTitle}>Add Allergy</h3>
              <div className={styles.addAllergyRow}>
                <input
                  className={styles.allergyInput}
                  type="text"
                  value={newAllergen}
                  onChange={(e) => {
                    setNewAllergen(e.target.value);
                    setAddError(null);
                    setAddSuccess(null);
                  }}
                  placeholder="Allergen name (e.g., PENICILLIN)"
                  disabled={addLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addAllergy();
                  }}
                />
                <button
                  className={styles.addAllergyBtn}
                  onClick={addAllergy}
                  disabled={addLoading || newAllergen.trim().length < 2}
                >
                  {addLoading ? "Saving…" : "Add"}
                </button>
              </div>
              {addError && <div className={styles.addAllergyError}>{addError}</div>}
              {addSuccess && <div className={styles.addAllergySuccess}>{addSuccess}</div>}
            </div>
          </div>
        )}

        {/* Phase 6A: Vitals section */}
        {selected && (
          <div className={styles.vitalsSection}>
            <h2 className={styles.vitalsSectionTitle}>Vitals</h2>
            {vitalsLoading && (
              <p className={styles.loading}>Loading vitals…</p>
            )}
            {vitalsError && (
              <div className={styles.error}>{vitalsError}</div>
            )}
            {!vitalsLoading && !vitalsError && vitals.length === 0 && (
              <p className={styles.empty}>No vitals found.</p>
            )}
            {!vitalsLoading && !vitalsError && vitals.length > 0 && (
              <table className={styles.vitalsTable}>
                <thead>
                  <tr>
                    <th className={styles.vitalsThType}>Type</th>
                    <th className={styles.vitalsThValue}>Value</th>
                    <th className={styles.vitalsThDate}>Taken At</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((v, i) => (
                    <tr key={`${v.type}-${v.takenAt}-${i}`} className={styles.vitalsRow}>
                      <td className={styles.vitalsTd}>{v.type}</td>
                      <td className={styles.vitalsTd}>{v.value}</td>
                      <td className={styles.vitalsTdDate}>{v.takenAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Phase 6B: Add vital form */}
            <div className={styles.addVitalForm}>
              <h3 className={styles.addVitalTitle}>Record a Vital</h3>
              <div className={styles.addVitalRow}>
                <select
                  className={styles.vitalSelect}
                  value={newVitalType}
                  onChange={(e) => {
                    setNewVitalType(e.target.value);
                    setAddVitalError(null);
                    setAddVitalSuccess(null);
                  }}
                  disabled={addVitalLoading}
                >
                  {VITAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  className={styles.vitalInput}
                  value={newVitalValue}
                  onChange={(e) => {
                    setNewVitalValue(e.target.value);
                    setAddVitalError(null);
                    setAddVitalSuccess(null);
                  }}
                  placeholder="Value (e.g., 120/80)"
                  disabled={addVitalLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addVital();
                  }}
                />
                <button
                  className={styles.addVitalBtn}
                  onClick={addVital}
                  disabled={addVitalLoading || newVitalValue.trim().length < 1}
                >
                  {addVitalLoading ? "Saving…" : "Record"}
                </button>
              </div>
              {addVitalError && <div className={styles.addVitalError}>{addVitalError}</div>}
              {addVitalSuccess && <div className={styles.addVitalSuccess}>{addVitalSuccess}</div>}
            </div>
          </div>
        )}

        {/* Phase 8A: Medications section */}
        {selected && (
          <div className={styles.medsSection}>
            <h2 className={styles.medsSectionTitle}>Medications</h2>
            {medsLoading && (
              <p className={styles.loading}>Loading medications…</p>
            )}
            {medsError && (
              <div className={styles.error}>{medsError}</div>
            )}
            {!medsLoading && !medsError && medications.length === 0 && (
              <p className={styles.empty}>No active medications.</p>
            )}
            {!medsLoading && !medsError && medications.length > 0 && (
              <table className={styles.medsTable}>
                <thead>
                  <tr>
                    <th className={styles.medsTh}>Medication</th>
                    <th className={styles.medsTh}>Sig / Instructions</th>
                    <th className={styles.medsTh}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m) => (
                    <tr key={m.id} className={styles.medsRow}>
                      <td className={styles.medsTd}>{m.name}</td>
                      <td className={styles.medsTdSig}>{m.sig}</td>
                      <td className={styles.medsTdStatus}>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Phase 7A: Notes section */}
        {selected && (
          <div className={styles.notesSection}>
            <h2 className={styles.notesSectionTitle}>Notes</h2>
            {notesLoading && (
              <p className={styles.loading}>Loading notes…</p>
            )}
            {notesError && (
              <div className={styles.error}>{notesError}</div>
            )}
            {!notesLoading && !notesError && notes.length === 0 && (
              <p className={styles.empty}>No notes found.</p>
            )}
            {!notesLoading && !notesError && notes.length > 0 && (
              <table className={styles.notesTable}>
                <thead>
                  <tr>
                    <th className={styles.notesTh}>Title</th>
                    <th className={styles.notesTh}>Date</th>
                    <th className={styles.notesTh}>Author</th>
                    <th className={styles.notesTh}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <tr key={n.id} className={styles.notesRow}>
                      <td className={styles.notesTd}>{n.title}</td>
                      <td className={styles.notesTdDate}>{n.date}</td>
                      <td className={styles.notesTd}>{n.author}</td>
                      <td className={styles.notesTdStatus}>{n.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Phase 7B: Create note form */}
            <div className={styles.addNoteForm}>
              <h3 className={styles.addNoteTitle}>Create Note</h3>
              <div className={styles.addNoteRow}>
                <input
                  className={styles.noteTitleInput}
                  value={newNoteTitle}
                  onChange={(e) => {
                    setNewNoteTitle(e.target.value);
                    setAddNoteError(null);
                    setAddNoteSuccess(null);
                  }}
                  placeholder="Note title"
                  disabled={addNoteLoading}
                />
              </div>
              <div className={styles.addNoteRow}>
                <textarea
                  className={styles.noteTextInput}
                  value={newNoteText}
                  onChange={(e) => {
                    setNewNoteText(e.target.value);
                    setAddNoteError(null);
                    setAddNoteSuccess(null);
                  }}
                  placeholder="Note text…"
                  rows={4}
                  disabled={addNoteLoading}
                />
              </div>
              <button
                className={styles.addNoteBtn}
                onClick={addNote}
                disabled={addNoteLoading || newNoteTitle.trim().length < 1 || newNoteText.trim().length < 1}
              >
                {addNoteLoading ? "Saving…" : "Save Note"}
              </button>
              {addNoteError && <div className={styles.addNoteError}>{addNoteError}</div>}
              {addNoteSuccess && <div className={styles.addNoteSuccess}>{addNoteSuccess}</div>}
            </div>
          </div>
        )}

        {loading && <p className={styles.loading}>Searching…</p>}

        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && count !== null && (
          <>
            <p className={styles.resultCount}>
              {count} result{count !== 1 ? "s" : ""}
            </p>
            {count === 0 ? (
              <p className={styles.empty}>No patients found.</p>
            ) : (
              <ul className={styles.resultList}>
                {results.map((pt) => (
                  <li
                    key={pt.dfn}
                    className={styles.resultItem}
                    onClick={() => selectPatient(pt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectPatient(pt);
                    }}
                  >
                    <span className={styles.resultName}>{pt.name}</span>
                    <span className={styles.resultDfn}>DFN {pt.dfn}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
