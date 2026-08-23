// Use Node's own tokenizer approach - scan for the real issue
// The error "missing ) after argument list" at line 4854 means
// the V8 parser thinks there's an unclosed ( somewhere.
// 
// Key insight: V8's error position (line 4854) is where it DETECTED the problem,
// not necessarily where the problem IS.
//
// Let's look at the HTML pages object which is huge and contains many { } chars
// that our line-by-line counter might be miscounting.

const fs = require('fs');
const code = fs.readFileSync('renderer.js', 'utf8');
const lines = code.split('\n');

// The pages object is defined somewhere and contains large HTML strings
// Let's find where the pages object starts and ends
const pagesStart = lines.findIndex(l => l.includes('const pages = {') || l.includes('const pages={'));
console.log('pages object starts at line:', pagesStart + 1);

// Also find the inventario template literal
const inventarioLine = lines.findIndex(l => l.trim() === 'inventario: `');
console.log('inventario template at line:', inventarioLine + 1);

// Find where the inventario template closes
// Look for lines that are just backtick or end with backtick
for (let i = inventarioLine + 1; i < Math.min(inventarioLine + 1000, lines.length); i++) {
  const trimmed = lines[i].trim();
  if (trimmed === '`,' || trimmed === '`' || trimmed.startsWith('`')) {
    if (trimmed === '`,' || trimmed === '`;' || trimmed === '`') {
      console.log('inventario template closes at line:', i + 1, '| content:', lines[i]);
      break;
    }
  }
}

// Check specifically around the pages object for the HTML template
// The inventario HTML might contain { } chars that our per-line counter
// handles differently from multi-line template checker

// Let's check: does the pages object have balanced braces when treated as a JS expression?
const pagesIdx = lines.findIndex(l => l.includes('const pages ='));
console.log('\npages assignment at line:', pagesIdx + 1);
if (pagesIdx >= 0) {
  console.log('  ', lines[pagesIdx].trim());
}

// Look for all lines that start with "    inventario:" or similar - these are large HTML blocks
const htmlTemplates = [];
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if ((trimmed.endsWith(': `') || trimmed.endsWith(':  `')) && i > 100) {
    htmlTemplates.push({ line: i + 1, content: lines[i].trim() });
  }
}
console.log('\nHTML template sections:');
htmlTemplates.forEach(t => console.log(`  Line ${t.line}: ${t.content}`));
