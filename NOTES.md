# Neon Invasion remake: working notes

Read this first when starting a new session. It records the current state so nothing needs re-deriving.

## Working rules (usage)

- **No screenshots.** Verify with numeric checks: `NIX.info()`, `NIX.gpuMs`, draw calls, positions, and `read_console_messages` with a `pattern` and a small `limit`.
- **Batch tool calls.** One browser batch per test, not one call per action. Reload the game only when the code has changed.
- **Targeted reads and edits.** `Grep` first, then `Read` with `offset` and `limit`. Use `Edit`, not `Write`, for changes to existing files.
- **Do not touch the aliens.** Leave `aliens.py`, `makeAlien`, the `a*` assets and the Dex alien data as they are unless asked.

### Instructions for Sonnet and Haiku (mechanical work)

Hand these to a subagent with `model: "sonnet"` or `model: "haiku"`. Give it exact file paths and a definition of done. It does not know this conversation.

- **Blender build (Haiku or Sonnet).** Run the build command in "Rebuild the assets". Report the last 15 lines of output, any `Traceback`, and whether `enemy designs: 30 of 30` appears. Do not edit any file.
- **Packaging (Haiku).** Zip `NeonInvasion-Remake` into `NeonInvasion-Remake.zip` in the scratch folder, excluding nothing. Report the file count and size.
- **Console and error check (Haiku).** Load `http://localhost:8642/game.html`, click PLAY SOLO, wait 8 seconds, then read console errors with `onlyErrors: true` and a `limit` of 20. Report errors verbatim, truncated to 200 characters each. Take no screenshots.
- **Stat report (Haiku).** Run `JSON.stringify(NIX.info())` and report `calls`, `tris`, `fps`, `gpuMs`, `scale` and `res`.
- **Search and audit (Sonnet).** For example: "list every `NIX.addSolid` call and its line number in `game.html`", or "find every `REMAKE:` comment and list the file and line". Report a table. Do not change code.
- **Documentation (Sonnet).** Update `NOTES.md` from the files on disk, without changing code.

Keep these on Fable: rendering and shader changes, gameplay decisions, and anything that needs judgement about what looks right.

## Layout

- `../original/`: untouched copy of the itch.io build (`game.html`, `shared.js`, `three.min.js`, `index.html`, `radio/*.mp3`). Do not edit.
- `game.html`: the game page. Hooks into the `nx/` files are marked with `REMAKE:` comments.
- `shared.js`: game rules and simulation (shared with the Node server). Unchanged so far.
- `three.min.js`: three.js r128. Unchanged.
- `nx/nx-core.js`: render core. HDR buffer, bloom, light shafts, filmic tone curve, sun shadows (custom PCF), procedural sky with clouds and stars, GPU ocean, facade shader for windows, automatic static batching, GPU particles, dynamic resolution, quality presets (`NIX.setQuality(0..3)`), first-person weapon scene.
- `nx/nx-models.js`: first-person weapon animation (`NIX.vmAnim`), shop gun preview, `NIX.makeAlien` (the 30 enemy designs), mutation tint, street lamps, solid obstacles (`NIX.addSolid`, `NIX.pushSolids`).
- `nx/nx-assets.js`: GENERATED. Do not hand-edit. Contains base64 geometry for guns, palms, lamps, and all 30 enemies.
- `blender/build_assets.py`: builds every model and writes `nx/nx-assets.js`, `blender/neon_invasion_assets.blend`, and contact-sheet PNGs.
- `blender/aliens.py`: the enemy designs, run by `build_assets.py`.
- `blender/props.py`: vehicles (`car0`..`car8`, each `_body/_detail/_trim/_lights`), shop stations (`st_*`), station icons (`ico_*`), mystery box, loot crates, rooftop kit (`roof_*`). Written in game space (front = +z) through the `g*` wrappers. Run by `build_assets.py`.
- `nx/nx-props.js`: world dressing. Shared Lambert sheen (patches `ShaderLib.lambert`; materials with `defines.NX_PLAIN` opt out, which the aliens do), `NIX.cbox` chamfered box, `NIX.station / carModel / mbox / lootMesh`, and building trim (`NIX.dressBuilding / dressRoof / dressWall / dressLintel / dressProp / dressSign / dressDone`). Every hook in `game.html` falls back to the old boxes if the asset is missing.
- UI: one override block at the end of the `<style>` in `game.html` ("REMAKE: one UI language"). CSS only; no ids, layout or JS changed. Fonts: Chakra Petch (text), Orbitron (numbers, headings), from Google Fonts with local fallbacks.

## Rebuild the assets

```
"C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe" --background --factory-startup --python blender\build_assets.py -- nx\nx-assets.js blender\neon_invasion_assets.blend ..\preview_assets.png
```

Expect `enemy designs: 30 of 30` in the output. Takes about 1 minute.

## Local preview

