# NEON INVASION - REMAKE : landmarks (pyramid, Ferris wheel, lighthouse, container yard, kiosk, clock tower, crashed UFO).
# Run by build_assets.py after props.py (uses its helpers and the g* wrappers).
# Everything here is written in GAME space (x right, y up, z toward the viewer) through the g* wrappers.
#
# The collision of every landmark is the set of plain boxes made in shared.js, which must not change. Each model is
# therefore built AROUND those boxes: every surface a player can stand on or bump into is where the box is.
# Model y = 0 is the bottom of the game's deco boxes (world y = 0.2); the paving is at model y = 0.2.
# Exports: lm_<name>_body (lit, true colours) and lm_<name>_glow (unlit neon), plus a few tinted single meshes.
GOLD = (1.0, 0.78, 0.24); GREEN = (0.235, 1.0, 0.62); YELLOW = (1.0, 0.9, 0.235); NVIOLET = (0.647, 0.42, 1.0)
NEON6 = (PINK, CYAN, NVIOLET, ORANGE, GREEN, YELLOW)        # same order as NEON6 in shared.js: one colour per pyramid step
WARM = (1.0, 0.93, 0.7)

def gFrust(bm, w0, d0, y0, w1, d1, y1, x=0, z=0, col=WHITE, x1=None, z1=None):
    """a box whose bottom and top rectangles differ in size and place (tapered pylon, slanted leg, spire)"""
    t = bmesh.new()
    def ring(w, d, y, cx, cz): return [t.verts.new((cx + sx * w / 2, -(cz + sz * d / 2), y)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    a = ring(w0, d0, y0, x, z); b2 = ring(w1, d1, y1, x if x1 is None else x1, z if z1 is None else z1)
    for i in range(4): t.faces.new((a[i], a[(i + 1) % 4], b2[(i + 1) % 4], b2[i]))
    t.faces.new(a[::-1]); t.faces.new(b2)
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    _append(bm, t, col)
def gLp(bm, prof, n, x=0, y=0, z=0, col=WHITE, colors=None):     # revolve (radius, y) round a vertical axis at x, z
    lathe(bm, [(p[0], p[1] + y) for p in prof], n=n, pos=(x, -z, 0), color=col, colors=colors)
def gPz(bm, prof, depth, z=0, col=WHITE, bev=0.05):              # cross-section as (x, y) points, extruded along z
    prism(bm, prof, depth, (0, -z, 0), col, bev, rot=(math.pi / 2, 0, 0), plane='XY')
def gFrame(bm, w, d, t, h, y, col, x=0, z=0):                    # four bars making a rectangular ring, outer size w x d
    gB(bm, w, h, t, x, y, z - d / 2 + t / 2, col, 0); gB(bm, w, h, t, x, y, z + d / 2 - t / 2, col, 0)
    gB(bm, t, h, d - 2 * t, x - w / 2 + t / 2, y, z, col, 0); gB(bm, t, h, d - 2 * t, x + w / 2 - t / 2, y, z, col, 0)
def on_faces(hw, fn):
    """run fn(put) once for each vertical face of a square of half-width hw. put(bm, along, h, thick, u, y, col, out) lays a plate on that face"""
    for (ax, s) in (('z', 1), ('z', -1), ('x', 1), ('x', -1)):
        def put(bm, along, h, thick, u, y, col, out=0.0, _ax=ax, _s=s):
            if _ax == 'z': gB(bm, along, h, thick, u, y, _s * (hw + out), col, 0)
            else: gB(bm, thick, h, along, _s * (hw + out), y, u, col, 0)
        fn(put)

# ----------------------------------------------------------------------------- THE NEON PYRAMID
# shared.js: 8 square steps, width 46 - 5.2 t, each 1.4 high (top at 11.2). Violet stone, a neon line under every lip,
# glowing glyphs on dark friezes, a gold-edged runner up the middle of each side, four obelisks round the summit.
def lm_pyramid():
    b, g = new_bm(), new_bm()
    ST = ((0.30, 0.21, 0.47), (0.25, 0.17, 0.41)); DEEP = (0.11, 0.07, 0.22); RUN = (0.50, 0.40, 0.70)
    for t in range(8):
        w = 46 - 5.2 * t; hw = w / 2; y0 = 1.4 * t; y1 = y0 + 1.4; c = NEON6[t % 6]; c2 = NEON6[(t + 3) % 6]
        gB(b, w, 1.5, w, 0, y1 - 0.75, 0, ST[t % 2], 0.14)
        def face(put):
            put(g, w + 0.12, 0.1, 0.1, 0, y1 - 0.2, c)                                 # neon line under the lip of the step
            put(b, 5.0, 1.38, 0.08, 0, y0 + 0.7, RUN)                                  # runner
            L = hw - 3.4
            for s in (-1, 1):
                put(g, 0.09, 1.36, 0.09, s * 2.55, y0 + 0.7, GOLD, 0.02)
                if L > 0.6: put(b, L, 0.72, 0.08, s * (2.9 + L / 2), y0 + 0.62, DEEP)   # dark frieze either side of the runner
                k = 0; u = 4.3
                while u < hw - 1.3:                                                    # glyphs
                    v = (k + t) % 3
                    if v == 0: put(g, 0.36, 0.36, 0.06, s * u, y0 + 0.62, c2, 0.05)
                    elif v == 1: put(g, 0.13, 0.5, 0.06, s * u - 0.15, y0 + 0.62, c2, 0.05); put(g, 0.13, 0.5, 0.06, s * u + 0.15, y0 + 0.62, c2, 0.05)
                    else: put(g, 0.5, 0.13, 0.06, s * u, y0 + 0.76, c2, 0.05); put(g, 0.5, 0.13, 0.06, s * u, y0 + 0.48, c2, 0.05)
                    k += 1; u += 2.7
        on_faces(hw, face)
        if t < 7:                                                                      # the runner continues across each tread
            for (dx, dz) in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                if dz:
                    gB(b, 5.0, 0.06, 2.5, 0, y1, dz * (hw - 1.3), RUN, 0)
                    for s in (-1, 1): gB(g, 0.09, 0.07, 2.6, s * 2.55, y1 + 0.02, dz * (hw - 1.3), GOLD, 0)
                else:
                    gB(b, 2.5, 0.06, 5.0, dx * (hw - 1.3), y1, 0, RUN, 0)
                    for s in (-1, 1): gB(g, 2.6, 0.07, 0.09, dx * (hw - 1.3), y1 + 0.02, s * 2.55, GOLD, 0)
    gFrame(g, 8.4, 8.4, 0.1, 0.06, 11.22, GOLD); gT(g, 2.0, 0.07, 0, 11.23, 0, PINK, 'y', nu=24, nv=4)
    for sx in (-1, 1):
        for sz in (-1, 1):                                                             # obelisks (made solid for the player in nx-props.js)
            gFrust(b, 0.8, 0.8, 11.2, 0.5, 0.5, 14.2, sx * 3.8, sz * 3.8, DEEP)
            gFrust(g, 0.5, 0.5, 14.2, 0.03, 0.03, 15.0, sx * 3.8, sz * 3.8, GOLD)
            gFrame(g, 0.86, 0.86, 0.06, 0.08, 12.0, PINK, sx * 3.8, sz * 3.8)
    export('lm_pyramid_body', b, shade=0.12); export('lm_pyramid_glow', g)
    m = new_bm(); gL(m, [(0, -2.5), (1.35, 0), (0, 2.5)], 6, WHITE); export('lm_crystal', m, smooth_deg=5)     # the floating crystal over the summit
lm_pyramid()

# ----------------------------------------------------------------------------- THE LIGHTHOUSE
# shared.js: 8 square steps, width 16 - 1.8 t, each 1.4 high (top at 11.2), red and white. The summit holds a loot cache,
# so it stays an open lookout: four columns carry the round tower, gallery, lantern room and cap above the player's head.
def lm_lighthouse():
    b, g = new_bm(), new_bm()
    # Classic bold nautical RED and pure WHITE striping
    RD = (0.96, 0.12, 0.20); WH = (0.98, 0.98, 1.0)
    ROOF = (0.94, 0.10, 0.18); TRIM = (0.88, 0.08, 0.16); WIN = (0.05, 0.07, 0.13); BEAM = (1.0, 0.35, 0.45)
    STEP = [RD, WH, RD, WH, RD, WH, RD, WH]                                               # alternating red and white tiers
    NEON_C = [WHITE, (1.0, 0.15, 0.25), WHITE, (1.0, 0.15, 0.25), WHITE, (1.0, 0.15, 0.25), WHITE, (1.0, 0.15, 0.25)]
    for t in range(8):
        w = 16 - 1.8 * t; y0 = 1.4 * t; y1 = y0 + 1.4
        gB(b, w, 1.5, w, 0, y1 - 0.75, 0, STEP[t], 0.04)
        gFrame(b, w + 0.14, w + 0.14, 0.2, 0.14, y1 - 0.05, WH if t % 2 == 0 else RD)    # contrasting coping round each step
        gFrame(g, w + 0.08, w + 0.08, 0.08, 0.08, y0 + 0.14, NEON_C[t])                  # neon sill line round every step
        gFrame(g, w + 0.12, w + 0.12, 0.05, 0.05, y1 - 0.02, NEON_C[(t + 1) % 8])
        if t in (1, 3, 5):
            def face(put, _c=((1.0, 0.2, 0.25), WHITE, (1.0, 0.2, 0.25))[(t - 1) // 2]):
                put(b, 0.8, 0.86, 0.1, 0, y0 + 0.66, WIN); put(g, 0.94, 0.07, 0.1, 0, y0 + 0.2, _c, 0.02); put(g, 0.7, 0.62, 0.04, 0, y0 + 0.66, tuple(0.35 * c for c in _c), 0.055)
            on_faces(w / 2, face)
    gB(b, 1.7, 1.2, 0.12, 0, 0.8, 8.0, (0.35, 0.18, 0.12), 0); gB(g, 1.9, 0.08, 0.08, 0, 1.45, 8.05, WARM, 0)   # door on the street side
    gB(b, 2.1, 0.16, 0.7, 0, 1.55, 8.3, RD, 0.05); gB(g, 2.1, 0.05, 0.05, 0, 1.43, 8.64, WHITE, 0)        # door canopy and its neon edge
    for sx in (-1, 1):
        for sz in (-1, 1):
            gC(b, 0.22, 3.1, sx * 1.3, 12.7, sz * 1.3, RD if sx * sz > 0 else WH, 'y', n=8); gC(b, 0.32, 0.25, sx * 1.3, 11.32, sz * 1.3, RD, 'y', n=8)
            gT(g, 0.24, 0.035, sx * 1.3, 12.2, sz * 1.3, WHITE, 'y', nu=10, nv=4); gT(g, 0.24, 0.035, sx * 1.3, 13.4, sz * 1.3, (1.0, 0.2, 0.25), 'y', nu=10, nv=4)   # glowing rings round the columns
    prof = [(0, 14.2), (2.0, 14.2), (2.0, 14.55), (1.62, 14.72), (1.55, 15.45), (1.49, 16.15), (1.43, 16.85), (1.36, 17.45), (1.36, 18.0), (1.9, 18.26), (2.4, 18.3), (2.4, 18.5), (0, 18.5)]
    gLp(b, prof, 14, colors=[RD, WH, RD, WH, RD, WH, RD, WH, RD, WH, RD, WH])
    gT(g, 1.72, 0.05, 0, 14.16, 0, WHITE, 'y', nu=20, nv=4); gT(g, 2.44, 0.07, 0, 18.26, 0, (1.0, 0.2, 0.25), 'y', nu=24, nv=4)
    gT(g, 1.5, 0.045, 0, 16.5, 0, WHITE, 'y', nu=20, nv=4); gT(g, 1.4, 0.045, 0, 17.45, 0, (1.0, 0.2, 0.25), 'y', nu=20, nv=4)   # neon bands round the tower
    for k in range(10):
        a = k * math.pi / 5; gC(b, 0.045, 0.9, math.cos(a) * 2.28, 18.95, math.sin(a) * 2.28, RD if k % 2 else WH, 'y', n=5)
    gT(b, 2.28, 0.05, 0, 19.4, 0, RD, 'y', nu=20, nv=4)
    gC(b, 1.3, 0.4, 0, 18.7, 0, WH, 'y', n=12)
    for k in range(8):
        a = k * math.pi / 4 + 0.39; gB(b, 0.1, 2.2, 0.1, math.cos(a) * 1.18, 20.0, math.sin(a) * 1.18, RD if k % 2 else WH, 0)
    gLp(b, [(0, 21.1), (1.6, 21.1), (1.55, 21.4), (1.05, 22.3), (0.36, 22.9), (0.12, 23.15), (0, 23.15)], 12, colors=[RD, WH, RD, WH, RD, WH])
    gT(g, 1.3, 0.05, 0, 21.8, 0, WHITE, 'y', nu=18, nv=4)
    gT(g, 0.9, 0.04, 0, 22.5, 0, (1.0, 0.2, 0.25), 'y', nu=16, nv=4)
    gS(b, 0.22, 0, 23.3, 0, RD); gC(b, 0.04, 1.0, 0, 23.9, 0, WH, 'y', n=5)
    gB(b, 0.6, 0.34, 0.03, 0.34, 24.15, 0, RD, 0.01); gS(g, 0.08, 0, 24.45, 0, WHITE)                  # pennant and a beacon bulb on the mast
    gLp(g, [(0, 19.0), (0.5, 19.1), (0.78, 19.9), (0.5, 20.8), (0, 20.9)], 10, col=WARM)   # the lens
    export('lm_lighthouse_body', b, shade=0.03, meta={'lens': [0, 19.95, 0]}); export('lm_lighthouse_glow', g)
lm_lighthouse()

# ----------------------------------------------------------------------------- CRYSTAL WHEEL (Ferris wheel)
# The turning part is modelled round its hub: wheel in the x-y plane, axle along z, gondolas hang at radius 22.
def lm_wheel():
    b, g = new_bm(), new_bm(); FR = (0.98, 0.66, 0.86); HUB = (0.3, 0.16, 0.55)        # candy-pink frame (was grey-white), violet hub
    for sz in (-1, 1):
        z = sz * 4
        gT(b, 22, 0.32, 0, 0, z, FR, 'z', nu=48, nv=6); gT(b, 14.5, 0.2, 0, 0, z, FR, 'z', nu=36, nv=5)
        gT(g, 22, 0.13, 0, 0, sz * 4.42, CYAN, 'z', nu=48, nv=4); gT(g, 14.5, 0.1, 0, 0, sz * 4.28, PINK, 'z', nu=36, nv=4)
        for k in range(12):
            a = k * math.pi / 6; ca, sa = math.cos(a), math.sin(a)
            gB(b, 20.6, 0.26, 0.26, ca * 11.9, sa * 11.9, z, FR, 0, rz=a)                # spoke
            for r in (4.5, 8.0, 11.5, 17.0, 19.6):                                      # bulbs along the spoke
                gB(g, 0.34, 0.34, 0.14, ca * r, sa * r, sz * 4.17, GOLD if k % 2 else WARM, 0, rz=a)
            for s in (-1, 1):                                                           # lacing between the inner ring and the rim
                a2 = a + s * math.pi / 12
                ax, ay, bx2, by2 = ca * 14.5, sa * 14.5, math.cos(a2) * 22, math.sin(a2) * 22
                gB(b, math.hypot(bx2 - ax, by2 - ay), 0.14, 0.14, (ax + bx2) / 2, (ay + by2) / 2, z, FR, 0, rz=math.atan2(by2 - ay, bx2 - ax))
        for k in range(48):                                                             # bulbs round the rim
            a = (k + 0.5) * math.pi / 24
            gB(g, 0.3, 0.3, 0.3, math.cos(a) * 22.42, math.sin(a) * 22.42, z, PINK if k % 2 else WARM, 0, rz=a)
        gC(b, 2.6, 0.4, 0, 0, sz * 4.6, HUB, 'z', n=16); gC(g, 1.9, 0.12, 0, 0, sz * 4.84, GOLD, 'z', n=16); gT(g, 2.6, 0.1, 0, 0, sz * 4.8, CYAN, 'z', nu=24, nv=4)
    for k in range(12):
        a = k * math.pi / 6
        gC(b, 0.14, 8.4, math.cos(a) * 22, math.sin(a) * 22, 0, FR, 'z', n=6)            # the rod each gondola hangs from
        a += math.pi / 12; gC(b, 0.09, 8.1, math.cos(a) * 14.5, math.sin(a) * 14.5, 0, FR, 'z', n=5)
    gC(b, 1.7, 9.2, 0, 0, 0, HUB, 'z', n=16, bev=0.15); gC(b, 0.8, 17.6, 0, 0, 0, STEEL, 'z', n=10)
    export('lm_wheel_body', b); export('lm_wheel_glow', g)
    # one gondola, hanging from its pivot at the origin. White shades take the cabin colour; the glass stays dark.
    m = new_bm(); GL = (0.05, 0.07, 0.12)
    gC(m, 0.2, 6.6, 0, 0, 0, sh(0.5), 'z', n=6)
    for sz in (-1, 1): gB(m, 0.16, 1.0, 0.16, 0, -0.45, sz * 2.9, sh(0.5), 0)
    gPz(m, [(-1.6, -1.02), (-1.3, -0.74), (-0.6, -0.56), (0.6, -0.56), (1.3, -0.74), (1.6, -1.02)], 6.7, 0, sh(1.0), 0.05)
    gPz(m, [(-1.4, -1.0), (1.4, -1.0), (1.45, -2.0), (1.25, -3.0), (1.0, -3.2), (-1.0, -3.2), (-1.25, -3.0), (-1.45, -2.0)], 6.2, 0, sh(0.88), 0.06)
    for sx in (-1, 1):
        gB(m, 0.07, 0.74, 5.3, sx * 1.42, -1.5, 0, GL, 0); gB(m, 0.08, 0.12, 6.24, sx * 1.46, -2.06, 0, sh(0.45), 0)
    for sz in (-1, 1): gB(m, 2.0, 0.74, 0.07, 0, -1.5, sz * 3.1, GL, 0)
    gB(m, 1.6, 0.1, 5.0, 0, -3.22, 0, sh(0.4), 0.03)
    export('lm_gondola', m)
    # the two pylons that carry the axle (shared.js: 3.5 x 3.5 x 27 columns at x = +-10), their bracing legs and the boarding deck
    b, g = new_bm(), new_bm(); DK = INDIGO
    for sx in (-1, 1):
        x = sx * 10
        gB(b, 4.0, 1.0, 4.0, x, 0.5, 0, DK, 0.12)
        gFrust(b, 3.3, 3.3, 1.0, 2.0, 2.0, 25.6, x, 0, FR)
        for y in (6.0, 11.0, 16.0, 21.0):
            w = 3.3 - (y - 1) / 24.6 * 1.3; gB(b, w + 0.22, 0.36, w + 0.22, x, y, 0, DK, 0.05)
        for sz in (-1, 1):
            gFrust(g, 0.16, 0.1, 1.2, 0.16, 0.1, 25.4, x, sz * 1.67, PINK, x1=x, z1=sz * 1.03)   # neon strip up the pylon
            gFrust(b, 0.9, 0.9, 0.0, 0.7, 0.7, 24.6, x, sz * 9.0, FR, x1=x, z1=sz * 1.2)          # bracing leg in the plane of the wheel
            gB(b, 1.5, 0.5, 1.5, x, 0.25, sz * 9.0, DK, 0.08)
            gB(b, 0.34, 0.34, 4.5, x, 9.0, sz * 3.85, FR, 0); gB(b, 0.3, 0.3, 2.3, x, 17.0, sz * 2.45, FR, 0)
        gB(b, 2.6, 2.6, 3.2, x, 26.6, 0, DK, 0.2); gC(g, 0.95, 0.12, x + sx * 1.34, 26.8, 0, GOLD, 'x', n=12)
        gB(g, 0.1, 0.1, 3.3, x + sx * 1.32, 25.5, 0, CYAN, 0)
    gB(b, 7.6, 0.3, 12.0, 0, 0.2, 0, PLUM, 0.04); gFrame(g, 7.7, 12.1, 0.1, 0.08, 0.34, CYAN)   # boarding deck under the wheel
    for sx in (-1, 1):
        for k in range(5): gB(g, 0.5, 0.05, 0.9, sx * 2.6, 0.36, -4.4 + k * 2.2, YELLOW, 0)      # step marks
    export('lm_wheel_support_body', b, shade=0.1); export('lm_wheel_support_glow', g)
lm_wheel()

# ----------------------------------------------------------------------------- CONTAINER YARD (shared.js: 12.2 x 2.6 x 2.6 per container, stacked one or two high; 2 x 2 x 1.3 crates)
LOW = True
def lm_container():
    b, d = new_bm(), new_bm(); L = 12.2; W = 2.6; Hh = 2.6; FR = (0.22, 0.18, 0.32); CAST = (0.14, 0.12, 0.2)
    gB(b, L - 0.3, Hh - 0.3, W - 0.16, 0, Hh / 2, 0, WHITE, 0)                             # full white shell so tinting remains 100% vibrant
    for sx in (-1, 1):
        for sz in (-1, 1):
            gB(b, 0.22, Hh, 0.22, sx * (L / 2 - 0.11), Hh / 2, sz * (W / 2 - 0.11), FR, 0.03)   # corner posts
            for y in (0.13, Hh - 0.13): gB(d, 0.3, 0.26, 0.3, sx * (L / 2 - 0.13), y, sz * (W / 2 - 0.13), CAST, 0)   # corner castings
        for y in (0.11, Hh - 0.11): gB(b, 0.2, 0.22, W, sx * (L / 2 - 0.1), y, 0, FR, 0.03)
    for sz in (-1, 1):
        for y in (0.11, Hh - 0.11): gB(b, L, 0.22, 0.2, 0, y, sz * (W / 2 - 0.1), FR, 0.03)   # rails
        for k in range(22): gB(b, 0.26, Hh - 0.5, 0.09, -L / 2 + 0.5 + k * (L - 1.0) / 21, Hh / 2, sz * (W / 2 - 0.06), (0.98, 0.98, 1.0), 0)   # corrugation
        gB(d, 2.6, 0.9, 0.05, sz * 2.4, 1.55, sz * (W / 2 - 0.01), (0.96, 0.96, 1.0), 0)     # shipping-line plate
        gB(d, 2.2, 0.14, 0.06, sz * 2.4, 1.72, sz * (W / 2 - 0.005), PINK, 0); gB(d, 1.5, 0.14, 0.06, sz * 2.4 - 0.35, 1.42, sz * (W / 2 - 0.005), CYAN, 0)
        gB(b, 0.08, Hh - 0.5, 1.1, L / 2 - 0.1, Hh / 2, sz * 0.57, WHITE, 0.02)               # door leaf takes full tint
        for dz in (0.25, 0.82): gC(d, 0.035, Hh - 0.4, L / 2 - 0.03, Hh / 2, sz * dz, CHROME, 'y', n=5)   # lock rods
        gB(d, 0.06, 0.1, 0.5, L / 2 - 0.02, 1.05, sz * 0.54, CHROME, 0)
    for k in range(10): gB(b, 0.3, 0.07, W - 0.5, -L / 2 + 0.9 + k * (L - 1.8) / 9, Hh - 0.13, 0, WHITE, 0)   # roof ribs
    for k in range(4): gB(b, 0.09, Hh - 0.5, 0.26, -L / 2 + 0.1, Hh / 2, -0.78 + k * 0.52, WHITE, 0)          # ribs on the closed end
    export('lm_container_body', b, shade=0.04); export('lm_container_detail', d)
    # three colourways on top of the shell: stripes and a big logo block on each long side, hazard-striped doors, and a neon edge
    COLW = [((1.0, 0.85, 0.15), (0.1, 0.95, 0.98), (1.0, 0.25, 0.7)), ((1.0, 0.45, 0.1), (0.08, 0.9, 1.0), (0.7, 0.4, 1.0)), ((0.2, 1.0, 0.6), (1.0, 0.2, 0.7), (1.0, 0.92, 0.25))]
    for v, (c1, c2, c3) in enumerate(COLW):
        a, gg = new_bm(), new_bm()
        for sz in (-1, 1):
            zf = sz * (W / 2 + 0.005)
            gB(a, L - 1.4, 0.22, 0.05, -0.2, 2.18, zf, c1, 0); gB(a, L - 1.4, 0.12, 0.05, -0.2, 0.55, zf, c2, 0)      # long stripes high and low
            gB(a, 3.1, 0.9, 0.06, -sz * 2.6 - 0.5, 1.4, zf + sz * 0.005, c2, 0.02); gB(a, 2.5, 0.12, 0.07, -sz * 2.6 - 0.5, 1.4, zf + sz * 0.012, WHITE, 0)   # big logo block + bar
            for k in range(5): gB(a, 0.34, 0.5, 0.07, -sz * 2.6 - 1.45 + k * 0.48, 1.15, zf + sz * 0.012, c3 if k % 2 else WHITE, 0)
            for k in range(6):   # hazard stripes on the doors
                gB(a, 0.04, 0.14, 1.0, L / 2 - 0.02, 0.35 + k * 0.28, sz * 0.57, (0.08, 0.07, 0.1) if k % 2 else c1, 0)
            gB(gg, L - 0.5, 0.06, 0.05, 0, Hh - 0.32, zf, c2, 0); gB(gg, L - 0.5, 0.06, 0.05, 0, 0.3, zf, c1, 0)    # neon lines along the shell
            gB(gg, 0.5, 0.1, 0.05, -sz * 2.6 - 0.5, 1.82, zf + sz * 0.02, c3, 0)
        for sx in (-1, 1):
            gB(gg, 0.05, 0.06, W - 0.2, sx * (L / 2 + 0.005), Hh - 0.3, 0, c2, 0)                                    # neon bar across each end
        export('lm_container_deco%d' % v, a, shade=0.1); export('lm_container_glow%d' % v, gg)
    WD = (0.5, 0.36, 0.2); WL = (0.64, 0.48, 0.28); WK = (0.36, 0.25, 0.14)
    def crate(cv, wd, wl, wk, accent, stencil):      # three crate looks: bare wood with a hot-pink stencil, painted teal, painted violet
        m = new_bm(); gg = new_bm()
        gB(m, 1.86, 1.2, 1.86, 0, 0.65, 0, wd, 0)
        for sx in (-1, 1):
            for sz in (-1, 1): gB(m, 0.2, 1.3, 0.2, sx * 0.9, 0.65, sz * 0.9, wl, 0.03)
            for y in (0.1, 1.2):
                gB(m, 0.16, 0.2, 1.7, sx * 0.92, y, 0, wl, 0); gB(m, 1.7, 0.2, 0.16, 0, y, sx * 0.92, wl, 0)
            gB(m, 0.06, 0.18, 2.0, sx * 0.95, 0.65, 0, wk, 0, rx=0.5); gB(m, 2.0, 0.18, 0.06, 0, 0.65, sx * 0.95, wk, 0, rz=0.5)   # diagonal braces
            gB(m, 0.05, 0.5, 0.9, sx * 0.945, 0.7, 0, stencil, 0.01); gB(m, 0.9, 0.5, 0.05, 0, 0.7, sx * 0.945, stencil, 0.01)  # stencilled label plates
            gB(gg, 0.04, 0.08, 0.7, sx * 0.97, 0.7, 0, accent, 0); gB(gg, 0.7, 0.08, 0.04, 0, 0.7, sx * 0.97, accent, 0)       # a glowing bar on each label
        for k in range(4): gB(m, 0.4, 0.05, 1.8, -0.66 + k * 0.44, 1.28, 0, wl if k % 2 else wd, 0)
        export('lm_crate' if cv == 0 else 'lm_crate%d' % cv, m, shade=0.12); export('lm_crate_glow%d' % cv, gg)
    crate(0, WD, WL, WK, PINK, (0.95, 0.9, 0.78))
    crate(1, (0.1, 0.5, 0.56), (0.16, 0.7, 0.74), (0.07, 0.36, 0.42), YELLOW, (1.0, 0.85, 0.2))
    crate(2, (0.4, 0.22, 0.62), (0.56, 0.34, 0.82), (0.28, 0.15, 0.46), CYAN, (0.96, 0.9, 1.0))
lm_container()
LOW = False

# ----------------------------------------------------------------------------- KIOSK (shared.js: 9 x 6 x 4 block with a loot cache on its flat roof; ticket booth and snack bar)
# _body is lit true colours; _trim is white and takes the block's neon colour.
def lm_kiosk():
    b, t = new_bm(), new_bm(); WIN = (0.06, 0.09, 0.16)
    gB(b, 8.7, 3.5, 5.7, 0, 1.75, 0, PLUM, 0.12); gB(b, 9.0, 0.5, 6.0, 0, 3.75, 0, INDIGO, 0.1)
    gFrame(t, 9.1, 6.1, 0.1, 0.1, 3.62, WHITE); gFrame(t, 8.8, 5.8, 0.08, 0.08, 0.5, WHITE)
    for sz in (-1, 1):
        gB(b, 5.6, 1.5, 0.1, 0, 2.2, sz * 2.86, WIN, 0.02)
        for s in (-1, 1): gB(t, 5.8, 0.07, 0.07, 0, 2.2 + s * 0.8, sz * 2.93, WHITE, 0); gB(t, 0.07, 1.6, 0.07, s * 2.86, 2.2, sz * 2.93, WHITE, 0)   # neon window frame
        gB(b, 6.2, 0.14, 0.34, 0, 1.38, sz * 2.94, CHROME, 0.03)
        for k in range(7): gB(t if k % 2 == 0 else b, 0.9, 0.07, 0.95, -2.7 + k * 0.9, 3.12, sz * 3.25, (0.95, 0.95, 1.0), 0, rx=sz * 0.42)   # striped awning
        for sx in (-1, 1): gB(t, 0.1, 3.0, 0.1, sx * 4.36, 1.9, sz * 2.86, WHITE, 0)
    gB(b, 0.1, 2.3, 1.3, 4.36, 1.4, 0, (0.1, 0.07, 0.16), 0.02); gB(t, 0.07, 0.07, 1.5, 4.42, 2.6, 0, WHITE, 0)
    for s in (-1, 1): gB(t, 0.07, 2.4, 0.07, 4.42, 1.4, s * 0.72, WHITE, 0)
    export('lm_kiosk_body', b, shade=0.1); export('lm_kiosk_trim', t)
lm_kiosk()

# ----------------------------------------------------------------------------- CLOCK TOWER (shared.js: 5 x 5 x 34 column with a loot cache on top)
# The game draws its own clock face on the +z side at model height 29.8; the other three sides get a modelled face.
def lm_clocktower():
    b, g = new_bm(), new_bm(); SAND = (0.88, 0.54, 0.32); SAND2 = (0.72, 0.4, 0.26); DK = INDIGO; FACE = (0.96, 0.93, 0.82); WIN = (0.06, 0.07, 0.14)
    gB(b, 5.3, 1.6, 5.3, 0, 0.8, 0, DK, 0.15); gB(b, 4.6, 25.4, 4.6, 0, 14.3, 0, SAND, 0.08)
    for sx in (-1, 1):
        for sz in (-1, 1): gB(b, 0.7, 25.4, 0.7, sx * 2.15, 14.3, sz * 2.15, SAND2, 0.06)
    for y in (7.0, 13.0, 19.0, 25.0):
        gB(b, 5.1, 0.4, 5.1, 0, y, 0, DK, 0.08); gFrame(g, 5.2, 5.2, 0.08, 0.08, y + 0.3, GOLD)
    for y in (4.0, 10.0, 16.0, 22.0):
        def face(put):
            put(b, 0.8, 2.4, 0.08, 0, y, WIN); put(g, 1.0, 0.08, 0.08, 0, y - 1.3, WARM, 0.02)
        on_faces(2.3, face)
    gB(b, 5.0, 6.0, 5.0, 0, 30.0, 0, (0.93, 0.82, 0.66), 0.12)                              # clock housing
    gT(g, 2.32, 0.1, 0, 29.8, 2.5, GOLD, 'z', nu=28, nv=4)                                  # bezel round the game's own clock face
    gC(g, 2.1, 0.06, 0, 29.8, -2.5, FACE, 'z', n=24); gT(g, 2.32, 0.1, 0, 29.8, -2.5, GOLD, 'z', nu=28, nv=4)
    gB(b, 0.16, 1.5, 0.06, 0.45, 30.35, -2.56, WIN, 0, rz=-0.6); gB(b, 0.16, 1.0, 0.06, -0.38, 30.1, -2.56, WIN, 0, rz=0.9)
    for sx in (-1, 1):
        gC(g, 2.1, 0.06, sx * 2.5, 29.8, 0, FACE, 'x', n=24); gT(g, 2.32, 0.1, sx * 2.5, 29.8, 0, GOLD, 'x', nu=28, nv=4)
        gB(b, 0.06, 1.5, 0.16, sx * 2.56, 30.35, 0.45, WIN, 0, rx=0.6); gB(b, 0.06, 1.0, 0.16, sx * 2.56, 30.1, -0.38, WIN, 0, rx=-0.9)
    gB(b, 5.4, 1.0, 5.4, 0, 33.5, 0, DK, 0.12); gFrame(g, 5.5, 5.5, 0.1, 0.1, 33.9, GOLD)
    for sx in (-1, 1):
        for sz in (-1, 1):
            gFrust(b, 0.7, 0.7, 34.0, 0.16, 0.16, 36.2, sx * 2.2, sz * 2.2, SAND2); gS(g, 0.2, sx * 2.2, 36.35, sz * 2.2, GOLD)
    export('lm_clocktower_body', b, shade=0.1); export('lm_clocktower_glow', g)
lm_clocktower()

# ----------------------------------------------------------------------------- CRASH SITE (the saucer: axis along y, flat top deck at y = +1.2 out to radius 9.5, as the walkable slope in shared.js expects)
def lm_ufo():
    b, g = new_bm(), new_bm(); H1 = (0.45, 0.9, 0.84); H2 = (0.58, 0.4, 0.95); DK = (0.17, 0.09, 0.33)   # mint and violet hull plates (was plain grey)
    prof = [(0, -2.7), (3.5, -2.6), (7.5, -2.0), (11.0, -1.2), (12.3, -0.75), (12.5, -0.45), (11.9, -0.1), (11.0, 0.37), (10.2, 0.8), (9.5, 1.2), (5.4, 1.2), (0, 1.2)]
    gLp(b, prof, 28, colors=[DK, H2, H2, H1, DK, DK, H1, H2, H1, H2, DK])
    gT(b, 5.15, 0.22, 0, 1.24, 0, DK, 'y', nu=24, nv=5); gT(g, 5.5, 0.07, 0, 1.24, 0, GREEN, 'y', nu=24, nv=4)   # collar under the glass dome
    gT(g, 10.6, 0.15, 0, 0.66, 0, PINK, 'y', nu=32, nv=4)
    for k in range(20):
        a = k * math.pi / 10; gS(g, 0.34, math.cos(a) * 12.4, -0.5, math.sin(a) * 12.4, CYAN if k % 2 else WARM)   # rim lights
    for k in range(14):
        a = (k + 0.5) * math.pi / 7; gB(b, 0.5, 0.1, 0.5, math.cos(a) * 7.6, 1.22, math.sin(a) * 7.6, H2, 0.02)     # deck studs
    gB(b, 2.2, 0.9, 1.3, 0, 1.6, -0.6, DK, 0.12); gB(g, 1.7, 0.4, 0.06, 0, 1.85, 0.07, GREEN, 0, rx=-0.4)           # the pilot's console under the dome
    gC(b, 0.07, 2.4, 7.2, 2.4, 1.0, DK, 'y', n=5); gS(g, 0.22, 7.2, 3.7, 1.0, GREEN)                                # antenna
    export('lm_ufo_body', b, shade=0.12); export('lm_ufo_glow', g)
lm_ufo()
