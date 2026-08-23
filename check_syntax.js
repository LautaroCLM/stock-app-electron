const fs = require('fs');
const code = fs.readFileSync('renderer.js', 'utf8');
const lines = code.split('\n');

let inTemplate = false;
let templateStart = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '`') {
      if (!inTemplate) {
        inTemplate = true;
        templateStart = i + 1;
      } else {
        inTemplate = false;
        templateStart = -1;
      }
    }
  }
}

if (inTemplate) {
  console.log('Template literal never closed! Started at line:', templateStart);
} else {
  console.log('All template literals are balanced.');
}

// Also check for problematic patterns in renderTable
const renderTableMatch = code.match(/function renderTable[\s\S]*?^  \}/m);
if (renderTableMatch) {
  console.log('Found renderTable, length:', renderTableMatch[0].length);
}
