# Alien Head 3D: Bob

Bob is a 3D alien head (three.js) who commentates a space game. He has no buttons and takes no input: he floats, blinks and looks around on his own, and **speaks only when the game tells him something happened**. Each event plays one of 45 pre-recorded voice lines (MP3s in `audio/`) with his mouth moving to the audio, a matching face and a subtitle.

The voice is ElevenLabs "Jessica", pitched up 1.5x into Bob's squeaky alien voice, baked into the MP3s. No API keys or internet services are needed to play them.

## Events

| Event | Bob says | Face |
| --- | --- | --- |
| `mission` `{ number: 1-8 }` | that mission's briefing | attentive |
| `crash` `{ body: 'Earth' }` | an Earth crash line | smirk |
| `crash` `{ body: 'Moon' / 'Mars' / 'Venus' / 'Jupiter' / 'Saturn' / 'Neptune' }` | a line about that body | smirk |
| `crash` `{ body: <anything else> }` | a general planet/moon crash line | smirk |
| `hazard` (or `crash` with `hazard: true`, or a body named like an asteroid/debris/junk/rock) | an asteroid/debris line | smirk |
| `lost` | a lost-in-deep-space line | smirk |
| 3rd crash in a row (and every other one after, until the next mission or victory) | a streak line instead | smirk |
| `launch` | a launch line, only now and then (35% chance, at most every 20 s) | surprised |
| `autopilot` | an autopilot line | smirk |
| `victory` `{ stars: 1-2 }` | a victory line | proud |
| `victory` `{ stars: 3 }` | a 3-star line | happy |
| `finale` | the final win line | happy |
| `idle` | an idle line (never interrupts anything) | bored |

Bob picks a random line in each group and never repeats the one he just said. A new event interrupts the current line unless it is less important (idle < launch/autopilot < everything else).

## Using Bob in the game

**In the same page:** load the scripts and call `AlienBob.event(...)`:

```html
<canvas id="scene"></canvas>
<p id="subtitle" class="subtitle"></p>
<script src="https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js"></script>
<script src="js/alien-head.js"></script>
<script src="js/lines.js"></script>
<script src="js/bob.js"></script>
```

```js
AlienBob.event('mission', { number: 3 });
AlienBob.event('crash', { body: 'Moon' });
AlienBob.event('victory', { stars: 3 });
```

**In an iframe (easiest):** put Bob in a corner of the game and send him messages:

```html
<iframe id="bob" src="alien-head-3d/index.html?transparent=1" allow="autoplay" title="Bob"></iframe>
```

```js
const bob = document.getElementById('bob').contentWindow;
bob.postMessage({ type: 'bob', event: 'crash', body: 'Moon' }, '*');
bob.postMessage({ type: 'bob', event: 'mission', number: 3 }, '*');
```

Page options: `?transparent=1` removes the background so Bob floats over the game, `?subtitles=0` hides the subtitles.

**Sound needs one click first.** Browsers block audio until the player has clicked or pressed a key on the page (the game's first click counts; keep `allow="autoplay"` on the iframe). Before that, Bob still shows the face and subtitle.

**Try it:** open `events-test.html`, a developer page with a button for every event that shows the exact `postMessage` call.

## Files

```
index.html          Bob (no controls)
events-test.html    developer page: send events to Bob
css/style.css       styles
js/alien-head.js    the 3D alien head and its expressions
js/lines.js         every voice line, grouped by event
js/bob.js           scene, idle animation, events, MP3 playback with lip sync
audio/*.mp3         the 45 voice lines
```
