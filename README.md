# Rep Map Alberta

Sales territory map for central Alberta, from Red Deer north to just south of Grande Prairie. Managers claim postal codes (FSAs) for reps and teams on three division layers: Classic, Resources and Solutions. Everyone signed in sees the same map.

## How it works

- `public/index.html` is the whole app: map, controls and postal-code boundaries (Statistics Canada 2021 FSA boundary file, simplified and embedded).
- Postal codes over 1,000 km² (T0A, T0B, T0C, T0E, T0G, T0H, T7E, T7S and others) are split into Alberta Township System blocks (Twp-Rge-W4/W5/W6). The grid is calculated, so lines can sit a few hundred metres off the surveyed roads.
- Claim one area by clicking, many by holding Shift and dragging, or a whole rectangle with the Box tool (hold Alt to release).
- `netlify/functions/data.mjs` stores teams, reps and claims in Netlify Blobs and serves them at `/api/data`.
- Netlify Identity handles sign-in. Any signed-in user can view. Only users with the `manager` (or `admin`) role can make changes; the function enforces this, not just the page.
- Open pages refresh every 15 seconds and whenever the tab comes back into focus.

## Netlify setup (one time)

1. **Add new project → Import from Git**, pick this repo. No build command; publish directory and functions come from `netlify.toml`.
2. **Project configuration → Identity → Enable Identity.**
3. Under Identity **Registration**, set it to **Invite only** so strangers can't sign up.
4. **Invite users** from the Identity tab (yourself first).
5. For each manager, open their user in the Identity tab, edit **Roles**, and add `manager`. Reps get no role and can view only.
6. Sign in on the site. The first change you make creates the data store.

## Data

Everything lives in one Blobs entry (`rep-map` store, key `state`):

```json
{
  "teams":  { "<id>": { "name": "", "division": "classic|resources|solutions", "color": "#425A7D" } },
  "reps":   { "<id>": { "name": "", "teamId": "<team id>", "color": "#2F6FDB" } },
  "claims": { "classic": { "T5S": "<rep id>" }, "resources": {}, "solutions": {} }
}
```

Use **Download CSV** in the app for a spreadsheet copy of every claim.

## Updating the boundaries

The map data is embedded in `public/index.html` as `<script type="application/json" id="fsa-data">`. Area keys are FSA codes (`T5S`) or, for split rural codes, `FSA-<sub-area>` (`T0E-4813012`).
