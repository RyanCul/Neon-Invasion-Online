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
- `blender/landmarks.py`: the landmark models (`lm_*`), game space, built round the collision boxes from `shared.js`. Run by `build_assets.py` after `props.py`.
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
- Frame rate, re-measured later on 2026-11-12 with the pane visible (144 Hz screen, level 1, solo): ~129 fps at 662x654; at an emulated 1920x1080 (dpr 1.25) ~70 fps, CPU 6.4 ms median per frame, GPU 11.5 ms, dyn scale 0.91, ~700 draw calls, ~350k tris. 60 fps holds at 1080p on this machine. The dynamic-resolution scaler used to infer a "30 Hz screen" from slow frames and then stop trying for 60; `dynTick` in nx-core.js now never infers below 60 Hz. The figures below are the older hidden or throttled pane reading.
- Older reading: 30 fps, but the pane's detected refresh is 33.3 ms, so 30 is the cap. GPU time 8-9 ms, about 600x450 (dyn scale 0.65), ~270k tris, ~630 draw calls. Not measured on a real 60 Hz display at 1080p.
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

Sound pass, 2026-11-13 (`game.html`, the `audio` section, marked `REMAKE:`):
- Mix bus (`sfxBus`): soft saturation, a high shelf, and a generated 1.3 s room reverb (convolver, wet 0.2) ahead of the compressor. Falls back to the plain bus if any node fails.
- `noise` and `pnoise` now share one cached noise buffer through `nzSrc` (was a new buffer per sound) and take an optional high-pass. `tone` has a 3 ms fade-in to stop clicks. `rv()` gives random pitch variation.
- `sfxShot` and most `sfx` entries are layered (crack, body, low end, tail). Alien voices, the roar, footsteps and engines are unchanged apart from going through the new bus.
- Checked by numbers only: no script errors, the reverb and shaper nodes are created, sounds fire on shooting and reloading. Nobody has listened to it yet. Levels and reverb amount need an ear check.

Frame rate and beach collision, 2026-11-13 (scripts now `?v=6`):
- The game loop is plain `requestAnimationFrame`, so by default it runs at the screen's refresh rate. New setting `FRAME RATE LIMIT (FPS)` in the graphics section of the settings menu: AUTO, 30, 60, 90, 120, 144, 240 (`NIX.fpsCap`, saved in localStorage `ni_fps`; limiter is at the top of `frame()`). AUTO keeps the old behaviour (resolution scaler aims for 60+). A chosen cap makes the scaler aim for that rate (`dynTick` in nx-core.js). A cap cannot exceed the screen's refresh rate.
- Effects that assumed 1/60 s per frame (sailboats, beach spray and skis, ship flashes, embers, a timer near line 1143) now use `FXDT`, the real frame time, so they run at the same speed at any frame rate.
- Beach collision added with `NIX.addSolid`: umbrella poles (r 0.35), coolers, beach balls, sandcastles (centre, four towers, four wall pieces; walls are 1 m high so you can jump on them), volleyball net posts, lifeguard tower legs, tiki torches. About 90 new solids (1486 total). Not yet confirmed in play: the browser pane was hidden, so no frames ran. Re-run: stand 7 m from a sandcastle (beaches are around z 400, e.g. castle near x -269, z 414.6) and sprint at it.
- Not yet measured: the limiter at 30/60/120 (count `__NI.renderer.info.render.frame` over 3 s) and 120 fps on a real 120 Hz+ screen.

Polish pass, 2026-11-13 (all in `game.html`, marked `REMAKE:`). Written without browser testing at the user's request; the user is checking it by hand. Nothing here has been run yet.
- Combat feel: hit and kill crosshair markers pop (CSS animation restarted on every hit, kill spins to an X), a small FOV punch on kills.
- Settings: `FIELD OF VIEW` slider (`SET.fov`, default 78, range 60-110) and `SHOW FPS COUNTER` (top-right readout of fps, resolution, GPU ms) for testing on other PCs.
- First-game hint toast with the basic controls (once, localStorage `ni_tut1`; clear it to see it again).
- Game-over screen: adds Alien Dex and achievement progress and the next skin unlock level.
- Main menu: `DIFFICULTY: NORMAL/HARD` button under PLAY SOLO, same flag as HARD MODE in settings.
- Buttons: soft hover and click sounds, visible keyboard focus ring.
- Multiplayer: connection wait shows a "still connecting" message after 8 s, and a failed connection gets a clear "could not connect" message.
- Mouse lock: `lockUI()` plus a 500 ms check show "CLICK TO RESUME" whenever the pointer lock is lost (skipped for controller, touch, splitscreen and while a panel is open).
- Hardware checklist for the user: turn on SHOW FPS COUNTER, play a few rounds at 1080p on a weaker PC, try FRAME RATE LIMIT at 30/60/120, try quality levels 0-3, and note fps, GPU ms and resolution at the busiest moments (boss rounds, many aliens).

