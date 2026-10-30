/*
 * Alien Head 3D — Bob's voice lines
 *
 * Every line has an MP3 in audio/ (ElevenLabs voice "Jessica", pitched up
 * 1.5x). Lines are grouped by the game event that plays them; Bob picks a
 * random one from the group, avoiding the one he said last.
 */
(function () {
  'use strict';

  window.BOB_LINES = {
    crash_earth: {
      crash_earth_1: 'You crashed into the planet you just left. That takes real talent.',
      crash_earth_2: 'Earth is behind you. You were supposed to go away from it.',
      crash_earth_3: "Congratulations, you've invented the most expensive boomerang."
    },
    crash_planet: {
      crash_planet_1: 'Gravity is not a suggestion, pilot. The big round things are hard to miss.',
      crash_planet_2: 'You were trying to fly past it, not into it. Did you think the planet would move?',
      crash_planet_3: 'Impact confirmed. Another probe, another crater.',
      crash_planet_4: "My species has a word for that maneuver. It translates to 'lawn dart.'"
    },
    crash_moon: {
      crash_moon_1: "You hit the Moon. It's the closest thing in the sky, and you still missed the gap.",
      crash_moon_2: "It's a rock that's been there for four billion years. It didn't move."
    },
    crash_mars: { crash_mars_1: "Mars is red because of rust and embarrassment. You've added to the second one." },
    crash_venus: { crash_venus_1: "Venus is the hottest planet. Your probe's new job is as a very small meteor." },
    crash_jupiter: { crash_jupiter_1: "Jupiter is the largest planet in your system, and you still found a way to miss the part where you don't hit it." },
    crash_saturn: { crash_saturn_1: "You flew into Saturn's rings. They're famous. That's why people look at them from far away." },
    crash_neptune: { crash_neptune_1: "You made it all the way to Neptune just to crash. That's commitment to failure." },
    crash_hazard: {
      crash_hazard_1: 'A rock. You hit a rock. Space is mostly empty, and you found the one thing in it.',
      crash_hazard_2: "The debris field was clearly marked. By me. You didn't listen.",
      crash_hazard_3: 'Your probe is now confetti. Well done.'
    },
    lost: {
      crash_lost_1: 'You left the map. Nobody told you to leave the map.',
      crash_lost_2: "Your probe is now drifting forever. It'll make a lovely tourist attraction.",
      crash_lost_3: 'That was too much power and too little aim. Mostly the second one.'
    },
    streak: {
      crash_streak_1: "That's three in a row. I'm starting to think it's deliberate.",
      crash_streak_2: "I've seen toddlers with better trajectory control, and they were throwing spaghetti.",
      crash_streak_3: 'Please let me fly. I promise to be gentle about your feelings afterward.',
      crash_streak_4: "On my planet, we'd hold a funeral for the probes you've wasted."
    },
    launch: {
      launch_1: "And she's off. Try not to hit anything.",
      launch_2: "Launching. I've already prepared my disappointment.",
      launch_3: "Fingers crossed. I have six, and they're all crossed."
    },
    victory: {
      victory_1: 'Not bad, human. That was only somewhat embarrassing.',
      victory_2: "You did it. I'd say I'm proud, but that would be a lie, and also against my programming."
    },
    victory3: {
      victory3_1: 'Three stars. All beacons. I take back about a third of the insults.',
      victory3_2: 'A perfect run. Statistically, even a broken clock gets a perfect run once.'
    },
    autopilot: {
      autopilot_1: 'Using autopilot? Fine. Watch a professional.',
      autopilot_2: "Plotting the route. Take notes, you'll need them.",
      autopilot_3: 'Autopilot engaged. Please take your hands off everything.'
    },
    mission_1: { mission_1: "Mission one. Use the Moon as a slingshot. It's the easiest one, so don't ruin it." },
    mission_2: { mission_2: 'Mission two. Mars, with asteroids in the way. This is where the amateurs fall off.' },
    mission_3: { mission_3: "Mission three. Venus is heavy and pulls hard. Use it, don't fight it." },
    mission_4: { mission_4: 'Mission four. The asteroid belt. Thread the gap. Try to be precise instead of lucky.' },
    mission_5: { mission_5: 'Mission five. Jupiter and Ganymede, a double assist. Choose a path and commit.' },
    mission_6: { mission_6: "Mission six. Saturn's rings and two moons tugging at you. Think of it as a hard group project." },
    mission_7: { mission_7: "Mission seven. Uranus and Neptune. They're far, cold, and rude." },
    mission_8: { mission_8: "Final mission. Three giants, a moving moon, and a crowded debris field. Good luck. You've earned my respect, a little." },
    finale: { finale_1: "You did it. The edge of the solar system. I'm contacting my species. They won't believe it either." },
    idle: {
      idle_1: 'Are you planning to launch, or are we just admiring the view?',
      idle_2: 'Take your time. I only have a few more million years.'
    }
  };
})();
