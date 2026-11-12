export const REACTIONS = ["❤️", "😍", "😂", "🥹", "🔥", "👏"];
export const EVENT_TYPES = [
  { id: "anniversary", label: "Anniversary", emoji: "💍" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "trip", label: "Trip", emoji: "✈️" },
  { id: "milestone", label: "Milestone", emoji: "🌟" },
  { id: "date-night", label: "Date night", emoji: "🍷" },
  { id: "other", label: "Other", emoji: "💜" }
];
export const eventMeta = (id) => EVENT_TYPES.find((t) => t.id === id) || EVENT_TYPES[EVENT_TYPES.length - 1];
export const MAX_FILES = 10;
export const MAX_FILE_MB = 100;
