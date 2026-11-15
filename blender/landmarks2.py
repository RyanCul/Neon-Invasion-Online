# NEON INVASION - REMAKE : second landmark file - fountain square, hedge maze, and the casino games (slot machine, roulette table and wheel, blackjack table).
# Run by build_assets.py after landmarks.py (same helpers, same GAME-space g* wrappers: x right, y up, z toward the viewer, front of a model = +z).
#
# Collision is still the plain boxes made by shared.js, so each model is built round them:
#   fountain  18 x 18 deck, top at 1.4 / 8 x 8 tier, top at 2.8 / 2.2 x 2.2 column, top at 6.0   (model y = 0 is the bottom of those boxes)
#   hedge     one wall piece 10.1 x 1.6 x 5 along x (the game turns it for the walls that run along z)
#   slot      2.2 x 1.8 x 3.2 (front toward +z)          roulette table  9 x 4.4 x 1.2 (the felt layout panel is drawn by the game at y 1.27)
import random as _random

def cfaces(bm, faces):
    """add single faces given as ([(x, y, z) in game space ...], colour); lets one mesh carry a different colour on every panel"""
    t = bmesh.new(); lay = t.loops.layers.float_color.new('Col')
    for pts, col in faces:
        vs = [t.verts.new((p[0], -p[2], p[1])) for p in pts]
        try: f = t.faces.new(vs)
        except ValueError: continue
        for l in f.loops: l[lay] = (col[0], col[1], col[2], col[3] if len(col) > 3 else 0.0)
    me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)

def gtube(bm, pts, radii, col, m=8):
    tube(bm, [(p[0], -p[2], p[1]) for p in pts], radii, m=m, color=col)

MAHOG = (0.32, 0.12, 0.1); BURG = (0.55, 0.08, 0.16); FELT = (0.04, 0.44, 0.22); INK = (0.05, 0.04, 0.09)

