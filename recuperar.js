const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logFile = 'C:\\Users\\herna\\.gemini\\antigravity\\brain\\95540051-5a29-4e33-8467-c2d4b52bdd3e\\.system_generated\\logs\\transcript_full.jsonl';

async function findLastRendererWrite() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastWrite = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      // Look for tool calls that edited renderer.js
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' || tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            const args = tc.args || {};
            if (args.TargetFile && args.TargetFile.includes('renderer.js')) {
              lastWrite = {
                step_index: obj.step_index,
                tool: tc.name,
                args: args,
                time: obj.created_at || obj.timestamp
              };
            }
          }
        }
      }
      // Also look for system responses or final contents
    } catch (e) {
      // Ignore parse errors
    }
  }

  if (lastWrite) {
    console.log(`Found last edit to renderer.js at step ${lastWrite.step_index} using tool ${lastWrite.tool}`);
    fs.writeFileSync('C:\\Users\\herna\\.gemini\\antigravity\\scratch\\last_write_meta.json', JSON.stringify(lastWrite, null, 2));
  } else {
    console.log('No edits to renderer.js found in transcript.');
  }
}

findLastRendererWrite();