# NEON INVASION
Co-op alien-wave FPS in the neon 80s city. Rounds get harder, a boss alien every 5 rounds.
Earn cash per kill, buy colored laser guns, upgrade them at the NEON FORGE, buy armed cars at the GARAGE.

## Play solo (no server)
Open index.html in a browser (keep shared.js and song.mp3 beside it) and click PLAY SOLO.

## Play online with friends
1. Install Node.js (nodejs.org), open this folder in VS Code's terminal.
2. `npm install` then `node server.js`
3. Open http://localhost:8080 -> CREATE / JOIN ROOM. Leave the room code blank to make a room;
   friends enter the same code. Friends on your Wi-Fi use http://YOUR-IP:8080.
4. Friends across the internet: deploy this folder to Render / Railway / Fly.io (Node web service,
   start command `node server.js`) and share the URL. Netlify can host index.html + shared.js
   but NOT server.js; paste your server's wss://... address into the server box in the menu.

## Controls
WASD move, SHIFT sprint, SPACE jump, mouse aim, click fire, R reload, 1-5 / wheel weapons,
Y return to base between rounds, E use (buy / enter car / hold to revive), Q cycle shop item, V car camera, N day/night, M radio, P graphics.

## New in this version
- Boss alien every 5 rounds.
- Buy a JETPACK at the Garage ($2500): hold SPACE to fly, C to hover, R reloads AND refuels (10 seconds of fuel).
- Enter buildings (ROLLER RINK, ARCADE, ...) through their doors: counters to jump on, loot crates inside.
- Loot: yellow crates = cash / ammo / health; glowing purple rare caches (inside buildings, on tall rooftops, on the beach) = big cash + full ammo + full health. Everything restocks each round.
- Camera raised to a taller eye height.
- Online rooms: the game only resets when EVERYONE is down; fallen players come back at the start of the next round; online rounds have 1.5x as many aliens.
- Far-away alien nests (green arrows on the minimap) pay 50% bonus cash.

## Alien types (12)
Grunt, Drone, Spitter, Charger (r4), Brute (r5), Bomber (r6, explodes), Armored (r7), Medic (r8, heals others),
Warship (r9, flying shooter), Queen (r11, 3-orb volleys), Titan (r13, mini-boss) + Boss every 5 rounds.

## Levels, skins, leaderboard, sky
- **Levels & skins**: you earn XP every game (more for every round you clear); it is added at game over and saved in your browser (localStorage), so it survives closing the game. It is per browser/per web address and is erased if you clear site data. Press **K** (or the menu button) to open the locker and equip gun skins.
- **Online leaderboard**: type your name on the menu (required for online). When your crew goes down (or you leave), the rounds you survived are posted to the board. View it from the menu ("ONLINE LEADERBOARD") or on the game-over screen. Names are limited to 12 characters and run through a basic profanity filter.
  - The board is saved to `leaderboard.json`. Render's free tier wipes local files on restart/redeploy, so for a permanent board create a free Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Render's environment variables.
- **Sky**: every 10 rounds the sky, fog and lighting shift to a more intense palette (toxic green, blood red, electric storm, crimson void, meltdown).
- **Controller**: plug in or pair any standard gamepad (Xbox/PlayStation/Switch Pro) and press a button. Left stick move/steer, right stick look, RT fire, LT reload/refuel, A jump / jetpack up, B hover, X use/revive, Y or D-pad up go to base, LB/RB switch weapon, L3 sprint, D-pad left shop / right car cam, Start or D-pad down skins. Press A on the menu to start a solo game.
- **Cars are ram-only**: no guns - hold RT (or A) to accelerate, LT (or B) to brake/reverse, steer with the left stick, L3 handbrake. Run aliens over to kill them, but aliens can still shoot you.
- **Godzilla alien**: every 20 rounds a building-sized Godzilla alien walks straight through the city (it ignores buildings), with a huge health bar, a stomp shockwave and a fan of fireballs.
- **Garage** (walk up to it, Q or D-pad left cycles, E buys) lists everything, cheapest first: Neon Segway $500, Drift Motorcycle $1,000, Flamingo Coupe $1,500, Jetpack $2,500, Cyan Muscle $3,500, Sunset Hyper $6,000, Monster Truck $9,000, Void Hovercar $14,000. Vehicles are slower and smoother now; speed is shown in MPH.
- **Car designs**: level-ups also unlock car paint jobs (stripes, spoilers, flames, wings, underglow, rainbow). Equip them in the locker (K); they apply to vehicles you buy after equipping.
- **Alien sounds**: each alien type has its own growl/screech/buzz, panned left/right and getting louder as it closes in, plus a heartbeat when several are on top of you and ground-shaking footsteps from the Godzilla alien.
- **Garage menu controls**: Up/Down arrow keys or the left stick (also D-pad up/down) pick an item, E or X buys it, B closes the menu (press E/X to reopen). The segway and motorcycle now show your character riding them, in your colour.
- **Aliens in view**: when an alien comes into sight (on screen with a clear line, not behind a building) you hear a "contact" sting plus its own voice, a low tension drone plays while any are visible, and a CONTACT warning flashes (bosses and the Godzilla alien get a bigger horn and their own warning).

