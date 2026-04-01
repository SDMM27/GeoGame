export function formatTime(ms) {
  if (ms === 0) return "00:00.000";

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor(ms % 1000);

  // PadStart rajoute les 0 nécessaires : 1ms devient 001, 10ms devient 010
  const mDisplay = String(minutes).padStart(2, '0');
  const sDisplay = String(seconds).padStart(2, '0');
  const msDisplay = String(milliseconds).padStart(3, '0');

  return `${mDisplay}:${sDisplay}.${msDisplay}`;
}
