# NEON INVASION
Co-op alien-wave FPS in the neon 80s city. Rounds get harder, a boss alien every 5 rounds.
Earn cash per kill, buy colored laser guns, upgrade them at the QUICK UPGRADE station, buy armed cars at the GARAGE.

## Play solo (no server)
Open index.html in a browser (keep game.html, shared.js and the song files (02.mp3 ... n6.mp3, b1.mp3 ... b6.mp3) beside it) and click PLAY SOLO.

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
11 laser guns, every one with **9 upgrades** (MK I → MK X: more damage, bigger mags, brighter laser). Buy and upgrade from the **WEAPONS** station list menu (Up/Down or Q to choose, E / X to buy or upgrade, B closes). The Forge still upgrades your current gun. "Refill all ammo" is in the armory too.
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
On **round 50** (and every 50 after) the ultimate boss arrives alongside a normal boss: **THE OVERMIND**, a building-sized brain alien with 300,000+ health (scales with rounds and players). It fires a wide 9-orb barrage, stomps, and every ~13 seconds **summons a swarm of 7 aliens** around itself. Killing it pays $60,000.

## More buildings, stalker marker, alien shark
- About **22 enterable buildings** now (was 8), each with loot inside and counters. Pink triangles on the minimap = a door you can walk into. The stalker hides in any of them.
- The **stalker** is a big skull on the minimap: **yellow while hiding, red once he's hunting you** (an arrow on the edge of the map points to him when he's far away).
- **ALIEN SHARK** every 13 rounds (13, 26, 39...): a land shark that prowls the beach and lunges at anyone who steps onto the sand. It must be killed for the round to end ($6,000 payout). Cyan dot on the minimap.

## Perks, secrets, weather and more (latest update)