Landmarks, livelier aliens, no pop-in, 2026-11-13 (scripts now `?v=7`):
- **Landmarks are Blender models** (`blender/landmarks.py`, assets `lm_*`, placed by `NIX.landmarkDeco` and friends in `nx-props.js`): the two pyramids (stepped violet stone, neon lip lines, glyph friezes, gold runner, summit obelisks, a crystal inside the old wire frame), the Ferris wheel (wheel, 12 gondolas, tapered pylons with bracing legs, boarding deck), the lighthouse (striped steps, open lookout on four columns, round tower, gallery, lantern room, cap; the beams and light moved up to the lens at y 20.15), the container yard (corrugated containers, stacked ones turned and repainted; wooden crates), the ticket booth and snack bar (kiosk), the clock tower, the crashed UFO.
  - Collision is unchanged: `shared.js` still makes the same boxes and every model sits on them. Player-only solids were added for the pyramid obelisks, the lighthouse columns and the feet of the wheel's bracing legs.
  - Every hook has the old boxes as its fallback. Not remade: drive-in screen and ramps, hedge maze, stage, ballpark, fountain, park, marina.
  - Checked by eye in Blender renders only (one image per landmark, not in game). Checked in game by numbers: all 16 `lm_` meshes are in the scene at the right centres (2 pyramids, 12 containers, 4 crates, 2 kiosks, 12 gondolas), no console or shader errors.
  - NOT checked: how they look in the game's lighting, day and night. Walk to each one. Also check standing on the lighthouse summit between the columns, and that the cache up there is easy to grab.
- **Alien animation** (`NIX.alienAnim` in `nx-models.js`, called from the entity loop in `game.html`): springy scale-in on arrival, bounce and roll in the walk, squash and stretch, lean into the run, banking, breathing and looking around when idle, flinch on damage, dust under heavy ones, feet that lift, and a hop with both arms up every 3.5 to 9.5 s (one in three with a twirl). Flyers bank and wobble. Giants, bosses with pose-tied hit zones (scale over 2.5, Cleopatra) and vehicle riders only breathe. The moonwalker keeps its own body animation. Designs, `aliens.py` and hit zones are untouched.
  - Checked by numbers: 14 aliens of 10 types spawned from the dev panel; body scale, height, lean, twist and roll all change frame to frame, no NaN, no errors. NOT checked by eye. If the hop or bounce makes headshots feel unfair, lower `0.2*amp` (hop) and `0.1*amp` (bounce) in `alienAnim`.
- **Pop-in** (`fadeMat`, `NIX.scatter`, `updScatter` in `nx-core.js`): scattered things no longer switch on and off by cell. Each instance fades by a screen-door dither on its own distance: palms dissolve from the near model to the far one between 71 and 93 m, and palms, lamp posts, lamp glows, roof kit and lane paint dissolve out over the last 16% before their draw limit. The far palm now has six fronds and casts shadows. Lamp posts reach 380 m (was 330). New aliens grow in instead of appearing.
  - `NIX.scatter` draws with a copy of the material it is given; the copy is `group.userData.mat` (the lamp glow uses it for its night colour).
  - Checked by numbers: 4 shader programs carry the fade, no shader errors. NOT checked by eye: whether the dither is visible at the palm swap distance, and whether anything else still pops (tell me what and where).
- **Performance.** r128 disables frustum culling on every `InstancedMesh`, so the "culled" scatter cells were all drawn every frame. Culling is now on, shadow-map drawing of scatter cells is limited to the shadowed area, and near palms use 44 m cells. Same spot, same time after PLAY SOLO, level 1, 1024x768 pane, averaged over 120 consecutive frames (the shadow pass runs every other frame, so single readings of `NIX.info()` mislead):
  - before (the zip from the last pass): 745 draw calls (848 on shadow frames), 430k triangles (530k).
  - after: 658 (785), 421k (559k). 46 batch chunks, `unbatched` 20, state 2 in both.
  - Quality levels 0 to 3 all run without errors (485 / 612 / 831 / 900 calls).
  - NOT measured: frame rate and GPU time. The browser pane was hidden, which caps it at 30 fps and makes `gpuMs` jump between 7 and 14 for an unchanged scene. Measure with SHOW FPS COUNTER on a visible window. Looking from a map corner across the whole city is the heaviest view.
- Temporary test code (`NIX._scat`, a `baseline` server entry in `.claude/launch.json`) was added and removed in this task.

