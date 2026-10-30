/*
 * Alien Head 3D — Zorb's brain (Claude)
 *
 * Answers what you ask Zorb using the Anthropic TypeScript SDK, loaded in the
 * browser from a CDN. The player pastes their own Claude API key into the
 * settings; it is kept only in this browser (localStorage) and sent only to
 * api.anthropic.com. Without a key, Zorb falls back to a few built-in answers.
 */
(function () {
  'use strict';

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm';
  const MODEL = 'claude-opus-5-5';
  const STORE = 'alienHeadBrain';
  const MAX_HISTORY = 30; // start a fresh conversation after this many messages

  const settings = (() => {
    try { return Object.assign({ apiKey: '' }, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { return { apiKey: '' }; }
  })();
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) { /* storage off */ }
  }

  const PERSONAS = {
    squeaky: 'You are cheerful, curious and a little silly, with a squeaky alien voice.',
    warrior: "You are a proud alien warrior in the style of a Klingon: bold, honorable and dramatic. You sometimes use a Klingon word such as nuqneH (hello) or Qapla' (success).",
    robot: 'You are a precise, friendly robot alien. You occasionally say "beep" or "boop".',
    custom: 'You are cheerful and curious.'
  };

  function systemPrompt(persona) {
    return [
      'You are Zorb, a small green 3D alien head that lives on a web page and talks to the person in front of the screen through their speakers.',
      PERSONAS[persona] || PERSONAS.custom,
      'Everything you write is read aloud by a text-to-speech voice, so answer in plain spoken sentences: no markdown, lists, code, emoji, links or symbols that do not read well aloud.',
      'Keep answers short: one to three sentences unless the person asks for more.',
      'You cannot see the person, browse the web, or take actions on their computer. If asked for something you cannot do, say so briefly.',
      'Latency-sensitive; begin your visible answer immediately.'
    ].join(' ');
  }

  let client = null;
  let clientKey = '';
  let history = []; // append-only; replaced wholesale when it gets long

  async function getClient() {
    if (client && clientKey === settings.apiKey) return client;
    const { default: Anthropic } = await import(SDK_URL);
    // The key belongs to the person using this page and stays in their browser.
    client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
    clientKey = settings.apiKey;
    return client;
  }

  // ---------- Built-in answers (no key needed) ----------
  const JOKES = [
    'Why did the alien leave the party early? It needed more space.',
    'How do aliens organize a party? They planet.',
    'What do you call a tick on the Moon? A luna-tick.'
  ];
  function builtIn(text) {
    const t = text.toLowerCase();
    if (/\b(time)\b/.test(t)) return 'It is ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' on planet Earth.';
    if (/\b(date|day is it|today)\b/.test(t)) return 'Today is ' + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '.';
    if (/\bjoke\b/.test(t)) return JOKES[Math.floor(Math.random() * JOKES.length)];
    if (/\b(your name|who are you)\b/.test(t)) return "I'm Zorb, your alien friend!";
    if (/\b(hello|hi|hey)\b/.test(t)) return 'Hello, Earthling!';
    return null;
  }

  function friendlyError(e) {
    const status = e && e.status;
    if (status === 401) return 'Claude rejected the API key. Check it in my settings.';
    if (status === 403) return "This Claude key isn't allowed to do that.";
    if (status === 429) return "I'm thinking too fast. Claude says slow down, try again in a moment.";
    if (status === 529 || status >= 500) return 'My brain signal is weak right now. Try again in a moment.';
    if (status === 400 && /credit/i.test(e.message || '')) return 'The Claude account is out of credits.';
    if (e && /Failed to fetch|NetworkError|import/i.test(e.message || '')) return "I can't reach my brain. Check your internet connection.";
    return 'Something went wrong in my brain: ' + ((e && e.message) || e);
  }

  /**
   * Ask Zorb something. Resolves to { text, mood, error? }.
   */
  async function ask(text, persona) {
    const prompt = String(text || '').trim();
    if (!prompt) return { text: "I didn't catch that.", mood: 'surprised' };
    if (!settings.apiKey) {
      return {
        text: builtIn(prompt) || 'I need a Claude API key to answer that. Click Settings and add one under my brain!',
        mood: 'happy',
        noKey: true
      };
    }
    try {
      const c = await getClient();
      if (history.length >= MAX_HISTORY) history = [];
      const messages = history.concat([{ role: 'user', content: prompt }]);
      const response = await c.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        // Opt into server-side fallback: if a safety classifier declines, another model answers
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: systemPrompt(persona),
        messages
      });
      if (response.stop_reason === 'refusal') {
        return { text: "Hmm, that's not something I can help with.", mood: 'sad' };
      }
      // Keep the full response content (including thinking blocks) so history stays append-only
      history = messages.concat([{ role: 'assistant', content: response.content }]);
      const answer = response.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
      return { text: answer || 'Hmm, I have no words.', mood: 'happy' };
    } catch (e) {
      return { text: friendlyError(e), mood: 'sad', error: true };
    }
  }

  function reset() { history = []; }

  window.AlienBrain = { settings, save, ask, reset, MODEL };
})();
