// Generate placeholder vehicle video clips for development/testing
// Run: node generate-placeholders.js
// Requires: ffmpeg in PATH

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const videosDir = path.join(__dirname, 'public', 'videos');

const clips = [
  { file: 'vehicle-1.mp4', text: 'STEALTH HELICOPTER', duration: 8, bg: '2a1a4a' },
  { file: 'vehicle-2.mp4', text: 'ARMORED SUV', duration: 8, bg: '1a3a2a' },
  { file: 'vehicle-3.mp4', text: 'SPEEDBOAT', duration: 8, bg: '1a2a4a' },
  { file: 'vehicle-4.mp4', text: 'JET FIGHTER', duration: 8, bg: '3a2a1a' },
  { file: 'vehicle-5.mp4', text: 'SUBMARINE', duration: 8, bg: '1a3a3a' },
];

for (const clip of clips) {
  const outPath = path.join(videosDir, clip.file);

  const cmd = `ffmpeg -y -f lavfi -i color=c=0x${clip.bg}:s=1280x720:d=${clip.duration} -vf "drawtext=text='${clip.text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -t ${clip.duration} "${outPath}"`;

  console.log(`Generating: ${clip.file}`);
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  Done: ${clip.file}`);
  } catch (e) {
    if (fs.existsSync(outPath)) {
      console.log(`  Done: ${clip.file}`);
    } else {
      console.error(`  FAILED: ${clip.file}`);
    }
  }
}

console.log('\nDone!');
