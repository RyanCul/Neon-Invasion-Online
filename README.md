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
- **Godzilla alien**: every 50 rounds a building-sized Godzilla alien walks straight through the city (it ignores buildings), with a huge health bar, a stomp shockwave and a fan of fireballs.
- **Garage** (walk up to it, Q or D-pad left cycles, E buys) lists everything, cheapest first: Neon Segway $500, Drift Motorcycle $1,000, Flamingo Coupe $1,500, Jetpack $2,500, Cyan Muscle $3,500, Sunset Hyper $6,000, Monster Truck $9,000, Void Hovercar $14,000. Vehicles are slower and smoother now; speed is shown in MPH.
- **Car designs**: level-ups also unlock car paint jobs (stripes, spoilers, flames, wings, underglow, rainbow). Equip them in the locker (K); they apply to vehicles you buy after equipping.
- **Alien sounds**: each alien type has its own growl/screech/buzz, panned left/right and getting louder as it closes in, plus a heartbeat when several are on top of you and ground-shaking footsteps from the Godzilla alien.
- **Garage menu controls**: Up/Down arrow keys or the left stick (also D-pad up/down) pick an item, E or X buys it, B closes the menu (press E/X to reopen). The segway and motorcycle now show your character riding them, in your colour.
- **Aliens in view**: when an alien comes into sight (on screen with a clear line, not behind a building) you hear a "contact" sting plus its own voice, a low tension drone plays while any are visible, and a CONTACT warning flashes (bosses and the Godzilla alien get a bigger horn and their own warning).

## Weapons, armory & upgrades
11 laser guns, every one with **5 upgrades** (MK I → MK VI: more damage, bigger mags, brighter laser). Buy and upgrade from the **ARMORY** list menu (Up/Down or Q to choose, E / X to buy or upgrade, B closes). The Forge still upgrades your current gun. "Refill all ammo" is in the armory too.
New guns: **LONGSHOT** (slow, long-range sniper – hold right-click / LT to scope), **ARC GATLING** (hold fire to charge, then it sprays), **NEON STARS** (thrown shuriken), **INFERNO** (flamethrower, sets aliens on fire), **TOXIC SPRAYER** (gas canister, poison cloud), **BRASS KNUCKLES** (close range, no ammo).
Switching: keys 1-9, 0, - · mouse wheel · LB/RB · **F = quick-swap to your previous weapon; on a pad LB/RB (the bumpers) cycle weapons**. Right-click / LT = aim. On a pad, X = interact (or reload if nothing nearby); Y or D-pad up = go to base.

## Helicopter
Garage item #8, **$30,000**. WASD fly, mouse aims, Space up, C/Shift down, click / RT fires miniguns. Land (below ~3 height) to exit. Pad: LS move, RS aim, A up, B down, RT fire.

## New aliens
- **KNIFER** (from round 8): faster than the red one.
- **HOUND** alien-dog (from round 11): very fast, bites, comes in packs of 3.
- **THE STALKER** (rounds 6, 10, 14, …): hides inside a building; check the minimap and hunt him down. Wakes up when you get close, then chases fast.
- **ROOFTOP SNIPER** (from round 16): stays on roofs; a red aim beam warns you before every shot – break line of sight.

## Death
When your crew is overrun you see the summary, then return to the **main menu** (button / Enter / pad A, or automatically after 9 s).