# ----------------------------------------------------------------------------- FOUNTAIN SQUARE
def lm_fountain():
    b, g = new_bm(), new_bm()
    STONE = (0.74, 0.7, 0.88); STONE2 = (0.86, 0.83, 0.96); ROSE = (0.95, 0.6, 0.82); MAR = (0.97, 0.94, 0.98); TEAL = (0.2, 0.82, 0.92)
    gB(b, 18.0, 1.4, 18.0, 0, 0.7, 0, STONE, 0.14)                                           # the deck (top at 1.4)
    for ix in range(-2, 3):
        for iz in range(-2, 3): gB(b, 3.5, 0.04, 3.5, ix * 3.6, 1.41, iz * 3.6, STONE2 if (ix + iz) % 2 == 0 else STONE, 0)   # checker paving
    gFrame(b, 18.0, 18.0, 0.35, 0.16, 1.48, MAR)                                             # low coping all the way round
    gT(b, 8.75, 0.1, 0, 1.46, 0, GOLD, 'y', nu=56, nv=4)                                     # gold ring at the water's edge
    gT(g, 7.7, 0.06, 0, 1.46, 0, CYAN, 'y', nu=56, nv=4); gT(g, 5.6, 0.055, 0, 1.46, 0, PINK, 'y', nu=48, nv=4); gT(g, 3.9, 0.05, 0, 1.46, 0, GOLD, 'y', nu=40, nv=4)
    for k in range(12):                                                                      # rays of light across the deck
        a = k * math.pi / 6 + 0.26; gB(g, 0.09, 0.03, 1.6, math.cos(a) * 6.6, 1.435, math.sin(a) * 6.6, CYAN if k % 2 else PINK, 0, ry=-a + math.pi / 2)
    for sx in (-1, 1):
        for sz in (-1, 1):                                                                   # four lamp pillars on the deck corners
            x, z = sx * 8.1, sz * 8.1
            gB(b, 0.9, 0.5, 0.9, x, 1.65, z, MAR, 0.06); gC(b, 0.16, 2.5, x, 3.15, z, GOLD, 'y', n=8); gC(b, 0.3, 0.2, x, 4.45, z, GOLD, 'y', n=8)
            gS(g, 0.44, x, 4.9, z, WARM); gT(b, 0.3, 0.05, x, 2.2, z, GOLD, 'y', nu=12, nv=4)
    gB(b, 8.0, 1.4, 8.0, 0, 2.1, 0, ROSE, 0.14)                                              # the middle tier (top at 2.8)
    gFrame(b, 8.0, 8.0, 0.3, 0.14, 2.86, GOLD)
    gT(g, 3.3, 0.06, 0, 2.84, 0, PINK, 'y', nu=48, nv=4); gT(g, 2.35, 0.05, 0, 2.84, 0, CYAN, 'y', nu=40, nv=4)
    for sx in (-1, 1):
        for sz in (-1, 1):                                                                   # a leaping dolphin on every corner of the tier
            x, z = sx * 3.1, sz * 3.1
            gtube(b, [(x, 2.8, z), (x, 3.6, z), (x * 0.92, 4.3, z * 0.92), (x * 0.76, 4.65, z * 0.76), (x * 0.6, 4.55, z * 0.6)], [0.3, 0.27, 0.22, 0.17, 0.1], TEAL, 8)
            gS(b, 0.22, x * 0.62, 4.62, z * 0.62, TEAL); gB(b, 0.05, 0.5, 0.36, x, 3.9, z, TEAL, 0.02); gS(g, 0.05, x * 0.66, 4.7, z * 0.66, WARM)
    gC(b, 0.86, 3.0, 0, 4.3, 0, MAR, 'y', n=14)                                              # the column (box top at 6.0)
    for y in (3.3, 4.3, 5.2): gT(b, 0.88, 0.075, 0, y, 0, GOLD, 'y', nu=18, nv=4)
    for k in range(8):
        a = k * math.pi / 4; gB(b, 0.12, 2.6, 0.12, math.cos(a) * 0.86, 4.3, math.sin(a) * 0.86, STONE2, 0.02)
    gB(b, 2.2, 0.36, 2.2, 0, 5.82, 0, GOLD, 0.1); gB(b, 1.6, 0.1, 1.6, 0, 5.99, 0, ROSE, 0.03)
    gLp(g, [(0, 6.7), (0.5, 7.5), (0, 8.4)], 6, col=(0.75, 0.98, 1.0))                       # a crystal floating over the top
    gT(g, 0.95, 0.04, 0, 7.5, 0, PINK, 'y', nu=24, nv=4); gT(g, 1.25, 0.03, 0, 7.5, 0, CYAN, 'y', nu=28, nv=4)
    export('lm_fountain_body', b, shade=0.1); export('lm_fountain_glow', g)
lm_fountain()

