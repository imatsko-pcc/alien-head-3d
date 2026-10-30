/*
 * Alien Head 3D — live microphone waveform
 *
 * Speech recognition doesn't share its audio, so while Listen is on we open
 * the microphone once more just to show it working: a scrolling waveform,
 * a level meter and the microphone's name. The audio is only drawn on the
 * screen; nothing is recorded or sent anywhere by this file.
 */
(function () {
  'use strict';

  const COLORS = {
    waiting: [34, 211, 238],   // listening for "Bob"
    awake: [74, 222, 128],     // listening for the question
    busy: [168, 85, 247],      // thinking / answering
    off: [100, 116, 139]
  };

  class MicMeter {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.stream = null;
      this.actx = null;
      this.analyser = null;
      this.data = null;
      this.history = [];   // recent loudness values for the scrolling view
      this.level = 0;      // 0..1, smoothed
      this.state = 'off';
      this.deviceName = '';
      this.raf = 0;
    }

    get running() { return !!this.stream; }

    async start() {
      if (this.stream) return;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const track = this.stream.getAudioTracks()[0];
      this.deviceName = (track && track.label) || 'Microphone';
      this.actx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.actx.state === 'suspended') await this.actx.resume();
      this.analyser = this.actx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.6;
      this.data = new Uint8Array(this.analyser.fftSize);
      this.actx.createMediaStreamSource(this.stream).connect(this.analyser); // analyse only, never played back
      this.history = [];
      const loop = () => { this.raf = requestAnimationFrame(loop); this.draw(); };
      loop();
    }

    stop() {
      cancelAnimationFrame(this.raf);
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this.actx) this.actx.close().catch(() => {});
      this.stream = this.actx = this.analyser = null;
      this.level = 0;
      this.clear();
    }

    clear() {
      const { ctx, canvas } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    fit() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      return dpr;
    }

    draw() {
      if (!this.analyser) return;
      const dpr = this.fit();
      const { ctx, canvas, data } = this;
      const W = canvas.width / dpr, H = canvas.height / dpr;
      if (W < 40 || H < 10) return; // not laid out yet (panel just appeared)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / data.length);
      const target = Math.min(1, rms * 6);
      this.level += (target - this.level) * (target > this.level ? 0.5 : 0.12);

      const [r, g, b] = COLORS[this.state] || COLORS.waiting;
      const color = (a) => `rgba(${r},${g},${b},${a})`;
      const meterW = 10, gap = 10, plotW = W - meterW - gap;
      const mid = H / 2;

      // Scrolling loudness history (the "waves" over the last few seconds)
      this.history.push(this.level);
      const maxBars = Math.max(1, Math.floor(plotW / 4));
      while (this.history.length > maxBars) this.history.shift();
      ctx.fillStyle = color(0.35);
      for (let i = 0; i < this.history.length; i++) {
        const x = plotW - (this.history.length - i) * 4;
        const hgt = Math.max(1.5, this.history[i] * (H - 6));
        ctx.fillRect(x, mid - hgt / 2, 2.5, hgt);
      }

      // Live waveform on top
      ctx.beginPath();
      const step = data.length / plotW;
      for (let x = 0; x < plotW; x++) {
        const v = (data[Math.floor(x * step)] - 128) / 128;
        const y = mid + v * (H / 2 - 3) * 1.8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color(0.95);
      ctx.lineWidth = 2;
      ctx.shadowColor = color(0.8);
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Level meter on the right
      const mx = W - meterW;
      ctx.fillStyle = 'rgba(148,163,184,0.18)';
      ctx.fillRect(mx, 2, meterW, H - 4);
      const lh = (H - 4) * this.level;
      ctx.fillStyle = color(0.95);
      ctx.fillRect(mx, H - 2 - lh, meterW, lh);
    }
  }

  window.AlienMicMeter = MicMeter;
})();
