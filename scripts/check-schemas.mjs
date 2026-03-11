import { readFileSync, readdirSync } from 'fs';

function fixMalformedJson(raw) {
  // Step 1: Fix bare decimals like .01 -> 0.01
  let fixed = raw.replace(/([:,\[]\s*)(\.[0-9])/g, '$10$2');
  
  // Step 2: Fix unescaped single quotes inside JSON strings
  // Match string values and escape any single quotes
  // Actually the real issue is more complex - let's just replace
  // problematic characters within string values
  fixed = fixed.replace(/"([^"]*?)'/g, (match) => {
    // Only if this is inside a JSON string value
    return match.replace(/'/g, "\\'");
  });
  
  // Step 3: Fix values like 255a that aren't quoted
  fixed = fixed.replace(/:\s*([0-9]+[a-zA-Z][a-zA-Z0-9']*)\s*([,}\]\n])/g, ': "$1"$2');
  
  // Step 4: Fix bare word values
  fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9_']*)\s*([,}\]\n])/g, (match, val, end) => {
    if (val === 'true' || val === 'false' || val === 'null') return match;
    return `: "${val}"${end}`;
  });
  
  return fixed;
}

const dir = 'data/vista/schema';
const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'file-index.json');
const nums = [];
let failures = 0;
const failSamples = [];
for (const f of files) {
  try {
    const raw = readFileSync(dir + '/' + f, 'utf-8');
    const d = JSON.parse(fixMalformedJson(raw));
    if (d.fileNumber != null) nums.push(d.fileNumber);
  } catch (e) {
    failures++;
    if (failSamples.length < 5) failSamples.push({ file: f, error: e.message.slice(0, 80) });
  }
}
console.log('Parsed:', nums.length, 'of', files.length, 'files (', failures, 'failures)');
console.log('Failure samples:', JSON.stringify(failSamples, null, 2));
