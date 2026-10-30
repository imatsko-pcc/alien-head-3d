/*
 * Alien Head 3D — listening for "Zorb"
 *
 * Uses the browser's speech recognition (Chrome, Edge, Safari) on the
 * microphone. While listening it waits for the wake word "Zorb"; after
 * hearing it, the next thing you say becomes the prompt. "Zorb, what time
 * is it?" in one breath works too.
 *
 * Note: in Chrome, speech recognition is done by Google's speech service,
 * so audio is sent there while the microphone is on.
 */
(function () {
  'use strict';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // "Zorb" plus the ways speech recognition tends to mishear it
  const WAKE = /\b(zorb|zorbs|zorb's|zorp|zorbe|zorba|zorg|zorbo|sorb|soarb|zoreb|zor b|zob)\b[\s,.!?]*/i;
  const AWAKE_TIMEOUT = 8000;

  function chirp(up) {
    try {
      const ac = chirp.ctx || (chirp.ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator();
      const g = ac.createGain();
      const t = ac.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(up ? 660 : 880, t);
      o.frequency.exponentialRampToValueAtTime(up ? 1320 : 440, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.2);
    } catch (e) { /* no sound effects */ }
  }

  class Listener {
    /**
     * opts: onState(state), onHeard(text, isFinal), onPrompt(text) -> Promise,
     *       onError(message), isSpeaking() -> bool
     * States: 'off', 'waiting' (for "Zorb"), 'awake' (for a prompt), 'busy' (answering)
     */
    constructor(opts) {
      this.opts = opts;
      this.state = 'off';
      this.rec = null;
      this.awakeTimer = 0;
    }

    static get supported() { return !!SR; }

    setState(s) {
      if (this.state === s) return;
      this.state = s;
      clearTimeout(this.awakeTimer);
      if (s === 'awake') this.awakeTimer = setTimeout(() => { if (this.state === 'awake') { chirp(false); this.setState('waiting'); } }, AWAKE_TIMEOUT);
      this.opts.onState(s);
    }

    start() {
      if (!SR) { this.opts.onError("This browser can't do speech recognition. Try Chrome or Edge."); return; }
      if (this.state !== 'off') return;
      this.setState('waiting');
      this.listen();
    }

    stop() {
      this.setState('off');
      if (this.rec) { try { this.rec.abort(); } catch (e) { /* already stopped */ } }
      this.rec = null;
    }

    listen() {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      rec.onresult = (ev) => this.handle(ev);
      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          this.stop();
          this.opts.onError('Microphone blocked. Allow microphone access in the address bar, then try again.');
        } else if (ev.error === 'audio-capture') {
          this.stop();
          this.opts.onError('No microphone found.');
        } else if (ev.error === 'network') {
          this.opts.onError("Speech recognition can't reach its server. Check your internet connection.");
        }
        // 'no-speech' and 'aborted' are normal; onend restarts
      };
      // Chrome stops recognition after a while; keep it going until turned off
      rec.onend = () => { if (this.state !== 'off' && this.rec === rec) setTimeout(() => { if (this.rec === rec) this.listen(); }, 250); };
      this.rec = rec;
      try { rec.start(); } catch (e) { /* already started */ }
    }

    handle(ev) {
      if (this.state === 'busy' || this.opts.isSpeaking()) return; // don't hear our own voice
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const text = res[0].transcript.trim();
        if (!text) continue;
        const final = res.isFinal;
        const wake = WAKE.exec(text);
        if (this.state === 'waiting') {
          if (!wake) continue;
          this.opts.onHeard(text, final);
          chirp(true);
          this.setState('awake');
        } else {
          this.opts.onHeard(text, final);
        }
        if (this.state === 'awake' && final) {
          const prompt = (wake ? text.slice(wake.index + wake[0].length) : text).replace(/^[\s,.!?]+/, '').trim();
          if (prompt.length > 1) this.answer(prompt);
        }
      }
    }

    async answer(prompt) {
      this.setState('busy');
      try { await this.opts.onPrompt(prompt); } finally {
        if (this.state === 'busy') this.setState('waiting');
      }
    }
  }

  window.AlienListener = Listener;
})();
