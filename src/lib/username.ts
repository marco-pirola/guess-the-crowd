const ADJECTIVES = [
  "Quick",
  "Clever",
  "Bold",
  "Lucky",
  "Sharp",
  "Calm",
  "Swift",
  "Bright",
  "Sly",
  "Keen",
];
const ANIMALS = [
  "Fox",
  "Owl",
  "Wolf",
  "Hawk",
  "Otter",
  "Lynx",
  "Falcon",
  "Panda",
  "Tiger",
  "Raven",
];

/** Anonymous display name generated at first play, e.g. "QuickFox482". Shared by every store backend. */
export function randomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${adjective}${animal}${number}`;
}