Colour, new models, beach, cars, buildings, casino, 2026-11-14 (scripts now `?v=8`):
- Base: this folder. The live web build's URL was not found on this machine; the portfolio copy was older (no `landmarks.py`), so this folder was taken as newest. Confirm nothing newer exists online.
- **Lighthouse** (`landmarks.py`): steps banded violet/red/white/teal/pink/gold with a neon line under every lip, coloured window glow, teal and pink columns with glowing rings, a banded tower with pink and cyan neon rings, gold gallery, violet/pink roof, a door canopy, pennant and beacon. Same geometry footprint.
- **Container yard**: three colourways added on top of the tinted shell (`lm_container_deco0-2` lit, `lm_container_glow0-2` neon), chosen per container by position. Three crate looks (`lm_crate`, `lm_crate1`, `lm_crate2`, plus `lm_crate_glow0-2`).
- **New file `blender/landmarks2.py`**: `lm_fountain_body/_glow` (checker deck, gold and neon rings, four lamp pillars, dolphins on the tier, fluted column, floating crystal), `lm_hedge_body/_glow` (one leafy wall piece, turned for z-walls; flowers, uplights, gold-capped end posts), `lm_maze_arch_body/_glow` (gate over the south gap), `lm_slot_body/_detail/_glow`, `lm_roulette_body/_detail/_glow`, `lm_roulwheel_body/_detail/_glow` (turning part), `lm_bj_body/_detail/_glow` (blackjack table + stools). All built round the shared.js boxes. New player solids: fountain lamp pillars (r 0.55) and dolphins (r 0.4).
- **New file `blender/beach.py`**: `bch_umb_pole/_top` (tinted), `bch_lounger_*`, `bch_towel`, `bch_torch_*`, `bch_cooler_*`, `bch_ball`, `bch_star`, `bch_shell`, `bch_surf_*`, `bch_castle_*`, `bch_net_*`, `bch_tower_*`. Placed through `NIX.beach.*` in `buildBeach`, every call with the old boxes as fallback. New dressing (no collision): a lounger by every second towel, surfboard clusters, shells along the waterline (own random stream, so old prop positions are unchanged).
- **Water** (`WATER_FS`): sandy-aqua and turquoise depth bands that follow the time-of-day colour, moving caustics in the shallows, sun glow through swells, a faint pink/cyan sheen at night, lacy foam streaks and bubbles. **Sand** (`patchSand`): dune-bent ripples, warm and pale patches, sun-catching glints near the camera.
- **Cars**: `props.py` `wheel()` now records wheels during `veh()`, and each wheeled vehicle exports `carN_wheels` (one axle model, meta `ax` = [y, z] per axle, `r` = radius). `NIX.carModel` hangs them on pivots; `NIX.carAnim` (nx-props.js) spins them by speed, steers the front axle, and gives cars, the truck and the hovercar a damped-spring squat, dive and roll. Called from the car loop in `game.html`; remote cars use their networked speed and turn rate. Handling (`updateCarDrive`, client only, top speed and acceleration unchanged): quicker throttle press, steering centres faster when released or reversed, grip returns sooner after a drift once the wheel is straight, a little more turn-in while braking, sparks + thud + shake on a wall hit. Chase camera pulls back up to 13% with speed and looks slightly into the turn.
- **Buildings**: facade shader paints bay joints and lit piers, window sills with a shadow under them, three wall finishes, a striped awning band in the building's neon on the shop floor, and thin neon joint lines on about 4 faces in 10 (bright at night). `dressBuilding` adds corner piers (mid-rise), a corner penthouse on some mid-rise roofs (kept off the roof centre where caches sit), a neon belt on towers over 38 m, and vertical blade signs on about 30% of buildings over 16 m.
- **Casino**: Blender slot machines, roulette table and turning wheel, blackjack tables. Screens: reels blur and roll and bump as each stops, the cabinet flashes gold on a win and dims on a loss, the roulette ball whirls and lands with a bounce (CSS block after `REMAKE: one UI language`; off under reduced motion). Payouts and rules are untouched.
- Checked by numbers (browser pane visible, solo, level 1, 662x654): no script or shader errors (only the known `/07.mp3` 404), all new assets present, 60 fps (screen cap), GPU 8.3 ms, 381 draw calls and 296k triangles at spawn, 43 batch chunks, state 2, 46 unbatched (the casino and beach-bar animated bulbs, plus 2 new meshes). Quality 0-3: 373 / 497 / 727 / 835 calls, 288k / 442k / 669k / 742k tris, GPU 8 / 8.3 / 15 / 21 ms (taken a few seconds apart while the scene changed, so only a rough comparison with the 2026-11-13 figures). `NIX.carAnim` checked on vehicles 0-5: right axle counts, front axle found, spin, dive and roll change, no NaN. Blender build: `30 enemy designs`, no Traceback; contact sheet looked at, no inside-out models.
- NOT checked: everything by eye in the game (lighthouse and yard colours day and night, fountain, maze and gate, casino interior and its two screens, beach props, water and sand, facade relief, penthouses and blade signs); driving feel (needs hands on the keys); whether the maze gate sits exactly on the gap for every map seed; frame rate at 1080p on a real 60 Hz screen.