`.claude/launch.json` in the scratch folder defines `original` (port 8641) and `remake` (port 8642), both served by Blender's bundled Python `http.server`. Start with `preview_start`.

## Status

Done:
- Render pipeline and quality presets (`NIX.setQuality`). No settings UI yet, so the level comes from `detectLevel()` or `localStorage ni_gfx`.
- Static batching: city meshes merge into about 46 chunks after 40 frames. Watch for `unbatched` counts in `NIX.info()`.
- Palms and lane paint are split into city cells for culling. Palms use a near and far model.
- All 30 enemy types have new Blender designs, wired through `makeAlien`. Contact sheets reviewed: distinct silhouettes. Mutation tint is implemented.
- Shop gun preview uses the Blender gun models.
- Palm trunks and lamp posts are solid for on-foot movement (`NIX.pushSolids` in `updateFoot`).

Applied in the last edit but NOT yet tested in the game:
- Weapon viewmodel brightness (`bc` body colour) and an extra fill light on the viewmodel.
- Round taglines (`RLINES` in `game.html`, shown at round start).
- Graphics settings block in the options menu (quality, auto resolution, neon glow, retro pixel mode), saved under `ni_gfx`.
- Scaler ignores frames over 150 ms and while the tab is hidden.
- Script version bumped to `?v=4`.

Verified 2026-11-12 (browser pane, solo game, level 1):
- Palm collision: sprinting head-on into a trunk stopped the player cleanly (x -52 to -55.31, no pass-through). 1395 solids registered. Diagonal sliding not tested.
- Frame rate: 30 fps, but the pane's detected refresh is 33.3 ms, so 30 is the cap. GPU time 8-9 ms, about 600x450 (dyn scale 0.65), ~270k tris, ~630 draw calls. Not measured on a real 60 Hz display at 1080p.
- First-person weapon: renders correctly while walking and firing. No console errors except a harmless 404 for /07.mp3 (falls back to /radio/07.mp3).
- Alien Dex opens and lists 37 slots. Not inspected further; the alien designs are not being redone.

Visual pass, 2026-11-12 (script version `?v=5`):
- Done: vehicles, stations, buff tower, mystery box, loot crates, building trim and rooftop kit, cover blocks, shared prop sheen, UI restyle.
- Checked by numbers only (no screenshots, at the user's request): no console or shader errors, GL error 0, all 9 vehicles build with all 11 skins, 60 fps, GPU 6-9 ms, 754 draw calls (was 721), 46 batch chunks.
- NOT checked by eye: how any of it looks. Review in game: stations at spawn, a car from the garage, rooftops, the shop menu, pause and settings screens.
- Rooftop trim is visual only, so a player standing on a roof can walk through parapets and roof kit.
- `NeonInvasion-Remake.zip` was rebuilt after this pass (37 files, 31.4 MB, no `.blend1`). It was zipped just before this line was edited, so its copy of NOTES.md still says the zip needs rebuilding.
- `__NI.dbg.makeCar(type,skin)` was added to the debug handle for testing; remove it with the rest of the handle.
- The preview server caches hard: after edits, `fetch(url,{cache:'reload'})` then reload.

Old unverified list (superseded by the above):
- Palm collision in play. The code runs, but the player was not tested walking into a trunk. Cars and the gunship ignore solids.
- Alien Dex (`DEX` in `game.html`) shows the new designs via `dexModel`, which uses `makeAlien`. Only the pre-existing code path was checked, not the rendered dex.
- Frame rate. Earlier measurements were 33–50 ms p90 at 1024×768 with the old pipeline. Batching and dynamic resolution were added after that, and the latest figure was 76 fps at scale 0.5. Not measured at 1080p. Check on the target machine.
- First-person weapon models in motion. The `vmAnim` rig and the new viewmodel scene have only been checked for correct placement.

Not started:
- Handcrafted presentation pass (menu, HUD, titles, UI typography, intentional visual choices).
- Gameplay feel changes beyond what the original has.
- Quality settings in the options menu.
- Removing the debug handle (`window.__NI.dbg` near `const keys={}`) and the `__NI` window export.
- Packaging a single zip (`NeonInvasion-Remake.zip`).

## Decisions

- Keep the original game logic and server-side hit zones. Godzilla's `godzSpheres` and the Cleopatra snake positions must still match the models.
- Use Blender for every asset. Procedural code in the browser only handles animation and effects.
- Keep the file-protocol-free setup: `nx-assets.js` is a plain script, so the game still runs from a local server or by opening `game.html` with the assets alongside.

## Known issues

- The shader log for `patchFoliage` and `patch` helpers is verbose on failure. Use `read_console_messages` with a pattern.
- `DYN` in `nx-core.js` changes resolution at runtime. Startup warms up for 4 seconds (`DYN.warm`).
- Enemy `o.bm` uses a setter stub for the Overmind glow. Keep it in sync if `makeAlien` changes.
