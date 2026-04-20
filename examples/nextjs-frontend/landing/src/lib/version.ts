// This should match the version in the main magneto package.json
// Update this when releasing new versions
export const MAGNETO_VERSION = "0.12.0";

export const VERSION_HIGHLIGHTS = [
  "Telepathy Auto-Handoff",
  "Task Completion Tracking",
  "Cascade/Gemini Runners",
];

export const getVersionBadgeText = () => {
  return `v${MAGNETO_VERSION} — ${VERSION_HIGHLIGHTS.slice(0, 3).join(", ")}`;
};
