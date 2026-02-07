// Generate placeholder video clips for development/testing
// Run: node generate-placeholders.js
// Requires: ffmpeg in PATH

const { execSync } = require('child_process');
const path = require('path');

const videosDir = path.join(__dirname, 'public', 'videos');

const clips = [
  { file: 'intro.mp4', text: 'INTRO - Welcome agents', duration: 5, bg: '2244aa' },
  { file: 'situation-1.mp4', text: 'SITUATION 1 - Cut through a steel door', duration: 6, bg: '1155cc' },
  { file: 'situation-2.mp4', text: 'SITUATION 2 - Intercept a radio signal', duration: 6, bg: '1155cc' },
  { file: 'situation-3.mp4', text: 'SITUATION 3 - Escape a locked submarine', duration: 6, bg: '1155cc' },
  { file: 'correct.mp4', text: 'CORRECT - Good choice!', duration: 3, bg: '118833' },
  { file: 'wrong.mp4', text: 'WRONG - Try again!', duration: 3, bg: 'bb2222' },
  { file: 'solved.mp4', text: 'SOLVED - Well done agents!', duration: 5, bg: '228844' },
  { file: 'idle.mp4', text: 'AWAITING INPUT...', duration: 3, bg: '333355' },
];

for (const clip of clips) {
  const outPath = path.join(videosDir, clip.file);

  // Use simple text, avoid special chars
  const cmd = `ffmpeg -y -f lavfi -i color=c=0x${clip.bg}:s=1280x720:d=${clip.duration} -vf "drawtext=text='${clip.text}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -t ${clip.duration} "${outPath}"`;

  console.log(`Generating: ${clip.file} (${clip.duration}s)`);
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  Done: ${clip.file}`);
  } catch (e) {
    const stderr = e.stderr?.toString() || '';
    // ffmpeg writes progress info to stderr even on success, check if file exists
    const fs = require('fs');
    if (fs.existsSync(outPath)) {
      console.log(`  Done: ${clip.file}`);
    } else {
      console.error(`  FAILED: ${clip.file}`);
      console.error(`  ${stderr.split('\n').filter(l => l.trim()).pop()}`);
    }
  }
}

console.log('\nDone!');