## Weapons, armory & upgrades
11 laser guns, every one with **9 upgrades** (MK I → MK X: more damage, bigger mags, brighter laser). Buy and upgrade from the **ARMORY** list menu (Up/Down or Q to choose, E / X to buy or upgrade, B closes). The Forge still upgrades your current gun. "Refill all ammo" is in the armory too.
New guns: **LONGSHOT** (slow, long-range sniper – hold right-click / LT to scope), **ARC GATLING** (hold fire to charge, then it sprays), **NEON STARS** (thrown shuriken), **INFERNO** (flamethrower, sets aliens on fire), **TOXIC SPRAYER** (gas canister, poison cloud), **BRASS KNUCKLES** (close range, no ammo).
Switching: keys 1-9, 0, - · mouse wheel · LB/RB · **F = quick-swap to your previous weapon; on a pad LB/RB (the bumpers) cycle weapons**. Right-click / LT = aim. On a pad, X = interact (or reload if nothing nearby); Y = E (use/enter/exit/buy) when something is in reach, otherwise Y (and D-pad up) sends you back to the starting area between rounds.

## Helicopter
Garage item #8, **$30,000**. WASD fly, mouse aims, Space up, C/Shift down, click / RT fires miniguns. Land (below ~3 height) to exit. Pad: LS move, RS aim, A up, B down, RT fire.

## New aliens
- **KNIFER** (from round 8): faster than the red one.
- **HOUND** alien-dog (from round 11): very fast, bites, comes in packs of 3.
- **THE STALKER** (rounds 6, 10, 14, …): hides inside a building; check the minimap and hunt him down. Wakes up when you get close, then chases fast.
- **ROOFTOP SNIPER** (from round 16): stays on roofs; a red aim beam warns you before every shot – break line of sight.

## Death
When your crew is overrun you see the summary, then return to the **main menu** (button / Enter / pad A, or automatically after 9 s).

## Fullscreen
Press **G** (or the controller BACK/SELECT button) any time to toggle fullscreen, or use the button on the main menu. Esc also exits.

Early rounds: aliens spawn much closer and faster in rounds 1-7, easing back to the normal distance by round 8.

## Online waiting room
After you create/join an online room you land in a **waiting room** showing the room code and who has joined. The host (first player in) presses **Space / A / the START GAME button** when everyone is in; guests see "waiting for the host". Players who join after the start drop in like before.

## The Overmind (round 50)
On **round 50** (and every 50 after) the ultimate boss arrives alongside a normal boss: **THE OVERMIND**, a building-sized brain alien with 150,000+ health (scales with rounds and players). It fires a wide 9-orb barrage, stomps, and every ~13 seconds **summons a swarm of 7 aliens** around itself. Killing it pays $60,000.

## More buildings, stalker marker, alien shark
- About **22 enterable buildings** now (was 8), each with loot inside and counters. Pink triangles on the minimap = a door you can walk into. The stalker hides in any of them.
- The **stalker** is a big skull on the minimap: **yellow while hiding, red once he's hunting you** (an arrow on the edge of the map points to him when he's far away).
- **ALIEN SHARK** every 13 rounds (13, 26, 39...): a land shark that prowls the beach and lunges at anyone who steps onto the sand. It must be killed for the round to end ($6,000 payout). Cyan dot on the minimap.

## Perks, secrets, weather and more (latest update)