Follow-up, 2026-11-14 (scripts now `?v=9`):
- Kill-streak word for 8+ kills: GODLIKE is now LEGENDARY (`names` in the streak code, `game.html`).
- Grey landmark/prop models recoloured in Blender: UFO hull mint and violet with a plum trim (`lm_ufo`), Ferris wheel frame candy pink with a violet hub (`lm_wheel`, `lm_wheel_support`), rooftop kit teal units with violet pipes and plum bases (`roof_*`, every building roof), armory racks teal, forge iron dark plum. Models that look white in the contact sheet but are tinted in the game (loot, containers, gondolas, kiosk trim, vehicle bodies) were left alone.
- Checked: Blender build `30 enemy designs`, no Traceback, triangle count unchanged (213,772); game loads with no script errors (only the known music `/NN.mp3` 404s, which fall back to `/radio/`); contact sheet looked at. Frame rate not re-measured (the pane was hidden), but the change is vertex colour only. NOT checked by eye in the game.

Stabilization & Revert Pass, 2026-11-14:
- Reverted all unstable, glitch-prone experimental changes from the recent turns:
  - Removed artificial interior floor slabs from `walls(bt, H, col)` in `game.html` (which previously sat at y=0.48/0.50 and caused violent z-fighting and flashing against shop floors). Restored clean original perimeter walls and trims.
  - Removed the 24 distance billboard fog planes (`distFogGroup`, `distFogPlanes`, `buildDistanceFog`, `updateDistanceFog`), restoring clean rendering and distance view without billboard artifacts or frame hitching.
  - Restored `scene.fog` back to `(0xff8f7a, 60, 650)`.
  - Removed experimental shoreline tiki torch animation loops and extra shop point lights (`fillLt`).
  - Restored `shared.js` bounds to `HALF+92`, maze boxes to `0x1fa84f`, and lighthouse boxes to `0xff2a3c:0xf4f4ff`.
  - In `nx/nx-core.js`: fixed facade window shader: restored warm, cohesive architectural interior window lighting (removed wild hot-pink/electric-cyan flickering), eliminated fluorescent strobe flicker (`flick = 1.0`), fixed `vec3 rd` compiler crash, and removed derivative noise on window glass and road asphalt to eliminate sparkling artifacts.
  - Restored `nx/nx-props.js` landmark materials to clean baseline without emissive color conflicts.
  - Synchronized all updated files to `dist\NeonInvasion-win32-x64\resources\app\`.
- Tested in `dist\NeonInvasion-win32-x64\NeonInvasion.exe` via DevTools CDP:
  - `NIX.ready: true`
  - Solid 60.0 FPS locked (16.65 ms average frame time, 0 lag spikes over 33ms).
  - 0 console or runtime errors, 0 WebGL errors.

Not started:
- Handcrafted presentation pass (menu, HUD, titles, UI typography, intentional visual choices).
- Gameplay feel changes beyond what the original has.
- Quality settings in the options menu.
- (Done 2026-11-13: both debug handles, `window.__NI` and `window.__ni`, are removed. Browser-pane test scripts that used `__NI.dbg` no longer work; use a temporary local patch if you need one again.)
- Keybind remapping. Keys are read directly as `keys.KeyX` all through the input code, so it is a larger job than the other options. The controls are listed in the settings menu text.
- Packaging a single zip (`NeonInvasion-Remake.zip`).

## Decisions

- Keep the original game logic and server-side hit zones. Godzilla's `godzSpheres` and the Cleopatra snake positions must still match the models.
- Use Blender for every asset. Procedural code in the browser only handles animation and effects.
- Keep the file-protocol-free setup: `nx-assets.js` is a plain script, so the game still runs from a local server or by opening `game.html` with the assets alongside.

## Known issues

- The shader log for `patchFoliage` and `patch` helpers is verbose on failure. Use `read_console_messages` with a pattern.
- `DYN` in `nx-core.js` changes resolution at runtime. Startup warms up for 4 seconds (`DYN.warm`).
- Enemy `o.bm` uses a setter stub for the Overmind glow. Keep it in sync if `makeAlien` changes.
