// tail.js - follow a log file like "tail -f", line by line.
//
// How it works:
// 1. We remember how many bytes of the file we have already read (the "offset").
// 2. Every second we check the file size. If it grew, we read only the NEW bytes.
// 3. We split them into lines. A line that is not finished yet (no "\n" at the end)
//    is kept in `leftover` until the rest arrives.
// 4. If the file got SMALLER, Cowrie rotated it (started a new file): we restart at 0.
import fs from 'node:fs';

export function tailFile(path, onLine, { fromStart = false, intervalMs = 1000 } = {}) {
  let offset = 0;
  let leftover = '';

  if (!fromStart && fs.existsSync(path)) {
    offset = fs.statSync(path).size; // skip old lines, only show new attacks
  }

  function readNew() {
    if (!fs.existsSync(path)) return;
    const size = fs.statSync(path).size;
    if (size < offset) { offset = 0; leftover = ''; } // file was rotated
    if (size === offset) return;

    const fd = fs.openSync(path, 'r');
    const buffer = Buffer.alloc(size - offset);
    fs.readSync(fd, buffer, 0, buffer.length, offset);
    fs.closeSync(fd);
    offset = size;

    const lines = (leftover + buffer.toString('utf8')).split('\n');
    leftover = lines.pop(); // last piece may be an unfinished line
    for (const line of lines) {
      if (line.trim()) onLine(line);
    }
  }

  readNew();
  // fs.watchFile uses polling: slower than fs.watch, but reliable with Docker on Windows.
  fs.watchFile(path, { interval: intervalMs }, readNew);
  return () => fs.unwatchFile(path);
}