**Perks** (now their own CHARACTER BUFFS tower in the fourth corner of the starting plaza, opposite the armory's diagonal; one-time purchase, kept until you die/restart): Neon Tank (+50 max HP), Quick Revive, Fast Hands (faster reload), Sprinter, Dead Eye (bigger crit damage), Cash Magnet (+25% cash), Kevlar, Double Tap, plus the others listed in the armory. Owned perks show on the HUD.

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
- Alien drivers: up to 6 per round, riding vehicles that get better with the round: segway R8, motorcycle R16, coupe R21, muscle car R28, hypercar R34, monster truck R40, hovercar R45, helicopter R48, tank R51. Tank and helicopter drivers are the shooting aliens. They are faster, tougher and hit harder than normal aliens; killing one blows up the ride and pays a small bonus.

## Detailed interiors
Eight kinds of buildings are now fully dressed (batched decor, so it stays fast): a new PIZZA SHOP (checkered floor, brick oven with a fire and chimney, prep counter with pizzas, menu board, booths, pendant lamps - it replaces the second diner and the pizza alien can hide there too), ARCADE (cabinets with pixel-art screens, claw machine, dance pads, prize shelf, neon ceiling), DINER (black/white floor, chrome counter with milkshakes and pie, jukebox, kitchen window, clock), NEON CLUB (colour-cycling dance floor, DJ booth, lasers, mirror ball), VIDEO RENTAL (shelves of VHS tapes, movie posters, TV wall), RECORD SHOP (record bins, giant vinyl, album walls), HOTEL LOBBY (marble floor, red carpet, key wall, chandelier, palms, elevator) and ROLLER RINK (glowing rink lines, disco ball, rainbow wall, skate shelves). The vending machines everywhere got glowing snack fronts.

## Customize screen, more outfits, controller hints
- The home screen now has a single CUSTOMIZE button (the old Locker button is gone; K / D-pad down still open it in a game). It holds the character, gun skins and car designs.
- Nine character categories now: suit colors, hats, sunglasses, Hawaiian shirts, jackets (linen/pastel blazers, bomber, letterman, leopard coat, chrome, gold tuxedo), chains and pendants, shoes (sneakers, high-tops, roller skates, rocket boots...), face items (mustache, headphones, hoop, neon paint, bandana, grill, antennae) and back items (surfboard, boombox, palm pack, rocket pack, capes, wings). Everything is level-gated, saved in the browser and sent to teammates, so co-op players see each other's outfits.
- Controller awareness: as soon as you touch a controller, every on-screen hint switches to its own button names (Xbox: X / A / B ..., PlayStation: SQUARE / CROSS / CIRCLE ..., Switch: Y / B / A ...). Touch the keyboard or mouse and the hints switch back. The how-to-play controller table and the menu button follow the controller type.

## Online accounts and friends

- **FRIENDS** button (home menu and pause menu): log in or create a free account (name + password).
- An account saves your level, looks (customize) and best round online, so it follows you to any device. XP only ever goes up.
- Add friends by name; they accept from their own FRIENDS panel. Your list shows each friend's **level** and what they are doing: in a co-op room (with round and player count, plus a JOIN button), playing solo (round), in the menu, or offline.
- Server: accounts are stored with the leaderboard. On free hosts the disk is wiped on redeploy, so set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (free Upstash Redis) on Render to keep accounts. Without them it falls back to `accounts.json` (`ACC_FILE` env to move it).
- Note: progress is saved by the client, so XP is trusted (capped at 2,000,000).

## Invite links

- In a co-op room, the waiting room and the pause menu have a **COPY INVITE LINK** button. The link looks like `https://your-game-site/?room=ABCD`.
- Opening it fills in the room code and shows "YOU WERE INVITED"; the player types a name (if new) and presses CREATE / JOIN ROOM.

## Achievements & cosmetics
CUSTOMIZE has three tabs: CHARACTER, PROFILE, WEAPONS & CARS. ACHIEVEMENTS is its own button on the home screen next to FRIENDS. Titles, badges, name colours, frames, weapon camos and kill effects unlock by level or by earning achievements (kills, revives, bosses, rounds, weapon kills). Earned-only items are shown in the ACHIEVEMENTS tab. Your name chips show in the lobby, team HUD, friends list and above your head in 3D.

## Controller menus
Every menu works with a controller, including the home screen. D-pad/left stick moves, A selects, B goes back, LB/RB switch main tabs, LT/RT switch sub-tabs, left/right adjusts sliders. Text fields open an on-screen keyboard. Pressing A on the title screen with nothing focused starts solo.

## Discord
The home screen has a "JOIN THE OFFICIAL DISCORD" link at the bottom (https://discord.gg/XvD5KQjDZr).

## Hard mode & waiting room
Hard mode: aliens have 50% more health, hit 40% harder, waves are 25% bigger, and kills pay 25% more cash. Solo: SETTINGS → HARD MODE (applies to your next game). Online: the host flips the HARD MODE switch in the full-screen waiting room (H / controller X). Nobody can move, shoot or buy until the host starts the game (enforced on the server too).

## Sound
Layered boss / Godzilla roars, heavy alien footsteps, player footsteps and landing thuds, punchier gunshots, hit / headshot / kill feedback, multi-click reload and an empty-mag click.

## Versus mode
The host picks CO-OP or VERSUS (V / controller Y) in the waiting room. Versus: last player standing wins, nobody can be revived, fallen players spectate everyone else until the game ends, and players can never hurt each other (shots, blasts and cars only affect aliens). When one player is left they get a YOU WIN screen: KEEP GOING? Yes continues solo to see how far they get; No ends the game. After any game the results show for 10 seconds, then everyone is back in the waiting room. A small door button in the bottom-left of the waiting room goes back to the main menu.


### Waiting room and win screen controls
The mouse is released in the waiting room and on the YOU WIN screen. Controller: D-pad/stick to move, A to select, X hard mode, Y versus, Start to begin; on the win screen A = yes, B = no.

### NEON FM radio
The title screen loops the original song (Too Soon). Once a game starts the radio plays through 17 tracks in order. Keyboard: `,` previous, `.` next, `[` volume down, `]` volume up, `M` mute. Controller: D-pad left = previous, right = next, up/down = volume (at the weapon and perk shops up/down scroll the list instead). Hood cam while driving is L3. The Customize screen (skins, guns, cars) is only on the main menu. Songs sit next to index.html (a radio/ folder also works) (re-encoded to 64 kbps so the whole game fits in one small download); the names are made up for the untitled ones.

The radio also has a hidden NIGHT CHANNEL (6 lofi tracks). It only exists while it is night in game (rounds 6-10, 16-20, 26-30 and so on; every 5th round it flips between day and night): scroll past the last NEON FM song and it tunes in. When day comes back the radio drops back to the first NEON FM song.

### Sound mix
Every song is loudness-matched (about -17 LUFS) so no track jumps out, and the music slider is scaled to match. Walking footsteps are soft, the beach has a rolling wave swell that gets louder toward the water, and cars, the helicopter and the jetpack each have a continuous engine sound. The radio volume keys (D-pad up/down, `[` and `]`) move the sound effects along with the music.


### Files
`index.html` is a thin page that holds the game (`game.html`) in a frame. Fullscreen is applied to that outer page, so going back to the main menu (which reloads the frame) never drops you out of fullscreen. `game.html` also runs on its own if you open it directly.

### Controller layout (on foot)
Left stick move, right stick look, RT fire, LT aim, **A jump (and jetpack up)**, **hold Y to sprint**, **X also takes you back to base between rounds**, click the left stick (L3) for fullscreen, B crouch / hover, X use / reload, LB / RB switch weapon, D-pad radio, BACK = back to the starting area, START = pause. In a vehicle: A / RT gas, B / LT brake, Y = get out, LB = handbrake, RB = hood camera.

## Neon Palace Casino
In the north-east of the map, right next to the Neon Pyramid, in the converted roller rink (slots along the back wall, roulette table in the middle). Press E (X on controller) at a slot machine or the roulette table. Bets $50-$1000. Slots pay on three matching symbols (two cherries = bet back). Roulette: red/black, odd/even, 1-18/19-36 pay 1:1, a single number pays 35:1. The casino is a safe zone for whoever is inside: no damage, aliens ignore you, and you cannot shoot. Everyone else plays normally.

## Round rules
A round only ends when every stalker and boss (including hidden ones) is dead. Bigger crews earn less cash per kill.

Update: every alien except roof snipers must now die to end a round (pizza, movie, shark, Cleopatra, pirate, carnival, stalker, the Butcher and all bosses). Alien cap is 40 until round 10, 60 until round 20, rising to 75 by round 30. A downed or dead teammate flashes red on the minimap with a name label and the screen edge flashes.

Casino bets go up to $100,000 and roulette has a GREEN 0 bet. Cars take 20% more damage, and each player can have only one of each car out at a time. The full map (L) labels the landmarks, shops, casino and tiki bar.

Hounds and rooftop snipers have been removed from the game.

Gunship helicopter: damage 30, fire rate 6/s, armor 1000, 240 rounds. When empty, land and stay still for 5 seconds to recharge (leaving the ground resets the timer).

Knifers are 25% slower, and every alien has a top speed of 15 no matter the round. On-screen banners (round, contact, toasts, streaks, loot) now sit in separate bands so they do not overlap.

Casino: an ALL IN button bets all your cash on slots and roulette.

Acid rain has been removed (blackouts and lightning storms remain).

Weather now also includes Thick Fog (short sight, smaller minimap), Meteor Shower (orange circles, then blasts that leave fire for 6 s) and Neon Aurora (+50% cash per kill, aliens 20% faster). Ground aliens can now jump low ledges, so they can climb the pyramid. On controller: A jump, hold Y sprint, X = back to base between rounds. Full-map labels are one word.

## Update: bosses, rounds and controller
- **Controller:** A = hold to run, B = jump / jetpack, X = reload, Y = use (enter / leave cars and the wheel, buy, revive) and back to base between rounds. The radio controls sit under the current song.
- **Back to base** is now handled by the server, so it works from cars, helicopters and the wheel.
- **Levels** go to 100; XP per level keeps climbing (faster after level 50).
- **Perks:** Neon Tank and Sprinter show as one menu row each; the next tier replaces it after you buy one. Tier III costs $10,000 and tier IV $100,000 for both.
- **Rounds:** 12 s between rounds, 20 s once past round 20. In co-op everyone who fell gets back up the moment the last alien dies.
- **Vehicles:** a wrecked ride can't be taken out of the garage again until the next round.
- **Versus win:** "Switch to co-op" (everyone else revives when the round ends and the match continues as co-op) or "Back to lobby".
- **Alien shark** now flies. It cruises over the beach until you get close or hurt it, then hunts anywhere on the map with fast lasers. Every 30th round a **giant alien shark** comes.
- **Carnival boss** rides the Crystal Wheel (the wheel now turns on server time so everyone sees the same spin). Low health, sniper rifle: a red line charges for 1.4 s, then one heavy shot.
- **Godzilla** has more health and damage, his blasts reach anywhere on the map, and he does a slow giant **Stomp** (red circle fills over 6 s, radius 50).
- Weather only shows in the orange box at the top. Area and pop-up subtext was shortened.

## Vehicle swarm rounds
Rounds 17, 27, 37, 47 ... are special: 20 aliens all ride the same vehicle, getting better each time (R17 segways, R27 motorcycles, R37 coupes, R47 muscle cars, R57 hypercars, R67 monster trucks, R77 hovercars, R87 helicopters, R97 and after tanks). Normal alien drivers are off on those rounds.

## Ocean
The sea now has a shallow-to-deep colour gradient, scrolling ripple and sparkle texture and extra wave motion. The big ground plane used to run under the water and hide most of it, so it now stops at the shoreline.

## Beach life
- **Crabs** (12) scuttle around the sand and run from you; shoot one for a little cash (they respawn after about 14 s). **Seagulls** circle overhead (daytime).
- **Boardwalk:** a pulsing retro boom box, a climbable **lifeguard tower** (perch with a cache on top) and a **pier** with string lights and a big spinning ring of lights.
- **Sea:** jet skis zip along the shore, a lighthouse sweeps a beam, and a glitter path runs across the water (pink at sunset, blue at night). Foam now breaks on the shore with a lacy edge.
- **Pirate ship** sits in the bay and fires cannons at players on the beach while the pirate captain is alive.
- **Night:** bonfires on the sand, glowing jellyfish in the shallows and on the shore, and light beams over the tiki torches.

- **Casino interior:** red carpet with a gold lattice, marble pillars, chandeliers, chasing marquee bulbs, JACKPOT / LUCKY 7 signs, stools at the slots, chip-covered roulette table and four blackjack tables.

## Landmark changes
- The westernmost container yard is now the **Neon Ballpark** (striped grass, dirt diamond, bases, scoreboard, dugouts and bleachers you can climb, floodlights).
- The north-western lake is a **City Park** (paths, flower beds, pavilion fountain, swing set); the other lake is **Fountain Square** with a tiered fountain and animated jets.
- The crashed UFO moved to the block where the middle maze was, and the old UFO park is now **The Lighthouse**: a striped stepped tower with a sweeping beam and a cache on top.
- The **Mystery Box** moves to a different random building every 6 rounds (round 7, 13, 19...). A toast announces where, and the map marker follows.

## Radio channels
- **NEON FM 98.6** (16 songs) plays from the start. **NIGHT CHANNEL** (6 lofi tracks) unlocks when the game reaches its first night (round 6) and is then available day and night. **BEACH CHANNEL** (6 bossa nova tracks, Pixabay) unlocks the first time you step onto the beach. Unlocked channels stay unlocked for that game; each new game starts with only NEON FM.
- Tune channels with D-pad up / down or `[` / `]`; `,` `.` and D-pad left / right change the song inside the channel, `M` mutes. Volume is only changed in the settings menu (music default 35, effects default 100).
- "Too Soon" by Diamond Ace was removed; the title screen now plays the first NEON FM song.

## Round rules and labels
- A round only ends when every alien is dead: all bosses, the pirate captain, both shark bosses, the stalker, the Butcher and roof snipers included.
- Floating name labels over landmarks (and the radio, pier, lighthouse, ship and lifeguard tower) were removed. Shop and building names stay.

- The main menu and the first game song are now "Palm Tree Pursuit". A bright red ROUND CLEARED banner flashes the moment the last enemy dies. The main menu has a CLOSE GAME button under the online leaderboard.
- ROUND CLEARED is now a retro gradient banner (hot pink to orange with a dark band and neon lines) that stays readable on any background. Drivers on the segway and motorcycle now show their own customised character (suit, hat, shades, shirt, jacket, chain, face and back item).

## Shop preview box
Hovering a weapon in the armory or a vehicle in the garage shows a spinning 3D model in a box beside the menu. Character buffs show a short label such as +HEALTH or +SPEED instead. Shop interaction range was tightened slightly (about 6.5 down to 5.4).

## Casino safe zone
Aliens (ground and flying) can no longer enter the casino; they are pushed back out through the wall. A "SAFE ZONE" banner pops up when you walk in and stays as a small badge while you are inside. The shop preview box is also larger.

## Baseball Slugger (mini boss)
Spawns every 10 rounds starting at round 17 (17, 27, 37, ...). He waits on the pitcher's mound of the ballpark and stays there until a player gets within about 48 units. Then he chases and throws fast baseballs, with a three-ball spread every third throw. Killing him pays $2,000 and refills everyone's ammo. He must be killed to finish the round.

## Banner layout
Pop-up texts (wave incoming, safe zone, contact, round cleared, round banners) now stack on screen instead of overlapping.

## Repeat-appearance speed boosts
Stalkers (and the Butcher) get +5% speed and a higher speed cap every time they show up, up to +40%. The Baseball Slugger's baseballs fly 8% faster every appearance, up to +60%.

## Third-person view and jetpack row
Press T on foot to switch between first and third person (you see your own customized character). In the garage the jetpack row turns into the fuel-tank upgrade once you own the jetpack, so there is no separate fuel row.

## Third person controls
Click the left stick (L3) to switch third-person view on a controller (fullscreen is now only the Settings checkbox or the G key). The camera has a wall check and orbits around you with the mouse or right stick. X in a vehicle (X on a controller, or the X key) sounds a two-note horn beep.

## Shop prices and weapon balance
Every weapon costs $1,500 to buy (Flamingo is free). Every weapon uses the same upgrade ladder: $2,500, $5,000, $10,000, $20,000, $50,000, $100,000, $150,000, $200,000, $300,000 (about $837,500 to max a gun). Balance tweaks: Aqua-9, Arc Gatling, Neon Stars and Mini-Bomber hit harder; Inferno and Brass Knuckles hit a bit softer.

## Mystery box and pacing
- The mystery box is now **free**. Each player can open it **once per appearance** and gets the **base form (MK0)** of a random weapon they don't own yet. If you own every weapon you get an ammo refill instead.
- It is marked on the minimap (pulsing yellow `?`, with an edge arrow when off-map) and on the full map, and a toast announces each new location. The marker dims once you've opened it.
- Upgrade ladder is now 2,500 / 6,000 / 15,000 / 35,000 / 75,000 / 125,000 / 175,000 / 230,000 / 290,000 (about 953k total). Putting roughly 60% of income into one main gun maxes it around round 60.

## Character buff tiers
Every buff now has 4 tiers (each tier needs the previous one). Prices: $2,500 / $10,000 / $40,000 / $150,000. Effects (cumulative): Neon Tank +25/+60/+110/+175 HP; Quick Revive 1.3/1.6/2/2.5x; Fast Hands -15/25/35/45% reload; Sprinter +8/16/25/35%; Dead Eye +15/30/50/75% headshots; Cash Magnet +10/20/30/40%; Kevlar -8/15/22/30% damage; Double Tap +8/15/22/30%.

## Balance pass (round 3)
- Removed the free-perk rewards (Godzilla now gives ammo, Cleopatra gives cash only).
- Meteor blasts, their fire and acid rain no longer hurt anyone standing under a roof/ceiling.
- Purple loot: about half as many pickups and roughly a third of the cash.
- Carnival Boss fires about twice as fast (shorter charge, shorter cooldown).
- Mini bosses buffed (about +35% health, +20% damage): Stalker, Alien Shark, Cleopatra, Pirate Captain, Carnival Boss, Butcher, Baseball Slugger.
- Sharks, giant shark, Baseball Slugger and Butcher now show as green markers / edge arrows on both maps.
- Solo game over: the stats screen stays until you click MAIN MENU (no countdown). Online still returns to the waiting room for a rematch.

## Balance pass (round 4)
- Alien melee hits, stomp shockwaves and bomb blasts now need a clear line (no wall in between), and fast alien shots can no longer tunnel through thin walls.
- Weapon ranges (previously almost everything reached 260): Flamingo 80, Aqua-9 90, Sunset 45, Violet Rail 160, Lime Storm 120, Arc Gatling 110, Inferno 34 (was 24). Longshot 420, Stars 90, Toxic 75, Mini-Bomber 110 unchanged.
- Battle Tank now has 24 shells that recharge like the helicopter (it used to read as OUT OF AMMO after its first shot). Helicopter: 48 damage, 8 shots/s, 240 ammo (unchanged). The big vehicle counter shows ammo instead of altitude.
- Upgrade tiers 3-5 are cheaper: 12,000 / 22,000 / 48,000 (full ladder 2,500 / 6,000 / 12,000 / 22,000 / 48,000 / 125,000 / 175,000 / 230,000 / 290,000).
- Alien health scaling eased very slightly (0.15 to 0.145 per round up to round 10, 8% to 7.75% per round after), and alien damage now grows a bit faster (3% per round instead of 2.5%, same cap) so the game doesn't get easy.

## Spectating and horn
- Spectating (when you are down/dead) now smooths the other player's height and facing and eases the camera toward its goal every frame, so chase, first-person and overhead views no longer stutter with network updates.
- The horn is now a proper two-tone car horn (detuned sawtooth pairs, flat level, short hard cut-off).

## Test pass
- Every alien type spawned and ticked 400 frames and every weapon fired with no errors; 30-round runs with four different guns hit no errors or stalls.
- Mid-game (rounds 12-24) was the steepest part of the curve in the bot test, so upgrades 4-6 are cheaper (22,000 / 48,000 / 110,000) and health growth is a touch gentler from round 10-25 (7.1% a round, back to 7.75% after).

## Small tweaks
- Purple (rare) drops pay about 50% more than the last patch (still well under the original).
- Mini boss pop-ups no longer have subtitle lines (Pizza Alien, Pirate, Carnival, Cleopatra, Slugger, Movie ticket); just the title shows.

## Clips
- A rolling recorder keeps your last 30-60 seconds as a vertical 9:16 video (720x1280, 30 fps, game audio + radio, optional mic). Two MediaRecorders run 30 s apart so the older one always holds at least 30 s.
- Save a clip with F9, the Share button / PS5 touchpad (controller button 17) or by holding BACK/VIEW for 0.7 s (a tap still goes back to base). The newest 12 clips are stored in the browser (IndexedDB).
- The main menu has a CLIPS button where the FRIENDS button was (the friends code is still there, just hidden); the pause menu has one too. The screen plays, saves (download) and shares (phone share sheet where supported) or deletes clips.
- Settings: CLIP RECORDER (on by default only on desktops with 6+ cores), RECORD MY MIC IN CLIPS (off by default), SHOW A MINI HUD IN CLIPS. Clips carry a small NEON INVASION watermark.
- The HOW TO PLAY and controller tables list the new buttons. Works in Chrome, Edge, Firefox and Chrome for Android; Safari support is limited.

## Menu icons
- The main menu's ACHIEVEMENTS button is now a trophy icon and SETTINGS is a gear icon (both keep tooltips and screen-reader labels).

## Vehicles and controller changes
- The controller BACK / VIEW button no longer goes back to base; it saves a clip (same as the Share button and F9). Going back to base between rounds is Y (keyboard Y).
- Heading back to base removes the vehicles you own.
- Going back to base is only possible between rounds, so a ride sent home that way can be taken out again right away. A wrecked ride still waits until next round. Buying a ride is still a one-time cost.
- The last person to drive a ride owns it, so someone else heading to base can no longer despawn the ride you are in.
- If someone else takes over a ride you spawned (they become the last driver), you cannot spawn another copy of that ride until the next round.
- Clip watermark is now the main-menu logo (same gradient and glow), placed near the top of the vertical video so the YouTube / TikTok title overlay at the bottom doesn't cover it.
- Clip logo moved up a little and given a thick black outline so it reads over the sky; the mini HUD moved up out of the bottom area that video titles cover.
- Clip layout final: the logo sits higher up and a bit smaller (72% size); the round / cash / health bar is back at the bottom where it was.

## Disco Moonwalker (new alien)
A normal (non-boss) alien with a good chunk of health that glides toward you **facing away from you**, like a moonwalk. Original alien character (no real name or face) in a classic stage outfit: white fedora with a black band, white blazer with a striped tie, one sequin glove, black trousers, white socks and black loafers.
- **Spawning:** exactly one in round 8. After that there is a random chance (about 55%) every third round (11, 14, 17, ...) for 1-3 of them. Never more than 3 in a round.
- **Moves:** *Spin* (blow lands mid-spin, hurts and knocks you back), *Slide* (fast dash at you, hits once and shoves you), *Freeze pose* (invulnerable for 1 s, ends with a ring of 8 notes; the first one calls two **Backup Dancers**).
- **Notes:** it throws glowing music notes in a rhythm (three quick, then a rest).
- **Sound:** a synthesised high-pitched "hee-hee" yelp made from the game's own oscillators, plus note and chime sounds. Nothing sampled.
- Snapshot alien entry gets a 15th field (move state). New events: `moon`, `moonnote`, `moonring`, `mblock`, `kb`. New orb code 10 (note). Alien types 28 (moonwalker) and 29 (backup dancer).

## Local Splitscreen (Demo)
New orange **LOCAL SPLITSCREEN (DEMO)** button on the home screen, under Create / Join Room. Two players share one screen and one game.
- **How it works:** the page opens in "console" mode (`game.html?split=host`). It runs one shared game simulation and shows two panes (side by side on wide screens, stacked on tall ones). Each pane is a normal game client (`game.html?pane=1` and `?pane=2`) with its own camera, HUD, menus and shop, talking to the shared simulation instead of a server.
- **Controls:** with two controllers, player 1 gets the first and player 2 the second (player 1 can also use keyboard and mouse). With one controller it goes to player 2, and player 1 plays on keyboard and mouse. Click inside the game once for player 1's mouse look.
- **Rules:** works like online co-op: revives, shared aliens, vehicles with passengers, separate money. The game starts by itself and restarts after a game over. Opening the pause menu in either pane freezes the game. EXIT (or Quit in the pause menu) goes back to the main menu.
- **Demo limits:** player 2 never saves XP or logs in to an account. Music only plays in pane 1. It draws the world twice, so it is heavier than normal play. Clips and the online leaderboard are off in splitscreen.

## Fix: aliens sometimes did no damage
The "no hits through walls" check (`wallClear`) aimed at a point below the floor for anyone standing on the ground, so the line was blocked by the ground itself and close-range hits (melee, stomps, bomber blasts, the moonwalker's spin) often did nothing. It now aims at the middle of the body (or the car). Walls still block hits. This was not related to third person or splitscreen: third person only moves the camera.

## Splitscreen speed-ups
Each pane now draws at 80% resolution at most (never above 1 pixel per CSS pixel), updates the water waves and the minimap every other frame, and skips other extra work. The two panes share one browser thread, so splitscreen is always heavier than normal play: the world is drawn twice.

## Splitscreen setup screen
Clicking LOCAL SPLITSCREEN (DEMO) now opens a setup screen first: pick CO-OP or VERSUS, turn HARD MODE on or off, connect controllers (press any button), then both players press READY (Enter / click for Player 1, A on the controller for Player 2). The game starts once both are ready. Changing a setting un-readies both players. Controller shortcuts: X = hard mode, Y = co-op/versus, B = un-ready. The same screen returns after every game. MAIN MENU button goes back to the title screen.
Controller navigation on the setup screen: each player has their own highlighted cursor (cyan = Player 1, orange = Player 2). D-pad or left stick moves it between GAME MODE, HARD MODE, READY and MAIN MENU; A selects. B un-readies. Holding Back / Select for a second also goes to the main menu.

## Main menu redesign
New layout: a hovering UFO with a sweeping beam above the title, black outline around the title and subtitle, PLAY SOLO as the big hero button, ONLINE CO-OP and LOCAL SPLITSCREEN as side-by-side cards, leaderboard / close game as small links, and your equipped character spinning on a neon pedestal at the left (hidden on small screens). Settings and How to Play sit on the top row with the glowing CLIPS button below them. Added scanlines, a pulsing title glow and hover lift on buttons (turned off if the device asks for reduced motion). Controller navigation on the menu follows the new layout (D-pad: Solo, then the cards, then the links, then Discord).
The menu logo now matches the YouTube banner: Montserrat Black Italic with the pink-orange-cyan gradient, a thin black outline and a dark drop shadow, and the subtitle ONLINE CO-OP ALIEN WAVE SHOOTER in Orbitron. The two fonts load from Google Fonts (a bold italic fallback is used offline).
The watermark at the top of saved clips now uses the same new logo (title plus the ONLINE CO-OP ALIEN WAVE SHOOTER subtitle).

## Fix: aliens ignoring a player standing right next to them
Close-range aliens (armored, brutes, biters, flyers and so on) used to swing only at the one player they were chasing. They re-pick that target every 0.4 s, so with two players (splitscreen, or a crowd online) a player standing right beside an alien could take no damage at all. Now each swing hits every player in reach (still blocked by walls, still one swing per cooldown). Wall blocking itself was tested again over about 47,000 random street positions and never blocked an adjacent hit.
(Reverted: I briefly made drones/flyers attack more often; that change is removed and they attack exactly as before.)
Menu launch sound: clicking PLAY SOLO, CREATE / JOIN ROOM or PLAY SPLITSCREEN plays a short rising neon power-up sound (it follows the sound-effects volume in Settings). Splitscreen waits about 0.4 s before switching pages so the sound is heard.

## Balance and loot update
- Guns now cost $1,500 (was $2,000); buying ammo for a gun costs proportionally less too.
- Perk prices were lowered (see the later balance update for the current numbers).
- More FULL AMMO drops: every fourth ground crate is now a green AMMO crate that always refills all weapons (green beam, green dot on the minimap), plus one right next to the base. Ordinary crates also give full ammo a little more often. All crates come back every round.
- Round 4 now always includes one BRUTE (the big orange alien).

## Balance update (rushers, caps, perks, crates)
- Rusher nerf: charger (45 to 34 health, speed 12 to 10), knifer (70 to 52, 12 to 10), hound (55 to 42, 18 to 15), bomber (40 to 32, 9.5 to 8.2). They also show up less often (about 20-30% fewer per wave). Round 3 still has exactly two red chargers.
- Live alien cap is now 65 (was 75): 40 before round 10, 60 until round 20, then eases up to 65 by round 30.
- Perk prices: tier I $1,800, tier II $4,500, tier III $20,000, tier IV $60,000.
- Yellow crates now give money 68% of the time (was 50%), full ammo 16%, health 16%. Their cash payout grows faster each round (about 3.5x at round 50 on top of the existing growth); rare purple caches grow too.

## Mystery box update
- The box now moves to a random different building EVERY round (the every-6-rounds rule is gone), and everyone gets a fresh pull every round. Opening is still free (E next to it).
- Contents: a new gun 60% (only guns you don't own yet), a free base-level (tier I) perk you don't have yet 25%, or money 15% in total ($1,000 7.5%, $2,000 5%, $5,000 2.5%). If a gun or perk can't be given (you already own them all) you get the other one, then a full ammo refill - never extra cash.
- The full map (L) now shows every enemy as a plain green dot (bosses and special aliens are just bigger green dots).

## Alien Dex
- **ALIEN DEX** button on the main menu (next to CUSTOMIZE) opens a codex of all 30 aliens, 6 per row.
- Each alien is a 16-bit style sprite (rendered from its real 3D model, shrunk and colour-snapped). Aliens you haven't spotted yet are dark silhouettes with `???`.
- Hover (or focus with the controller, or click) an entry to see a big spinning 3D model on the left with its name, class, lore, stat chips (HP, speed, damage, bounty, flying/ranged/boss) and a lore blurb. Locked entries show a dark model and a vague rumour of where to find them.
- An alien unlocks the first time you spot it in any mode; a "ALIEN DEX UPDATED" toast appears. Progress is saved in your profile (`prof.dex`) and syncs to your account (server.js `/api/sync` merges it as a union).
- Controller: D-pad/stick moves between entries, B closes.
- Lore lives in the `DEX` array in game.html - edit the text there.

## Night-only hunters and renames
- The Stalker only appears on night rounds (6-10, 16-20, 26-30 ...): rounds 6, 9, 17, 20, 28, 36, ... The Butcher (chainsaw) also only comes at night: rounds 26, 29, 37, 40, ...
- Renamed: Pizza Alien -> Pizza Chef, Alien Shark -> Mutant Shark, Giant Alien Shark -> Giant Mutant Shark, Tipsy Alien -> The Boozer.
- Alien Dex lore rewritten with Ryan's text (see the `DEX` array in game.html).

## Tier V health, Dex stats tab, achievements page
- NEON TANK V: +260 max health in total (360 HP), $250,000, requires NEON TANK IV. Meant as a round ~38+ purchase.
- ALIEN DEX now has an ALIENS tab and a STATS tab: highest round, playtime, games, kills, bosses, rounds cleared, headshots, roadkills, damage, cash earned, revives, times downed, favourite weapon, most-killed alien, aliens discovered, achievements, level. Each alien entry also shows how many of it you have killed. New stats (`pt`, `dn`, `mn`, `dd`, `ak`) sync to the account via server.js.
- Achievements page redesigned: two-column cards with icon, big title, % and progress bar, reward chips; overall completion bar; filters ALL / IN PROGRESS / UNLOCKED; closest-to-done first, finished last.
- Cleopatra is immune until the 5 snakes in her hair are shot off.

## The Overmind overhaul
- The Overmind is now **giant** and **floats high above the city** (round 50 boss). Its hitbox is scaled to match.
- Ground players can't damage it ("OUT OF REACH" hint). Only players on **rooftops, in a jetpack or in a helicopter** can hit it.
- **Every 60s** it fires extremely fast lasers that can hit anywhere on the map. A big red countdown shows when the volley is coming. **Get under a roof** to be safe; anyone exposed takes ~90% max HP.
- It summons any alien, including mini-bosses (rarer than normal aliens).
- While it is alive the sky turns into a swirling red and black Giygas-style void.
- Flying aliens (UFOs etc.) no longer pass through walls/buildings: they climb over or slide around them.
- Overmind health raised (about 300,000 at round 50). Headshots only do +15% on it (no Dead Eye bonus), and you still need to be within your weapon's range of it from a rooftop, jetpack or helicopter.
- Round 40 spawns **two Godzillas**.
- The two Godzillas of round 40 spawn on opposite sides of the city.
