// Rep Map Alberta — shared territory store.
// GET  /api/data  → whole state (any signed-in user)
// POST /api/data  → one change (users with the "manager" or "admin" Identity role)
import { getStore, connectLambda } from "@netlify/blobs";

const KEY = "state";
const DIVS = ["classic", "resources", "solutions"];
const ID = /^[a-z0-9]{4,32}$/;
const AREA = /^T[0-9][A-Z](-[0-9A-Za-z]{1,12})?$/;   // FSA, or FSA-<sub-area> for split rural codes
const COLOR = /^#[0-9A-Fa-f]{6}$/;
const LIMITS = { teams: 200, reps: 1000 };

const empty = () => ({ teams: {}, reps: {}, claims: { classic: {}, resources: {}, solutions: {} } });
const reply = (body, status = 200) => ({
  statusCode: status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(body),
});
const name = (v) => (typeof v === "string" ? v.trim().slice(0, 40) : "");

function apply(state, b) {
  for (const d of DIVS) state.claims[d] ||= {};
  switch (b.op) {
    case "assign": {
      if (!DIVS.includes(b.div)) return "Unknown division.";
      if (!b.changes || typeof b.changes !== "object") return "No changes sent.";
      const entries = Object.entries(b.changes);
      if (entries.length > 500) return "Too many changes at once.";
      for (const [area, rep] of entries) {
        if (!AREA.test(area)) return `Unknown area ${area}.`;
        if (rep === null) { delete state.claims[b.div][area]; continue; }
        if (typeof rep !== "string" || !state.reps[rep]) return "That rep no longer exists.";
        state.claims[b.div][area] = rep;
      }
      return null;
    }
    case "putTeam": {
      const d = b.data || {};
      if (!ID.test(b.id || "")) return "Bad team id.";
      if (!name(d.name)) return "Team name is required.";
      if (!DIVS.includes(d.division)) return "Unknown division.";
      if (!state.teams[b.id] && Object.keys(state.teams).length >= LIMITS.teams) return "Team limit reached.";
      state.teams[b.id] = { name: name(d.name), division: d.division, color: COLOR.test(d.color) ? d.color : "#425A7D", createdAt: Number(d.createdAt) || Date.now() };
      return null;
    }
    case "delTeam": {
      if (Object.values(state.reps).some((r) => r.teamId === b.id)) return "Remove the team's reps first.";
      delete state.teams[b.id];
      return null;
    }
    case "putRep": {
      const d = b.data || {};
      if (!ID.test(b.id || "")) return "Bad rep id.";
      if (!name(d.name)) return "Rep name is required.";
      if (!state.teams[d.teamId]) return "That team no longer exists.";
      if (!state.reps[b.id] && Object.keys(state.reps).length >= LIMITS.reps) return "Rep limit reached.";
      state.reps[b.id] = { name: name(d.name), teamId: d.teamId, color: COLOR.test(d.color) ? d.color : "#425A7D", createdAt: Number(d.createdAt) || Date.now() };
      return null;
    }
    case "delRep": {
      delete state.reps[b.id];
      for (const d of DIVS) for (const [a, r] of Object.entries(state.claims[d])) if (r === b.id) delete state.claims[d][a];
      return null;
    }
    default:
      return "Unknown operation.";
  }
}

export const handler = async (event, context) => {
  connectLambda(event);
  const user = context.clientContext && context.clientContext.user;
  if (!user) return reply({ error: "Sign in required." }, 401);
  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  const store = getStore({ name: "rep-map", consistency: "strong" });

  if (event.httpMethod === "GET") {
    return reply((await store.get(KEY, { type: "json" })) || empty());
  }
  if (event.httpMethod !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (!roles.includes("manager") && !roles.includes("admin")) return reply({ error: "Only managers can change territories." }, 403);
  if ((event.body || "").length > 100_000) return reply({ error: "Request too large." }, 413);

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply({ error: "Bad request." }, 400); }

  // Read–modify–write with an etag check so two managers editing at once don't overwrite each other.
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await store.getWithMetadata(KEY, { type: "json" });
    const state = (cur && cur.data) || empty();
    const err = apply(state, body);
    if (err) return reply({ error: err }, 400);
    const opts = cur && cur.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const res = await store.setJSON(KEY, state, opts);
    if (res && res.modified === false) continue;   // someone else saved first; retry on fresh data
    return reply(state);
  }
  return reply({ error: "The map is busy. Try again in a moment." }, 409);
};