# ----------------------------------------------------------------------------- HEDGE MAZE (one wall piece along x, 10.1 long, 1.6 thick, 5 high; leafy low-poly chunks over a vibrant green core)
LOW = True
def lm_hedge():
    r = _random.Random(11); b, g = new_bm(), new_bm()
    # Pure vibrant tropical hedge greens (high green, low red/blue so sunset lighting can never turn it gray)
    G0 = (0.04, 0.95, 0.20)   # rich vibrant emerald core
    G1 = (0.10, 1.00, 0.28)   # bright lush foliage
    G2 = (0.22, 1.00, 0.38)   # sunlit vivid leaves
    G3 = (0.38, 1.00, 0.50)   # bright lime-green highlights
    gB(b, 10.1, 5.0, 1.5, 0, 2.5, 0, G0, 0)
    for side in (-1, 1):
        for i in range(6):
            for j in range(3):
                x = -4.3 + i * 1.75 + r.uniform(-0.15, 0.15) + (0.5 if j % 2 else 0); y = 0.75 + j * 1.6 + r.uniform(-0.1, 0.1)
                c = r.choice((G1, G1, G2, G2, G3, G0)); s = r.uniform(1.55, 1.95)
                gB(b, s, s * 0.95, 0.95, x, y, side * (0.5 + r.uniform(0.0, 0.14)), c, 0, rx=r.uniform(-0.3, 0.3), ry=r.uniform(-0.3, 0.3), rz=r.uniform(-0.3, 0.3))
    for i in range(6):
        x = -4.4 + i * 1.76 + r.uniform(-0.1, 0.1); gB(b, 1.8, 0.9, 1.5, x, 4.75 + r.uniform(-0.1, 0.1), 0, r.choice((G2, G3)), 0, ry=r.uniform(-0.4, 0.4), rz=r.uniform(-0.2, 0.2))   # a wavy clipped top
    for sx in (-1, 1):
        gB(b, 1.58, 5.3, 1.58, sx * 5.0, 2.65, 0, G1, 0.04)                                    # end post meets in a tidy bright hedge corner
        gB(b, 1.3, 0.3, 1.3, sx * 5.0, 5.4, 0, (0.3, 1.0, 0.4), 0); gB(g, 0.42, 0.42, 0.42, sx * 5.0, 5.78, 0, (0.2, 1.0, 0.4), 0, ry=0.785)
    for k in range(12):
        side = r.choice((-1, 1)); c = r.choice(((0.2, 1.0, 0.4), (0.4, 1.0, 0.6), PINK, YELLOW, CYAN))
        gB(g, 0.18, 0.18, 0.08, r.uniform(-4.0, 4.0), r.uniform(0.8, 4.4), side * 0.83, c, 0)  # glowing blossoms & leaf sparks
    for side in (-1, 1):
        gB(b, 0.5, 0.2, 0.2, 0, 0.14, side * 0.88, STEEL, 0.02); gB(g, 0.34, 0.07, 0.05, 0, 0.17, side * 0.99, (0.2, 1.0, 0.4), 0)   # vibrant green uplight
    # Radiant neon green hedge canopy crest along the top
    gB(g, 9.8, 0.14, 0.35, 0, 4.96, 0, (0.25, 1.0, 0.45), 0)
    gB(g, 0.25, 0.14, 1.5, -4.9, 4.96, 0, (0.25, 1.0, 0.45), 0)
    gB(g, 0.25, 0.14, 1.5, 4.9, 4.96, 0, (0.25, 1.0, 0.45), 0)
    export('lm_hedge_body', b, shade=0.0); export('lm_hedge_glow', g)
lm_hedge()

def lm_maze_arch():        # the entrance gate: stands on the gap in the south wall (gap is 8.5 wide; the walls beside it are 5 high)
    b, g = new_bm(), new_bm()
    for sx in (-1, 1):       # the posts stand where the hedge on each side of the gap ends (x = +-3.45 .. 5), a little deeper than the hedge so they show
        gB(b, 1.3, 7.0, 2.0, sx * 4.0, 3.5, 0, (0.86, 0.84, 0.94), 0.1); gB(b, 1.6, 0.4, 2.3, sx * 4.0, 0.2, 0, GOLD, 0.06); gB(b, 1.5, 0.3, 2.2, sx * 4.0, 7.1, 0, GOLD, 0.06)
        gB(g, 0.5, 0.5, 0.5, sx * 4.0, 7.6, 0, (1.0, 0.85, 0.4), 0, ry=0.785)
        for sz in (-1, 1): gB(g, 0.08, 5.6, 0.06, sx * 4.0, 3.6, sz * 1.02, CYAN if sx > 0 else PINK, 0)
    gB(b, 9.2, 0.9, 1.1, 0, 6.55, 0, (0.18, 0.1, 0.3), 0.08)                                 # the lintel, well above the 5 m hedge
    for sz in (-1, 1):
        gB(g, 6.6, 0.1, 0.06, 0, 6.86, sz * 0.58, PINK, 0); gB(g, 6.6, 0.1, 0.06, 0, 6.24, sz * 0.58, CYAN, 0)
        for k in range(6): gB(g, 0.2, 0.2, 0.08, -3.0 + k * 1.2, 6.55, sz * 0.58, (1.0, 0.9, 0.5), 0, rz=0.785)
    gB(b, 3.2, 1.2, 0.3, 0, 7.6, 0, MAHOG, 0.06)                                             # a lit sign board over the gate
    for sz in (-1, 1): gB(g, 2.7, 0.7, 0.06, 0, 7.6, sz * 0.18, (0.2, 1.0, 0.62), 0)
    export('lm_maze_arch_body', b, shade=0.1); export('lm_maze_arch_glow', g)
