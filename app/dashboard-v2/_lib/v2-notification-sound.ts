/** V2 알림 수신 시 짧은 비프음 */
export function playV2NotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.26);

    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    // 오디오 미지원 환경 무시
  }
}
