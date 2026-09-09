// Pricing for MM Padel Academy — per player, per 1-hour session, in EGP.
export const PRICING = {
  private: {
    name: 'Private Coaching',
    1: 1000,
    4: 3600,
    8: 7000,
  },
  group: {
    name: 'Group Class',
    1: 500,
    4: 1800,
    8: 3500,
  },
}

// Compute the price for a given session type and number of sessions.
// Package pricing only applies at exactly 1, 4, or 8 sessions.
export function calculatePrice(type, sessionCount) {
  const tier = PRICING[type]
  if (!tier) return 0
  if (tier[sessionCount] !== undefined) return tier[sessionCount]
  // For counts not covered by a package, fall back to the per-session rate.
  const count = Math.min(sessionCount, 8)
  if (tier[count] !== undefined) return tier[count] * sessionCount
  return tier[1] * sessionCount
}

export function perSessionRate(type, sessionCount) {
  const tier = PRICING[type]
  if (tier && tier[sessionCount] !== undefined) {
    return tier[sessionCount] / sessionCount
  }
  return tier ? tier[1] : 0
}