lm_maze_arch()
LOW = False

# ----------------------------------------------------------------------------- CASINO: SLOT MACHINE (front toward +z; _body is white shades tinted by the cabinet colour)
def lm_slot():
    b, d, g = new_bm(), new_bm(), new_bm()
    gB(b, 2.2, 0.35, 1.8, 0, 0.175, 0, sh(0.7), 0.04)                                          # plinth
    gB(b, 2.0, 1.15, 1.7, 0, 0.92, -0.03, sh(1.0), 0.09)                                       # lower cabinet
    gB(d, 1.7, 0.55, 0.05, 0, 0.78, 0.82, INK, 0.02); gB(d, 1.25, 0.2, 0.3, 0, 0.45, 0.88, CHROME, 0.05); gB(d, 0.7, 0.07, 0.06, 0, 0.58, 0.86, DARK, 0.01)   # payout tray
    gB(b, 2.0, 0.2, 1.0, 0, 1.58, 0.45, sh(0.9), 0.05, rx=-0.22)                               # sloped control shelf
    for i, c in enumerate((PINK, CYAN, YELLOW, GREEN, ORANGE)): gB(g, 0.22, 0.07, 0.22, -0.7 + i * 0.35, 1.7, 0.62, c, 0.01)   # five glowing buttons
    gB(b, 2.2, 1.9, 1.8, 0, 2.3, 0, sh(1.0), 0.1)                                              # upper cabinet (reel window sits at y 1.5 - 2.9)
    gB(d, 1.74, 1.46, 0.05, 0, 2.2, 0.875, (0.03, 0.02, 0.07), 0.01)                           # dark window behind the game's reel panel
    for y in (1.45, 2.95): gB(d, 1.9, 0.13, 0.12, 0, y, 0.9, GOLD, 0.03)
    for sx in (-1, 1): gB(d, 0.14, 1.6, 0.12, sx * 0.87, 2.2, 0.9, GOLD, 0.03)                  # gold bezel round it
    for i in range(7):
        for sx in (-1, 1): gB(g, 0.08, 0.08, 0.06, sx * 0.97, 1.55 + i * 0.22, 0.96, (1.0, 0.9, 0.45), 0)
    gB(b, 2.2, 0.3, 1.8, 0, 3.05, 0, sh(0.92), 0.08)                                           # crown
    gB(b, 2.0, 0.55, 0.6, 0, 3.47, 0.1, sh(0.85), 0.08); gB(g, 1.6, 0.24, 0.05, 0, 3.47, 0.42, YELLOW, 0)   # marquee sign above the box
    for i in range(7): gB(g, 0.1, 0.1, 0.08, -0.9 + i * 0.3, 3.8, 0.4, PINK if i % 2 else CYAN, 0)
    gS(g, 0.17, 0, 3.95, 0.1, (1.0, 0.2, 0.25)); gC(d, 0.22, 0.14, 0, 3.78, 0.1, STEEL, 'y', n=10)   # the jackpot beacon
    for sx in (-1, 1):
        gB(g, 0.05, 2.8, 0.05, sx * 1.12, 1.9, 0.86, CYAN if sx > 0 else PINK, 0)               # neon edge on each side
    gC(d, 0.05, 1.0, 1.2, 2.0, 0.2, CHROME, 'y', n=8); gS(d, 0.15, 1.2, 2.55, 0.2, (0.95, 0.12, 0.2)); gB(d, 0.14, 0.32, 0.3, 1.13, 1.55, 0.2, STEEL, 0.03)   # the lever arm
    export('lm_slot_body', b, shade=0.12); export('lm_slot_detail', d); export('lm_slot_glow', g)
lm_slot()