**Perks** (now their own PERK TOWER in the fourth corner of the starting plaza, opposite the armory's diagonal; one-time purchase, kept until you die/restart): Neon Tank (+50 max HP), Quick Revive, Fast Hands (faster reload), Sprinter, Dead Eye (bigger crit damage), Cash Magnet (+25% cash), Kevlar, Double Tap, plus the others listed in the armory. Owned perks show on the HUD.

**Weak spots**: shots to the head do double damage (giants/bosses have a smaller, bigger-damage weak spot). Crits show as yellow damage numbers.

**Mutated aliens** (round 9+): volatile (explodes on death), armored (tanky, slower), swift (fast, fragile). Mutants pay triple cash.

**Weather** (never before round 9, ~45% of rounds after): acid rain (hurts you outside; get in a building or car), blackout, lightning storm (run from the red circles).

**Interactive map**: jump pads at the intersections; vending machines inside buildings (full heal for $250).

**Secret**: 3 hidden NEON TAPES (far beach, tallest roof, inside a building). Find all three for $25,000 and a full heal for everyone. A rumor appears at round 4.

**Spectate**: when dead, watch teammates (arrow keys / LB-RB / click to switch).

**Rematch lobby** (online): after game over everyone returns to the waiting room for a rematch. Solo still returns to the menu.

**Feedback**: damage numbers, kill streak call-outs, screen shake, hit markers.

**Settings / accessibility** (menu button or O): music/SFX volume, mouse sensitivity, reduce screen shake, reduce flashes, damage numbers on/off, colorblind-friendly map colors, large HUD text. Key rebinding is not included yet.

**Pause (solo)**: PAUSE button top-right, TAB / Pause key, or controller START. Resume, Settings or Quit to Menu. Online games cannot pause.

**Solo scores count**: when a solo run ends, the browser posts name/rounds/kills to the server's `/score` endpoint (needs the server address on the menu to be reachable). The server rejects absurd values and rate-limits to 10 posts/min per IP, but solo scores can't be fully verified.

## City districts, landmarks and more perks

**Districts** (a toast tells you when you cross into one, and each has its own colours): Downtown (center), Arts Quarter (west, pink/purple), Industrial Zone (east, steel grey), Harbor (south, pastel boardwalk), Neon Strip (north, every building has a glowing sign). Street lamps at every corner.

**Landmarks** (green diamonds on the minimap; each has loot): The Neon Pyramid (climbable stepped pyramid, rare crate on top), Crystal Wheel (spinning Ferris wheel), Hedge Maze (rare crate in the middle, entrance faces south), Neon Drive-In (giant screen and parked cars), Clock Plaza (fountain, clock tower with a rooftop crate), Container Yard (stacks you can climb using the crates), plus park attractions: Mirror Lake, Amphitheater, and a Crash Site with a crashed UFO.

**Perks**: Neon Tank now has 4 tiers (+50 max health each, +200 total) and Sprinter has 4 tiers (+18%, then +12% three times). Higher tiers unlock after the previous one.

**Early rounds**: rounds 1-5 never have more than one red blade-wielder (charger/knifer); round 3 always has exactly one.

## Menu and driving update

**Main menu**: level + LOCKER in the top-left; SETTINGS and HOW TO PLAY boxes in the top-right (fullscreen now lives inside Settings); new subtitle; bigger PLAY SOLO and CREATE / JOIN ROOM buttons. The server address box is hidden: the game uses its own server automatically (or `wss://neon-invasion-online.onrender.com` when hosted on Netlify/GitHub Pages; edit that URL in `index.html` if your Render address differs).

**Driving**: mouse / right stick orbits the camera around the car (it re-centers after ~1.5s, and gun cars shoot where the camera points). Steering is stronger and the car drifts a little through hard turns at speed, with tyre smoke and squeal; SHIFT is a handbrake drift.

**Latest**: the menu is one centered column under the title (level bar + Locker, name, Play Solo, co-op, then Leaderboard / Settings / How to Play). The bottom controls strip is gone: press TAB (or the MENU button / controller START) for the pause menu, which has Resume, Controls, Settings and Quit. In co-op the same menu opens but the game keeps running (your character just stands still while it is open). Minimap is bigger. The crash-site UFO is now a flat saucer with round invisible steps, so you can climb onto it.

### Latest: tilted UFO + free car respawns
- The crashed UFO lies tilted on its side again. Its top is a real sloped surface (`SAUC` in shared.js): walk up the low side and stand on it; you can pass under the raised side.
- Cars bought at the garage are yours until you die: re-select them in the garage menu (shown as "OWNED - FREE") to spawn another for $0. Ownership resets on death and on a new game.

### Latest: jetpack tank upgrades + taller buildings
- The jetpack now starts with 4s of fuel. A garage entry "JETPACK FUEL +2s" upgrades it three times ($1,500 / $3,000 / $5,000) up to 10s. Resets on death/new game.
- Enterable buildings are now 20-23 tall (were 11-13).

### Latest: minimap arrows, readable shop menus, safer spawns
- Minimap: every awake alien that is off the map now gets a green edge arrow (merged by direction). The pink building arrows are gone.
- Armory / Perk Tower / Garage menus: bigger, higher-contrast text in a fixed-size panel (8 visible rows, fixed-height description) so the box no longer resizes as you scroll.
- Aliens spawn at least 44 units away in round 1, rising to 62 by round 6 (was 30), and early rounds spawn closer, so round starts don't drop a mob on top of you.

### Latest: wave warning, hit arcs, mystery box, boss attacks, spectator cams, stats
- **Wave warning:** the last 3 seconds before a round show "WAVE INCOMING" with a countdown and red arrows pointing to the side(s) aliens will spawn from (most of the wave comes from there; 2 sides from round 8). Arrows stay for 4 seconds after the wave starts.
- **Hit direction:** a red arc on the screen edge points toward whatever hit you (works in cars too).
- **Mystery box:** a glowing gold box with a light beam sits inside the enterable building farthest from the shops. $950 for a random weapon; if you already own it, it upgrades one MK level; maxed guns get an ammo refill.
- **Boss variety:** telegraphed red danger zones before special attacks - BOSS: SLAM (a circle lands on you), GODZILLA: DEATH BEAM (a long lane), OVERMIND: METEOR RAIN (circles on every player). Unique team drops on death: BOSS = full restock/revive/+$1000, GODZILLA = free perk each, OVERMIND = every gun +1 MK.
- **Spectating:** press V while dead to cycle CHASE / FIRST PERSON / OVERHEAD / FREE CAM.
- **Post-game stats:** kills, damage dealt, revives, times downed and boss kills per player, with a star MVP for crews of 2+.

### Latest: multiplayer balance
- Wave size now scales with crew size: 1.0x solo, 1.55x for 2 players, 2.65x for 4, 3.75x for 6 (replaces the flat 1.5x online bonus). Regular aliens also get +10% health per extra player, and the live alien cap rises to 48.
- Kill cash: the killer gets full cash; teammates within 60 units get 25%.

### Latest: interiors, marina, signs, loot from cars
- **Building interiors:** every kind of place now has its own furniture (arcade cabinets, DJ booth and speakers, video shelves, diner booths, rink floor, lobby desk, tiki bar, record bins)..
- **Marina** on the east beach: boardwalk, four piers, docked boats you can stand on and a yacht with a loot cache on its cabin roof.
- **Drive-in:** palms no longer clip into the screen; it now plays an animated loop (sunset, alien attack, car chase, intermission).
- **Time-of-day neon signs** at the plaza, drive-in and marina follow the player's real clock (sunrise special, sunshine hours, happy hour, night shift, midnight movies).
- You can now **grab loot while driving** or flying a vehicle.
- The big 3-2-1 number in the wave warning was removed (the label and arrows stay).

### Latest: ferris wheel ride + teammate arrows
- Walk up to the Crystal Wheel and press E to ride a gondola. It carries you around one full turn and steps you off at the bottom, or press E any time to hop off.
- Teammates who are off the minimap now show as blue edge arrows.

### Latest: the Pizza Alien
- A chef-hat alien with a big mustache shows up in round 7 (and again in rounds 12, 17, 22...). It carries a pizza and lobs spinning pizza bullets at you. Kill it for $300 and a free healing slice: 40% health for the killer, +25 for teammates within 45 units.

## Latest batch
- Your owned garage car is kept when you die (until you start a new game). Helicopter now $15,000.
- Monster truck buffed (tougher, faster, heavier ram) and crushes armored aliens.
- Round 6+: aliens trickle in gradually instead of all at once at round start.
- Full map: press **L** (or click the right stick) to open, again to close.
- Ferris wheel: your own cabin is hidden while riding so the seat doesn't block the view.
- Pizza Alien always spawns inside a diner. Movie Alien spawns at the drive-in (rounds 6, 9, 12...). Cleopatra waits atop the pyramid every 11 rounds (11, 22, 33...).
- These three do NOT show on the minimap or edge arrows - go to the locations to find them.

## Minimap + pacing update
- Pizza, Movie and Cleopatra aliens are back on the minimap/full map as big green markers (P / M / C) and big pulsing green edge arrows when off-map.
- Pizza Alien sounds: "order up" ding when a pizza is thrown, sizzle when it lands, a 3-note fanfare when it dies and heals the team.
- Round 6+ pacing: spawn rate scales with round size so spawning finishes in ~40s; once the queue is empty dormant groups wake, the hiding stalker comes out after ~20s, the last few aliens speed up, and far stragglers get dropped closer. Hidden specials no longer hold a round open.

## More landmark bosses
- PIRATE CAPTAIN on the marina boardwalk (rounds 8, 14, 20...): fires 3 cannonballs at a time. Kill: +$1800 and ammo refill for everyone alive.
- CARNIVAL BOSS under the ferris wheel (rounds 10, 16, 22...): fires a 7-balloon spread. Kill: +$2000 and the whole team is healed.
- Both show on the minimap as green K / F markers and big green edge arrows, like Pizza (P), Movie (M) and Cleopatra (C). They wait where they spawned and never hold a round open.

## Tiki bar beer
- Every TIKI BAR has a beer tap by the back counter: [E] for $40. Drinking it gives a 30-second drunk effect (screen sway, blur, colour drift, fading in and out). Dying clears it.

## Special alien schedule (spread out)
Movie Alien: round 9, then every 7. Pizza Alien: round 7, then every 7. Pirate Captain: round 12, then every 7. Carnival Boss: round 16, then every 7. Cleopatra: round 22, then every 11.

## Guards, Butcher, tank, bomber, weapon variety
- Pizza and Movie aliens now stay at their spawn until a player gets within ~45 units. The stalker stays hidden until a player walks into the building it's hiding in. A hidden stalker no longer holds a round open (and a second one isn't spawned while one is already waiting).
- THE BUTCHER: a second, tougher chainsaw stalker (patchwork mask, apron, chainsaw) hiding in a building from round 22, then every 7 rounds. Same hide-until-entered rule.
- When a teammate dies or goes down, everyone gets a "HAS FALLEN" notice and a giant pulsing blue arrow on the minimap (a pulsing ring on the full map).
- BATTLE TANK ($25,000, garage): slow and tough, fires explosive shells with a big blast radius, crushes armored aliens.
- MINI-BOMBER weapon ($5,500, key =): fires mini bombs that explode on impact and hit everything nearby.
- Weapon variety: SMG chain lightning, shotgun point-blank bonus / range falloff, rail gets stronger per alien pierced, minigun slows aliens, Longshot damage grows with distance, Arc Gatling ramps up the longer you hold fire, Neon Stars ricochet. Each shows its trick in the armory.

