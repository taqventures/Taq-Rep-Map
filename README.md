# Rep Map Alberta

Sales territory map for central Alberta, from Red Deer north to just south of Grande Prairie. Managers claim postal codes (FSAs) for reps and teams on three division layers: Classic, Resources and Solutions. Everyone signed in sees the same map.

## How it works

- `public/index.html` is the whole app: map, controls and postal-code boundaries (Statistics Canada 2021 FSA boundary file, simplified and embedded).
- Rural postal codes (T0A, T0B, T0C, T0E, T0G, T0H, T0M…) are split into their full postal codes, one area per community (e.g. T0E 1N0 Mayerthorpe), drawn around GeoNames postal code locations and trimmed to the StatCan FSA boundary. The lines between full codes inside a rural FSA are approximate.
- Claim one area by clicking, many by holding Shift and dragging, or a whole rectangle with the Box tool (hold Alt to release). "Claim all of T0E" on an area's card takes the whole rural code.
- `netlify/functions/data.mjs` stores teams, reps and claims in Netlify Blobs and serves them at `/api/data`.
- Netlify Identity handles sign-in. Any signed-in user can view. Only users with the `manager` (or `admin`) role can make changes; the function enforces this, not just the page.
- Open pages refresh every 15 seconds and whenever the tab comes back into focus.
- The map uses Web Mercator, the same projection as Google Maps, with a live scale bar.

## Netlify setup (one time)

1. **Add new project → Import from Git**, pick this repo. No build command; publish directory and functions come from `netlify.toml`.
2. **Project configuration → Identity → Enable Identity.**
3. Under Identity **Registration**, set it to **Invite only** so strangers can't sign up.
4. **Invite users** from the Identity tab (yourself first).
5. Give managers edit access, either way works:
   - In the Identity tab, open the user, edit **Roles** and add `manager`, or
   - In **Project configuration → Environment variables**, add `MANAGER_EMAILS` with a comma-separated list (e.g. `tanner@taqventures.com, someone@herc.com`), then redeploy.
   Everyone else can view only. After a role change, the person signs out and back in.
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

The map data is embedded in `public/index.html` as `<script type="application/json" id="fsa-data">`. Area keys are FSA codes (`T5S`) or, for rural full codes, `FSA-<code>` (`T0E-0A2`). Postal code locations: GeoNames (CC BY 4.0).