# ----------------------------------------------------------------------------- CASINO: ROULETTE TABLE (felt top at 1.2 under the game's layout panel at 1.27; the wheel bowl is at x = -2.2)
def lm_roulette():
    b, d, g = new_bm(), new_bm(), new_bm()
    gB(b, 9.0, 0.1, 4.4, 0, 0.05, 0, GOLD, 0.03); gB(b, 8.7, 0.95, 4.1, 0, 0.55, 0, MAHOG, 0.1)
    for i in range(-3, 4):
        for sz in (-1, 1): gB(b, 0.7, 0.6, 0.06, i * 1.15, 0.6, sz * 2.07, (0.45, 0.17, 0.12), 0.02)   # panelled skirt
    gB(b, 8.8, 0.14, 4.2, 0, 1.13, 0, FELT, 0.03)                                              # felt, top at 1.2
    gFrame(b, 9.0, 4.4, 0.18, 0.3, 1.35, BURG)                                                 # padded rail round the table
    gFrame(d, 8.64, 4.04, 0.04, 0.05, 1.52, GOLD)
    gB(g, 8.5, 0.06, 0.05, 0, 0.14, 2.21, PINK, 0); gB(g, 8.5, 0.06, 0.05, 0, 0.14, -2.21, PINK, 0)
    for sx in (-1, 1): gB(g, 0.05, 0.06, 4.2, sx * 4.51, 0.14, 0, CYAN, 0)                     # neon under-glow
    for sx in (-1, 1):
        for sz in (-1, 1): gS(d, 0.22, sx * 4.5, 1.62, sz * 2.2, GOLD); gS(g, 0.1, sx * 4.5, 1.7, sz * 2.2, (1.0, 0.95, 0.7))
    gLp(b, [(0, 1.2), (1.72, 1.2), (1.72, 1.55), (1.52, 1.78), (1.3, 1.62), (1.18, 1.44), (0, 1.44)], 24, x=-2.2, z=0, col=MAHOG)    # the wheel bowl
    gT(d, 1.62, 0.07, -2.2, 1.74, 0, GOLD, 'y', nu=28, nv=4); gT(d, 1.28, 0.05, -2.2, 1.58, 0, GOLD, 'y', nu=24, nv=4)
    gT(g, 1.72, 0.04, -2.2, 1.3, 0, CYAN, 'y', nu=28, nv=4)
    gB(d, 1.4, 0.1, 0.5, 2.6, 1.28, -1.4, CHROME, 0.03); gB(d, 0.8, 0.5, 0.1, 3.2, 1.0, 2.1, GOLD, 0.02)   # dealer's chip tray and a brass plate
    for k in range(3):                                                                         # the dealer's own chip stacks and dice (decor on the felt edge)
        for q in range(4): gC(d, 0.2, 0.06, 1.6 + k * 0.5, 1.5 + q * 0.065, 1.55, [(0.85, 0.1, 0.15), INK, (1.0, 0.82, 0.2)][k], 'y', n=10)
    for k in range(2): gB(d, 0.2, 0.2, 0.2, 3.4 + k * 0.35, 1.32, 1.5 - k * 0.3, (0.98, 0.97, 0.94), 0.04, ry=0.5 + k)
    export('lm_roulette_body', b, shade=0.1); export('lm_roulette_detail', d); export('lm_roulette_glow', g)
lm_roulette()

