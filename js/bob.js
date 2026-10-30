/*
 * Alien Head 3D — Bob, the event-driven alien
 *
 * No user input: Bob idles on his own (floats, blinks, looks around) and
 * speaks only when the game tells him something happened. Each event plays
 * one of the pre-made MP3s in audio/ (see js/lines.js) with lip sync, a
 * matching face and a subtitle.
 *
 * From the game (same page):        AlienBob.event('crash', { body: 'Moon' })
 * From the game (Bob in an iframe): frame.contentWindow.postMessage({ type: 'bob', event: 'crash', body: 'Moon' }, '*')
 *
 * Events:
 *   crash      { body: 'Earth' | 'Moon' | 'Mars' | 'Venus' | 'Jupiter' | 'Saturn' | 'Neptune' | any other name }
 *   hazard     hit an asteroid or debris (or crash with { hazard: true })
 *   lost       drifted off the map / battery died
 *   launch     probe launched (Bob only comments now and then)
 *   victory    { stars: 1-3 }
 *   autopilot  autopilot engaged
 *   mission    { number: 1-8 }   played when a mission loads
 *   finale     after the last mission
 *   idle       the player has been sitting still
 * Three or more crashes in a row (until the next mission or victory) play a "streak" line.
 *
 * Control messages: 'unlock' (the player clicked in the game, so sound may
 * play; a line blocked before that is replayed) and 'mute' { muted: true|false }.
 * Inside an iframe Bob posts { type: 'bob-ready' }, { type: 'bob-line', text, group, file }
 * and { type: 'bob-done' } to the parent page, so the game can show its own subtitles.
 *
 * Page options: ?transparent=1 (no background, for overlaying) and ?subtitles=0.
 */
