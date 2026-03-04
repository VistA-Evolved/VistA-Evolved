/**
 * UTF-8 Round-Trip Test Harness — Phase 498 (W34-P8)
 *
 * Provides a corpus of non-ASCII test strings per locale/script,
 * and validation functions to verify that characters survive
 * the API → VistA RPC → M global → read-back cycle.
 *
 * No PHI in any test strings. All strings are medically neutral sample data.
 */

// ── Test Corpus ────────────────────────────────────────────────

export interface Utf8TestString {
  locale: string;
  script: string;
  label: string;
  input: string;
  byteLength: number;
}

/**
 * Build the UTF-8 test corpus. Each entry has a known input string
 * and its expected byte length. If VistA returns the same string
 * after a round-trip, the encoding is preserved.
 */
export function buildTestCorpus(): Utf8TestString[] {
  const corpus: Array<Omit<Utf8TestString, 'byteLength'>> = [
    // Latin-1 / ASCII baseline
    { locale: 'en', script: 'Latin', label: 'ASCII baseline', input: 'Hello World 1234' },

    // Spanish — accented characters
    {
      locale: 'es',
      script: 'Latin-Extended',
      label: 'Spanish accents',
      input: 'Prueba de acentos: ni\u00F1a, se\u00F1or, caf\u00E9',
    },

    // Filipino — Tagalog with diacritics
    {
      locale: 'fil',
      script: 'Latin-Extended',
      label: 'Filipino diacritics',
      input: 'Magandang umaga, kumust\u00E1 ka?',
    },

    // Filipino — extended characters
    {
      locale: 'fil',
      script: 'Latin-Extended',
      label: 'Filipino names',
      input: 'Ju\u00E1n, Mar\u00EDa, Jos\u00E9',
    },

    // Mixed numeric + diacritics
    {
      locale: 'es',
      script: 'Latin-Extended',
      label: 'Mixed numeric',
      input: 'Paciente #12345 - atenci\u00F3n m\u00E9dica',
    },

    // Vietnamese — heavy diacritics
    {
      locale: 'vi',
      script: 'Latin-Extended',
      label: 'Vietnamese diacritics',
      input: 'Xin ch\u00E0o, c\u1EA3m \u01A1n b\u1EA1n',
    },

    // CJK — Chinese characters
    { locale: 'zh', script: 'CJK', label: 'Chinese characters', input: '\u4F60\u597D\u4E16\u754C' },

    // CJK — Japanese hiragana
    {
      locale: 'ja',
      script: 'CJK',
      label: 'Japanese hiragana',
      input: '\u3053\u3093\u306B\u3061\u306F',
    },

    // Cyrillic
    {
      locale: 'ru',
      script: 'Cyrillic',
      label: 'Russian Cyrillic',
      input: '\u041F\u0440\u0438\u0432\u0435\u0442',
    },

    // Arabic — RTL
    {
      locale: 'ar',
      script: 'Arabic',
      label: 'Arabic RTL',
      input: '\u0645\u0631\u062D\u0628\u0627',
    },

    // Boundary: max 7-bit ASCII printable
    {
      locale: 'en',
      script: 'ASCII',
      label: 'Printable ASCII boundary',
      input: ' !"#$%&\'()*+,-./0123456789:;<=>?@',
    },
  ];

  return corpus.map((c) => ({
    ...c,
    byteLength: Buffer.byteLength(c.input, 'utf-8'),
  }));
}

// ── Validation ─────────────────────────────────────────────────

export interface Utf8RoundTripResult {
  locale: string;
  script: string;
  label: string;
  input: string;
  output: string | null;
  match: boolean;
  inputBytes: number;
  outputBytes: number | null;
  error: string | null;
}

/**
 * Compare input and output strings for UTF-8 round-trip fidelity.
 */
export function validateRoundTrip(
  test: Utf8TestString,
  output: string | null,
  error: string | null
): Utf8RoundTripResult {
  return {
    locale: test.locale,
    script: test.script,
    label: test.label,
    input: test.input,
    output,
    match: output !== null && output === test.input,
    inputBytes: test.byteLength,
    outputBytes: output !== null ? Buffer.byteLength(output, 'utf-8') : null,
    error,
  };
}

/**
 * Summarize a batch of round-trip results.
 */
export function summarizeResults(results: Utf8RoundTripResult[]): {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  passRate: string;
  failedScripts: string[];
} {
  const passed = results.filter((r) => r.match).length;
  const errored = results.filter((r) => r.error !== null).length;
  const failed = results.length - passed;
  const failedScripts = [...new Set(results.filter((r) => !r.match).map((r) => r.script))];

  return {
    total: results.length,
    passed,
    failed,
    errored,
    passRate: results.length > 0 ? ((passed / results.length) * 100).toFixed(1) + '%' : '0%',
    failedScripts,
  };
}