def lm_roulwheel():        # the part that turns (origin at the hub, y = 0 is the wheel's seat)
    b, d, g = new_bm(), new_bm(), new_bm()
    gLp(b, [(0, 0.0), (1.22, 0.0), (1.22, 0.1), (0.95, 0.2), (0.55, 0.2), (0.25, 0.3), (0, 0.3)], 28, col=MAHOG)
    for i in range(37):
        a = 2 * math.pi * i / 37; c = (0.1, 0.62, 0.25) if i == 0 else ((0.82, 0.1, 0.16) if i % 2 else (0.07, 0.06, 0.1))
        gB(b, 0.5, 0.1, 0.17, math.cos(a) * 0.9, 0.2, math.sin(a) * 0.9, c, 0.01, ry=-a)
        a2 = a + math.pi / 37; gB(d, 0.5, 0.05, 0.025, math.cos(a2) * 0.9, 0.255, math.sin(a2) * 0.9, GOLD, 0, ry=-a2)   # gold divider after each pocket
    gT(d, 1.2, 0.055, 0, 0.1, 0, GOLD, 'y', nu=32, nv=4)
    gLp(d, [(0, 0.3), (0.3, 0.3), (0.12, 0.62), (0.07, 0.86), (0, 0.86)], 12, col=GOLD)
    for k in range(4):
        a = k * math.pi / 2; gB(d, 0.9, 0.06, 0.08, math.cos(a) * 0.45, 0.62, math.sin(a) * 0.45, GOLD, 0.01, ry=-a); gS(d, 0.09, math.cos(a) * 0.9, 0.66, math.sin(a) * 0.9, (0.95, 0.12, 0.2))
    gS(g, 0.1, 0, 0.94, 0, (1.0, 0.95, 0.6)); gS(g, 0.07, 1.04, 0.28, 0, (1.0, 1.0, 1.0))      # beacon on the hub and the little ivory ball riding the rim
    export('lm_roulwheel_body', b); export('lm_roulwheel_detail', d); export('lm_roulwheel_glow', g)
lm_roulwheel()

# ----------------------------------------------------------------------------- CASINO: BLACKJACK TABLE (round, 2.6 radius, with its five stools; origin on the floor at the table's centre)
def lm_bjtable():
    b, d, g = new_bm(), new_bm(), new_bm()
    gLp(b, [(0, 0.06), (1.1, 0.06), (0.8, 0.24), (0.45, 0.4), (0.4, 0.8), (1.0, 0.86), (0, 0.86)], 18, col=MAHOG)               # flared foot, stem, underside
    gC(b, 2.55, 0.22, 0, 0.9, 0, MAHOG, 'y', n=28); gC(b, 2.46, 0.1, 0, 1.0, 0, FELT, 'y', n=28)                                  # table top and felt
    gT(b, 2.5, 0.2, 0, 1.06, 0, BURG, 'y', nu=32, nv=6); gT(d, 2.2, 0.035, 0, 1.12, 0, GOLD, 'y', nu=32, nv=4)                    # padded rim and gold line
    for k in range(7):
        a = math.pi * 0.12 + k * math.pi * 0.126; gT(g, 0.26, 0.025, math.cos(a) * 1.6, 1.07, math.sin(a) * 1.6 + 0.2, (1.0, 0.85, 0.35), 'y', nu=14, nv=4)   # betting circles
    gB(d, 0.5, 0.18, 0.7, 0.9, 1.15, -1.2, INK, 0.04); gB(d, 0.34, 0.22, 0.34, 0.9, 1.25, -1.3, (0.9, 0.9, 0.95), 0.02)         # the card shoe
    for c in range(5): gB(d, 0.5, 0.02, 0.7, -1.2 + c * 0.55, 1.07, -1.0, (0.96, 0.94, 0.9), 0, ry=c * 0.2 - 0.3)                # a hand of cards
    for k, col in enumerate(((0.85, 0.1, 0.15), INK, (1.0, 0.82, 0.2), (0.2, 0.4, 1.0))):
        cx, cz = math.cos(k * 0.5 + 0.7) * 1.3, math.sin(k * 0.5 + 0.7) * 1.3 + 0.6
        for q in range(4): gC(d, 0.22, 0.06, cx, 1.11 + q * 0.07, cz, col, 'y', n=10)
    for k in range(5):
        a = math.pi * 0.15 + k * math.pi * 0.17; x, z = math.cos(a) * 3.5, math.sin(a) * 3.5
        gC(b, 0.5, 0.14, x, 0.72, z, BURG, 'y', n=12); gC(d, 0.09, 0.62, x, 0.34, z, GOLD, 'y', n=6); gC(d, 0.26, 0.05, x, 0.08, z, GOLD, 'y', n=10)   # stools
    export('lm_bj_body', b, shade=0.1); export('lm_bj_detail', d); export('lm_bj_glow', g)
lm_bjtable()
