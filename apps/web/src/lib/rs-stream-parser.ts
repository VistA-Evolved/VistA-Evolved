/**
 * Roll-and-Scroll Stream Parser
 *
 * Parses VistA terminal output to detect prompts and map them to
 * structured form fields. This enables the hybrid mode where terminal
 * prompts are mirrored as modern form inputs.
 *
 * R&S Prompt Patterns:
 *   "SELECT PATIENT NAME: "     -> autocomplete search
 *   "DATE OF BIRTH: "           -> date picker
 *   "ARE YOU SURE? "            -> confirmation dialog
 *   "REPLACE...WITH "           -> inline edit
 *   Default after "//"          -> pre-filled value
 *   "?" / "??"                  -> help text
 *   "@"                         -> delete confirmation
 *   "^"                         -> navigation/exit
 */

export interface ParsedPrompt {
  id: string;
  type: PromptType;
  label: string;
  defaultValue: string;
  helpText: string;
  required: boolean;
  fileNumber?: number;
  fieldNumber?: number;
  rawLine: string;
  timestamp: number;
}

export type PromptType =
  | 'free-text'
  | 'date'
  | 'numeric'
  | 'yes-no'
  | 'select'
  | 'pointer-lookup'
  | 'set-of-codes'
  | 'word-processing'
  | 'replace';

interface ParserState {
  prompts: ParsedPrompt[];
  currentPrompt: string;
  helpBuffer: string;
  inWordProcessing: boolean;
  wpFieldName: string;
  lastPromptId: number;
}

const PROMPT_PATTERNS: Array<{
  pattern: RegExp;
  type: PromptType;
  extractLabel: (match: RegExpMatchArray) => string;
  extractDefault?: (match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /^(SELECT\s+.+?):\s*$/i,
    type: 'pointer-lookup',
    extractLabel: (m) => m[1].trim(),
  },
  {
    pattern: /^(.+?)\s*DATE.*?:\s*$/i,
    type: 'date',
    extractLabel: (m) => m[1].trim(),
  },
  {
    pattern: /^(.+?)\s*\/\/\s*(.+?)\s*\/\/\s*$/,
    type: 'free-text',
    extractLabel: (m) => m[1].trim(),
    extractDefault: (m) => m[2].trim(),
  },
  {
    pattern: /^ARE YOU SURE\s*\??\s*$/i,
    type: 'yes-no',
    extractLabel: () => 'Confirm',
  },
  {
    pattern: /^(.+?)\s*\(Y\/N\)\s*$/i,
    type: 'yes-no',
    extractLabel: (m) => m[1].trim(),
  },
  {
    pattern: /^REPLACE\s+(.+?)\s+WITH\s*$/i,
    type: 'replace',
    extractLabel: (m) => `Replace: ${m[1]}`,
  },
  {
    pattern: /^(.+?):\s*$/,
    type: 'free-text',
    extractLabel: (m) => m[1].trim(),
  },
];

export function createStreamParser(): {
  feed: (data: string) => ParsedPrompt[];
  getState: () => ParserState;
  reset: () => void;
} {
  let state: ParserState = {
    prompts: [],
    currentPrompt: '',
    helpBuffer: '',
    inWordProcessing: false,
    wpFieldName: '',
    lastPromptId: 0,
  };

  function feed(data: string): ParsedPrompt[] {
    const newPrompts: ParsedPrompt[] = [];
    const lines = data.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.replace(/[\x00-\x1f]/g, '').trim();
      if (!trimmed) continue;

      // Check for help text response (? or ??)
      if (state.currentPrompt && (trimmed.startsWith('?') || trimmed.includes('Enter'))) {
        state.helpBuffer += trimmed + '\n';
        continue;
      }

      // Check for word processing mode
      if (trimmed.includes('EDIT Option:') || trimmed.includes('==[ WRAP ]')) {
        state.inWordProcessing = true;
        continue;
      }

      if (state.inWordProcessing && (trimmed === '' || trimmed === '^')) {
        state.inWordProcessing = false;
        continue;
      }

      // Try to match a prompt pattern
      for (const { pattern, type, extractLabel, extractDefault } of PROMPT_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) {
          state.lastPromptId++;
          const prompt: ParsedPrompt = {
            id: `prompt-${state.lastPromptId}`,
            type,
            label: extractLabel(match),
            defaultValue: extractDefault ? extractDefault(match) : '',
            helpText: state.helpBuffer.trim(),
            required: trimmed.includes('*') || trimmed.toUpperCase().includes('REQUIRED'),
            rawLine: trimmed,
            timestamp: Date.now(),
          };

          // Try to detect field/file number from context
          const fileMatch = trimmed.match(/FILE\s*#?\s*(\d+)/i);
          if (fileMatch) prompt.fileNumber = parseInt(fileMatch[1], 10);

          const fieldMatch = trimmed.match(/FIELD\s*#?\s*([\d.]+)/i);
          if (fieldMatch) prompt.fieldNumber = parseFloat(fieldMatch[1]);

          state.prompts.push(prompt);
          newPrompts.push(prompt);
          state.helpBuffer = '';
          state.currentPrompt = trimmed;
          break;
        }
      }
    }

    return newPrompts;
  }

  function getState() { return { ...state }; }
  function reset() {
    state = {
      prompts: [],
      currentPrompt: '',
      helpBuffer: '',
      inWordProcessing: false,
      wpFieldName: '',
      lastPromptId: 0,
    };
  }

  return { feed, getState, reset };
}

/**
 * Convert a user's form field input back to the R&S response format.
 * This is what gets sent to the terminal when the user fills in the form.
 */
export function formValueToTerminalInput(prompt: ParsedPrompt, value: string): string {
  switch (prompt.type) {
    case 'yes-no':
      return value.toLowerCase() === 'yes' || value === 'Y' ? 'Y\r' : 'N\r';
    case 'date': {
      // Convert ISO date to VistA date format (T, T+1, T-1, or MM/DD/YYYY)
      if (!value) return '\r';
      const d = new Date(value);
      const today = new Date();
      const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'T\r';
      if (diffDays > 0) return `T+${diffDays}\r`;
      if (diffDays < 0) return `T${diffDays}\r`;
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}\r`;
    }
    case 'replace':
      return value ? `${value}\r` : '\r';
    default:
      return value ? `${value}\r` : '\r';
  }
}