(function () {
  'use strict';

  const T = window.THREE;
  const LINES = window.BOB_LINES;
  const params = new URLSearchParams(location.search);
  const TRANSPARENT = params.get('transparent') === '1';
  const SUBTITLES = params.get('subtitles') !== '0';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now() / 1000;
  if (TRANSPARENT) document.documentElement.classList.add('transparent');

  // ---------- Scene ----------
  const canvas = document.getElementById('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
  scene.add(new T.HemisphereLight(0xcffafe, 0x1e1b4b, 1.1));
  const key = new T.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2.5, 3, 4);
  scene.add(key);
  const rim = new T.DirectionalLight(0x67e8f9, 3);
  rim.position.set(3, 1.5, -3);
  scene.add(rim);
  const rim2 = new T.DirectionalLight(0xa855f7, 2);
  rim2.position.set(-3, -1, -2.5);
  scene.add(rim2);

  if (!TRANSPARENT) {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 30 + Math.random() * 40, s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(t) * r, u * r, -Math.abs(s * Math.sin(t) * r) - 10], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.8 })));
  }

  const alien = new window.AlienHead(scene);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(2.4 / half, 1.9 / (half * camera.aspect));
    camera.position.set(0, 0.1, dist);
    camera.lookAt(0, SUBTITLES ? 0 : 0.25, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Faces for each kind of line ----------
  const FACES = {
    smirk: { face: { smileR: 0.55, smileL: 0.05, browDownL: 0.45, browOuterR: 0.3, squintL: 0.3, squintR: 0.1 }, color: 'wink' },
    surprised: { face: { browInnerUp: 0.7, browOuterL: 0.5, browOuterR: 0.5, wideL: 0.5, wideR: 0.5 }, color: 'surprised' },
    proud: { face: { smileL: 0.6, smileR: 0.6, browInnerUp: 0.3, wideL: 0.2, wideR: 0.2 }, color: 'happy' },
    happy: { face: { smileL: 0.85, smileR: 0.85, squintL: 0.3, squintR: 0.3 }, color: 'happy' },
    briefing: { face: { browInnerUp: 0.2, smileL: 0.15, smileR: 0.15 }, color: 'neutral' },
    bored: { face: { blinkL: 0.55, blinkR: 0.55, browDownL: 0.2, browDownR: 0.2, gazeY: -0.3, frownL: 0.2, frownR: 0.2 }, color: 'sad' }
  };
  function faceFor(group) {
    if (/^crash|^lost|^streak|^autopilot/.test(group)) return 'smirk';
    if (group === 'launch') return 'surprised';
    if (group === 'victory') return 'proud';
    if (group === 'victory3' || group === 'finale') return 'happy';
    if (group === 'idle') return 'bored';
    return 'briefing';
  }
  // Lines that may interrupt others; idle and launch chatter never interrupt
  const PRIORITY = { idle: 0, launch: 1, autopilot: 1 };
  const priorityOf = (group) => (group in PRIORITY ? PRIORITY[group] : 2);

  // ---------- Playing lines ----------
  let actx = null, analyser = null, buf = null;
  let current = null;        // { audio, group, until }
  let face = null, faceUntil = 0;
  const lastLine = {};       // group -> last file, to avoid repeats
  const subtitle = document.getElementById('subtitle');
  let subtitleUntil = 0;

  function audioContext() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      buf = new Uint8Array(analyser.fftSize);
      analyser.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  // Browsers only allow sound after the person has clicked or pressed a key
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => unlock(), { passive: true }));

  function pick(group) {
    const files = Object.keys(LINES[group] || {});
    if (!files.length) return null;
    let options = files.length > 1 ? files.filter((f) => f !== lastLine[group]) : files;
    const file = options[Math.floor(Math.random() * options.length)];
    lastLine[group] = file;
    return { file, text: LINES[group][file] };
  }

  function stop() {
    if (current) { current.audio.pause(); current = null; }
  }

  // When Bob is inside a game page, tell the game what he is saying (for its own subtitles)
  const host = window.parent !== window ? window.parent : null;
  function tellHost(msg) { if (host) host.postMessage(msg, '*'); }

  let muted = false;
  let pending = null; // a line the browser wouldn't play yet (no click so far); replayed on unlock

  /** Play a random line from a group (e.g. 'crash_moon', 'mission_3'). */
  function say(group) {
    const t = now();
    if (current && t < current.until && priorityOf(group) <= priorityOf(current.group) - 1) return false; // don't interrupt something more important
    if (current && t < current.until && priorityOf(group) === 0) return false;
    const line = pick(group);
    if (!line) return false;
    playLine(group, line);
    return true;
  }

  function playLine(group, line) {
    const t = now();
    stop();
    pending = null;
    const audio = new Audio('audio/' + line.file + '.mp3');
    try { audioContext().createMediaElementSource(audio).connect(analyser); } catch (e) { /* plays without lip sync */ }
    current = { audio, group, until: t + Math.max(3, line.text.length * 0.07) };
    audio.addEventListener('loadedmetadata', () => { if (current && current.audio === audio) current.until = now() + audio.duration + 0.2; });
    audio.addEventListener('ended', () => {
      if (current && current.audio === audio) current = null;
      faceUntil = Math.min(faceUntil, now() + 0.8);
      subtitleUntil = Math.min(subtitleUntil, now() + 1.5);
      tellHost({ type: 'bob-done' });
    });
    if (!muted) {
      audio.play().catch((e) => {
        // Sound is blocked until the first click: keep the face and subtitle, replay the line on unlock
        if (e && e.name === 'NotAllowedError') pending = { group, line, at: now() };
      });
    }

    face = FACES[faceFor(group)];
    faceUntil = t + (muted ? Math.max(3, line.text.length * 0.07) : 12);
    alien.setMood(face.color);
    if (SUBTITLES) {
      subtitle.textContent = line.text;
      subtitle.classList.add('show');
      subtitleUntil = t + Math.max(3, line.text.length * 0.07) + 1;
    }
    tellHost({ type: 'bob-line', group, file: line.file, text: line.text });
  }

  /** The player clicked somewhere: sound is allowed now, so say any line that was blocked. */
  function unlock() {
    audioContext();
    if (pending && now() - pending.at < 20 && !muted) playLine(pending.group, pending.line);
    pending = null;
  }

  function setMuted(m) {
    muted = !!m;
    if (muted && current) current.audio.pause();
  }

  // ---------- Game events ----------
  const BODIES = { earth: 'crash_earth', moon: 'crash_moon', mars: 'crash_mars', venus: 'crash_venus', jupiter: 'crash_jupiter', saturn: 'crash_saturn', neptune: 'crash_neptune' };
  const HAZARD_WORDS = /asteroid|debris|junk|rock|fragment|hazard|radiation/i;
  let crashStreak = 0;
  let lastLaunchLine = -100;

  function event(name, detail) {
    detail = detail || {};
    switch (name) {
      case 'crash':
      case 'hazard':
      case 'lost': {
        crashStreak++;
        if (crashStreak >= 3 && crashStreak % 2 === 1) return say('streak');
        if (name === 'lost') return say('lost');
        const body = String(detail.body || '').trim();
        if (name === 'hazard' || detail.hazard || HAZARD_WORDS.test(body)) return say('crash_hazard');
        return say(BODIES[body.toLowerCase()] || 'crash_planet');
      }
      case 'launch':
        if (now() - lastLaunchLine < 20 || Math.random() > 0.35) return false; // only now and then
        lastLaunchLine = now();
        return say('launch');
      case 'victory':
        crashStreak = 0;
        return say(Number(detail.stars) >= 3 ? 'victory3' : 'victory');
      case 'autopilot':
        return say('autopilot');
      case 'mission': {
        crashStreak = 0;
        const n = clamp(Math.round(Number(detail.number) || 1), 1, 8);
        return say('mission_' + n);
      }
      case 'finale':
        crashStreak = 0;
        return say('finale');
      case 'idle':
        return say('idle');
      case 'reset':
        crashStreak = 0;
        return true;
      case 'unlock':
        unlock();
        return true;
      case 'mute':
        setMuted(detail.muted !== false);
        return true;
      default:
        return false;
    }
  }

  // Bob inside an iframe: the game posts { type: 'bob', event: 'crash', body: 'Moon' }
  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (d && d.type === 'bob' && typeof d.event === 'string') event(d.event, d);
  });

  // ---------- Idle animation ----------
  let nextBlink = 1;
  let look = { x: 0, y: 0, tx: 0, ty: 0, next: 2 };
  let last = performance.now();

  function frame(ms) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ms - last) / 1000);
    last = ms;
    const t = ms / 1000;

    // Glance around now and then
    if (t > look.next) {
      look.tx = (Math.random() * 2 - 1) * 0.8;
      look.ty = (Math.random() * 2 - 1) * 0.5;
      look.next = t + 1.5 + Math.random() * 3;
    }
    look.x += (look.tx - look.x) * Math.min(1, dt * 3);
    look.y += (look.ty - look.y) * Math.min(1, dt * 3);

    const talking = current && !current.audio.paused;
    const target = {
      gazeX: talking ? 0 : look.x,
      gazeY: talking ? 0 : look.y,
      yaw: (talking ? 0 : look.x * 0.35) + Math.sin(t * 0.5) * 0.06,
      pitch: (talking ? 0 : -look.y * 0.2) + Math.sin(t * 0.37) * 0.04,
      roll: Math.sin(t * 0.43) * 0.05
    };
    if (face && now() < faceUntil) Object.assign(target, face.face);
    else if (face) { face = null; alien.setMood('neutral'); }

    if (t > nextBlink) nextBlink = t + 2.5 + Math.random() * 3;
    if (nextBlink - t > 2.35 && nextBlink - t < 2.5) { target.blinkL = 1; target.blinkR = 1; }

    // Lip sync from the MP3's loudness
    if (talking && analyser) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const level = clamp((Math.sqrt(sum / buf.length) - 0.015) * 7, 0, 1);
      target.jawOpen = Math.max(target.jawOpen || 0, level * 0.75);
      target.funnel = level * 0.25;
    }

    if (subtitleUntil && now() > subtitleUntil && !talking) { subtitle.classList.remove('show'); subtitleUntil = 0; }

    alien.update(target, dt, t);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.AlienBob = {
    event, say, stop, unlock, lines: LINES,
    get speaking() { return !!(current && !current.audio.paused); }
  };
  tellHost({ type: 'bob-ready' });
})();
