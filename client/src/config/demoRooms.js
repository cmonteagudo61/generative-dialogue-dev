// Demo room registry for MVP without Daily API key
// You can override any entry at runtime by setting localStorage key:
//   demo_room_urls = { "main": "https://.../GD-RESET-community-main", "dyad-1": "https://.../GD-RESET-dyad-1", "triad-1": "https://.../GD-RESET-triad-visit" }

const DEFAULTS = {
  "main": "https://generativedialogue.daily.co/GD-RESET-community-main",
  "dyad-1": "https://generativedialogue.daily.co/GD-RESET-dyad-1",
  // Reuse triad-visit URL as a single demo triad room
  "triad-1": "https://generativedialogue.daily.co/GD-RESET-triad-visit",
};

function readOverrides() {
  try {
    const raw = localStorage.getItem("demo_room_urls");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function getDemoRoomUrl(sessionId, roomType, index = 1) {
  // Only one demo room per type for MVP
  const overrides = readOverrides();
  switch (roomType) {
    case "community":
    case "main":
      return overrides["main"] || DEFAULTS["main"];
    case "dyad":
      return overrides["dyad-1"] || DEFAULTS["dyad-1"];
    case "triad":
      return overrides["triad-1"] || DEFAULTS["triad-1"];
    // For other types, fall back to main for now (MVP only)
    case "quad":
    case "kiva":
    case "fishbowl":
    case "individual":
    default:
      return overrides["main"] || DEFAULTS["main"];
  }
}