## Beach, tiki bar, Tipsy Alien
- Beach & ocean: wet sand and rolling foam at the waterline, crest lines rolling in, umbrellas and towels, beach balls, starfish, sandcastles, volleyball nets, lifeguard towers, flickering beach torches, bobbing buoys with blinking lights, drifting sailboats and jumping dolphins.
- Tiki bar: bamboo-fronted counter (solid), thatch overhang, bottle shelf, tiki masks, neon COLD BEER sign, string lights, torches, surfboards, potted palms, and a big glowing beer bottle on the counter - [E] there for $40 to drink it (30s drunk effect).
- TIPSY ALIEN: from round 8 (1 at first, more as rounds go on). Lobs bottles; a hit (or a touch) gives 10 seconds of the drunk effect and no damage.

## Beach bar
- An open-air BEACH BAR sits on the sand just south of the starting plaza (about x=-20, straight toward the ocean): thatch roof, bamboo counter, stools, tiki masks, neon sign, torches, surfboards and the same glowing beer bottle ([E], $40, 30s drunk effect) on the customer side of the counter.

## Built to last to round ~150
- Alien health: unchanged through round 40, then only +0.6% per round (it used to compound 8% per round forever). Wave size is capped at 75 (x crew multiplier). Alien damage is capped at x2.5.
- Weapons now have 9 upgrades (MK II -> MK X, up to 13x base damage, bigger mags). MK VII-X cost $22k / $34k / $50k / $75k (x the gun's price factor), a late-game cash sink.
- Boss rounds (every 5th): only ~28% as many escorts (minimum 4), at most 8 aliens on screen at once (+3 per extra player), so the boss is the focus.
- Rough target: a maxed gun clears a late wave in roughly 2-4 minutes; area weapons, teammates and perks shorten that.

## Schedule + boss update
- Butcher (chainsaw stalker): round 25, then every 7. Faster (base speed 6.4, x2.3 when hunting vs the Stalker's x2.0) and much stronger than the Stalker (3,600 base health / 90 damage vs 900 / 46).
- Pirate Captain: round 26, then every 7. 3,400 base health, 40 damage, fires 5 cannonballs faster. Kill reward +$2,400 and an ammo refill.
- Cleopatra: round 32, then every 11. 3,200 base health, 38 damage, fires 5 gold bolts faster. Kill reward +$2,000 and a free perk.

## Wait until seen
Pizza, Movie, Cleopatra, Pirate Captain and Carnival Boss now stay put (no moving, no shooting) until a player is actually in line of sight within ~70 units, or hurts them. The Stalker and Butcher stay hidden until a player enters their building or looks in at them from within ~20 units.

## Boss tuning (hard, but beatable)
- Stomp areas shrunk: Boss 10, Godzilla 26, Overmind 30 (slam warning circle r10).
- Every-5-rounds bosses (and Godzilla/Overmind/Shark) get +80% health per extra player (Shark +50%); Cleopatra, Pirate, Carnival Boss and Butcher get +60% per extra player.
- Landmark bosses: Cleopatra 4300 hp / 30 dmg, Pirate 4600 / 32, Carnival 3300 / 26, Butcher 4000 / 56 (speed 5.0, hunts at x2.2).

## Character customizer (press K)
Level-ups unlock Vice City styles in four categories: suit colors (incl. a rainbow suit at 45), hats (Panama, fedora, headband, sailor, bucket, trucker, captain, palm crown, flamingo floatie, neon crown), sunglasses (aviators, wayfarers, round, visor, heart, neon bar, gold, rainbow lenses) and Hawaiian shirts (palm, hibiscus, flamingo, sunset grid, waves, parrot, stripes, gold palms, vice sunset, legend floral). A live rotating preview sits in the locker. Teammates see your outfit in co-op. Choices are saved in this browser; server.js needs the one-line update (passes `m.ch` on join).

## Shared rides & driver aliens
- Co-op: walk up to a car somebody is already driving and press E to ride along. Seats: segway and motorcycle 2, everything else 4. Whoever got in first drives; if the driver leaves, the next one in takes the wheel. Passengers can leave any time (a helicopter has to be landed first) and can fire the gun on the helicopter and tank. A wrecked car throws everyone out (25 damage each).
- Alien drivers: up to 3 per round, riding vehicles that get better with the round: segway R8, motorcycle R16, coupe R21, muscle car R28, hypercar R34, monster truck R40, hovercar R45, helicopter R48, tank R51. Tank and helicopter drivers are the shooting aliens. They are faster, tougher and hit harder than normal aliens; killing one blows up the ride and pays a small bonus.

## Detailed interiors
Eight kinds of buildings are now fully dressed (batched decor, so it stays fast): a new PIZZA SHOP (checkered floor, brick oven with a fire and chimney, prep counter with pizzas, menu board, booths, pendant lamps - it replaces the second diner and the pizza alien can hide there too), ARCADE (cabinets with pixel-art screens, claw machine, dance pads, prize shelf, neon ceiling), DINER (black/white floor, chrome counter with milkshakes and pie, jukebox, kitchen window, clock), NEON CLUB (colour-cycling dance floor, DJ booth, lasers, mirror ball), VIDEO RENTAL (shelves of VHS tapes, movie posters, TV wall), RECORD SHOP (record bins, giant vinyl, album walls), HOTEL LOBBY (marble floor, red carpet, key wall, chandelier, palms, elevator) and ROLLER RINK (glowing rink lines, disco ball, rainbow wall, skate shelves). The vending machines everywhere got glowing snack fronts.

## Customize screen, more outfits, controller hints
- The home screen now has a single CUSTOMIZE button (the old Locker button is gone; K / D-pad down still open it in a game). It holds the character, gun skins and car designs.
- Nine character categories now: suit colors, hats, sunglasses, Hawaiian shirts, jackets (linen/pastel blazers, bomber, letterman, leopard coat, chrome, gold tuxedo), chains and pendants, shoes (sneakers, high-tops, roller skates, rocket boots...), face items (mustache, headphones, hoop, neon paint, bandana, grill, antennae) and back items (surfboard, boombox, palm pack, rocket pack, capes, wings). Everything is level-gated, saved in the browser and sent to teammates, so co-op players see each other's outfits.
- Controller awareness: as soon as you touch a controller, every on-screen hint switches to its own button names (Xbox: X / A / B ..., PlayStation: SQUARE / CROSS / CIRCLE ..., Switch: Y / B / A ...). Touch the keyboard or mouse and the hints switch back. The how-to-play controller table and the menu button follow the controller type.
