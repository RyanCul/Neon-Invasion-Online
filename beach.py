# NEON INVASION - REMAKE : beach props. Run by build_assets.py after landmarks2.py (uses cfaces, the g* wrappers and the colours defined before it).
# GAME space, y = 0 is the sand. Assets named bch_*; the ones called *_body are white shades that the game tints, *_detail keep true colours.
# Footprints match the collision circles made in game.html (umbrella pole r 0.35, sandcastle 3.2 square, tiki torch r 0.25, cooler r 0.55, lifeguard legs at +-1.4 / +-1.2).
SAND = (0.9, 0.78, 0.55); SAND2 = (0.82, 0.68, 0.45); SAND3 = (0.96, 0.86, 0.64); BAMB = (0.78, 0.6, 0.28); BAMB2 = (0.55, 0.38, 0.18)
LOW = True

def lm_umbrella():
    pole, top = new_bm(), new_bm()
    gC(pole, 0.075, 3.9, 0, 1.95, 0, (0.93, 0.93, 0.96), 'y', n=8); gC(pole, 0.12, 0.5, 0, 0.1, 0, STEEL, 'y', n=8); gS(pole, 0.11, 0, 4.0, 0, GOLD)
    gC(pole, 0.14, 0.12, 0, 3.0, 0, CHROME, 'y', n=8)                                    # the sliding collar
    n = 8; R = 2.45; H = 1.05; Y = 3.9
    faces = []
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n
        p0 = (math.cos(a0) * R, Y, math.sin(a0) * R); p1 = (math.cos(a1) * R, Y, math.sin(a1) * R); ap = (0, Y + H, 0)
        q0 = (p0[0] * 1.0, Y - 0.2, p0[2] * 1.0); q1 = (p1[0], Y - 0.2, p1[2])
        c = sh(1.0) if i % 2 == 0 else sh(0.5); cv = sh(0.9) if i % 2 == 0 else sh(0.42)
        faces.append(([ap, p1, p0], c)); faces.append(([p0, p1, q1, q0], cv))           # panel + scalloped valance, seen from outside
        ua = (0, Y + H - 0.04, 0); faces.append(([ua, p0, p1], sh(0.6 if i % 2 == 0 else 0.3)))   # the same panel seen from below, darker
        faces.append(([q0, q1, p1, p0], sh(0.55 if i % 2 == 0 else 0.25)))
        mid = ((q0[0] + q1[0]) / 2 * 1.04, Y - 0.38, (q0[2] + q1[2]) / 2 * 1.04)         # a little point hanging off each scallop
        faces.append(([q0, q1, mid], cv)); faces.append(([q1, q0, mid], sh(0.5)))
    cfaces(top, faces); gS(top, 0.15, 0, Y + H + 0.04, 0, sh(1.0))
    export('bch_umb_pole', pole, shade=0.0); export('bch_umb_top', top)
lm_umbrella()

def lm_lounger():
    b, d = new_bm(), new_bm()
    for sx in (-1, 1):
        gB(d, 0.07, 0.07, 1.75, sx * 0.4, 0.3, 0, (0.92, 0.92, 0.95), 0.02); gB(d, 0.07, 0.34, 0.07, sx * 0.4, 0.17, 0.82, (0.92, 0.92, 0.95), 0.02); gB(d, 0.07, 0.34, 0.07, sx * 0.4, 0.17, -0.5, (0.92, 0.92, 0.95), 0.02)
        gB(d, 0.07, 0.07, 1.0, sx * 0.4, 0.78, -0.95, (0.92, 0.92, 0.95), 0.02, rx=0.8)
        for z in (0.82, -0.5): gC(d, 0.11, 0.06, sx * 0.43, 0.1, z, RUBBER, 'x', n=8)
    gB(b, 0.78, 0.1, 1.2, 0, 0.42, 0.28, sh(1.0), 0.05); gB(b, 0.78, 0.1, 1.0, 0, 0.78, -0.9, sh(0.92), 0.05, rx=0.8)   # seat and a tilted back rest
    for k in range(5): gB(d, 0.8, 0.012, 0.1, 0, 0.475 + (0.0 if k < 3 else 0.0), 0.7 - k * 0.2, (0.96, 0.96, 0.98), 0)
    export('bch_lounger_body', b); export('bch_lounger_detail', d)
lm_lounger()

def lm_towel():
    b = new_bm()
    gB(b, 2.0, 0.05, 4.2, 0, 0.03, 0, sh(1.0), 0.015)
    for k in range(7): gB(b, 2.02, 0.012, 0.28, 0, 0.062, -1.8 + k * 0.6, sh(0.5), 0)
    for sx in (-1, 1):
        for k in range(8): gB(b, 0.05, 0.05, 0.1, sx * 1.0, 0.045, -2.05 + k * 0.58, sh(0.8), 0)
    export('bch_towel', b)
lm_towel()

def lm_torch():
    b, d = new_bm(), new_bm()
    gC(b, 0.095, 3.2, 0, 1.6, 0, BAMB, 'y', n=8, r2=0.075)
    for y in (0.5, 1.2, 1.9, 2.6): gT(b, 0.1, 0.03, 0, y, 0, BAMB2, 'y', nu=8, nv=4)
    gC(d, 0.26, 0.3, 0, 3.35, 0, (0.45, 0.28, 0.12), 'y', n=10, r2=0.34); gT(d, 0.3, 0.035, 0, 3.52, 0, GOLD, 'y', nu=12, nv=4)
    gC(d, 0.2, 0.06, 0, 3.5, 0, (0.15, 0.1, 0.06), 'y', n=10)
    export('bch_torch_body', b); export('bch_torch_detail', d)
lm_torch()

def lm_cooler():
    b, d = new_bm(), new_bm()
    gB(b, 0.95, 0.62, 0.62, 0, 0.35, 0, sh(1.0), 0.07); gB(d, 1.0, 0.12, 0.66, 0, 0.7, 0, (0.96, 0.96, 0.98), 0.05)
    gB(d, 0.5, 0.07, 0.08, 0, 0.8, 0, STEEL, 0.02); gB(d, 0.05, 0.3, 0.09, -0.5, 0.45, 0, STEEL, 0.02); gB(d, 0.05, 0.3, 0.09, 0.5, 0.45, 0, STEEL, 0.02)
    export('bch_cooler_body', b); export('bch_cooler_detail', d)
lm_cooler()

def lm_ball():
    b = new_bm(); cols = [(0.95, 0.15, 0.2), (1, 1, 1), (0.1, 0.5, 1.0), (1, 1, 1), (1.0, 0.85, 0.15), (1, 1, 1), (0.95, 0.15, 0.2), (1, 1, 1)]
    prof = [(0.0, -0.8)] + [(0.8 * math.sin(math.pi * k / 8), -0.8 * math.cos(math.pi * k / 8)) for k in range(1, 8)] + [(0.0, 0.8)]
    gLp(b, [(p[0], p[1] + 0.8) for p in prof], 12, colors=cols)
    export('bch_ball', b)
lm_ball()

def lm_star():
    b = new_bm()
    for k in range(5):
        a = k * 2 * math.pi / 5; gB(b, 0.62, 0.1, 0.2, math.cos(a) * 0.27, 0.07, math.sin(a) * 0.27, sh(1.0), 0.04, ry=-a, taper=(0.7, 0.3))
    gS(b, 0.22, 0, 0.1, 0, sh(0.95), scale=(1, 0.5, 1))
    export('bch_star', b)
lm_star()

def lm_shell():
    b = new_bm(); gS(b, 0.18, 0, 0.08, 0, sh(1.0), scale=(1.0, 0.55, 0.8))
    for k in range(5): gB(b, 0.03, 0.12, 0.3, (k - 2) * 0.07, 0.1, 0.0, sh(0.7), 0, ry=(k - 2) * 0.25)
    export('bch_shell', b)
lm_shell()

def lm_surf():
    b, d = new_bm(), new_bm()
    gS(b, 1.0, 0, 2.0, 0, sh(1.0), scale=(0.28, 2.0, 0.045)); gB(d, 0.04, 3.7, 0.02, 0, 2.0, 0.045, (0.97, 0.97, 1.0), 0)
    for k in range(3): gB(d, 0.48 - k * 0.08, 0.1, 0.012, 0, 1.2 + k * 0.7, 0.047, (0.1, 0.1, 0.16) if k % 2 else (1, 1, 1), 0)
    gB(d, 0.03, 0.45, 0.35, 0, 0.27, -0.2, (0.1, 0.1, 0.16), 0.01, taper=(0.3, 0.3))
    export('bch_surf_body', b); export('bch_surf_detail', d)
lm_surf()

def lm_castle():
    b, g = new_bm(), new_bm(); S = SAND; DS = SAND2; LS = SAND3
    gB(b, 3.5, 0.55, 3.5, 0, 0.27, 0, DS, 0.24)
    for sx in (-1, 1):                                                                    # curtain walls (1 m high, you can hop on them)
        gB(b, 0.72, 1.1, 2.4, sx * 1.3, 0.55, 0, S, 0.1); gB(b, 2.4, 1.1, 0.72, 0, 0.55, sx * 1.3, S, 0.1)
        for k in range(3):
            gB(b, 0.32, 0.26, 0.4, sx * 1.3, 1.22, -0.8 + k * 0.8, LS, 0.04); gB(b, 0.4, 0.26, 0.32, -0.8 + k * 0.8, 1.22, sx * 1.3, LS, 0.04)
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * 1.3, sz * 1.3
            gC(b, 0.52, 2.1, x, 1.05, z, S, 'y', n=10, r2=0.46); gC(b, 0.58, 0.18, x, 2.14, z, LS, 'y', n=10)
            gC(b, 0.5, 0.75, x, 2.6, z, (0.98, 0.35, 0.65) if sx * sz > 0 else (0.25, 0.8, 0.95), 'y', n=10, r2=0.02)    # pointed roofs
            gB(g, 0.12, 0.2, 0.1, x, 1.7, z + sz * 0.46, WARM, 0.02)                               # lit window slits
    gB(b, 1.55, 2.4, 1.55, 0, 1.2, 0, S, 0.12)                                           # keep
    for k in range(4): gB(b, 0.36, 0.3, 0.36, (k % 2 - 0.5) * 1.0, 2.55, (k // 2 - 0.5) * 1.0, LS, 0.04)
    gB(b, 0.7, 1.0, 0.2, 0, 0.5, 0.82, (0.25, 0.17, 0.1), 0.04); gB(g, 0.5, 0.1, 0.05, 0, 1.05, 0.92, WARM, 0)          # gate and lintel glow
    for sx in (-1, 1): gB(g, 0.16, 0.34, 0.06, sx * 0.4, 1.7, 0.8, WARM, 0.01)
    gC(b, 0.04, 1.5, 0, 3.35, 0, WHITE, 'y', n=5); gB(g, 0.7, 0.4, 0.03, 0.36, 3.85, 0, PINK, 0)
    for k in range(6):
        a = k * 1.1 + 0.4; gS(b, 0.1, math.cos(a) * 2.05, 0.1, math.sin(a) * 2.05, LS, scale=(1, 0.6, 1))
    export('bch_castle_body', b, shade=0.06); export('bch_castle_glow', g)
lm_castle()

def lm_net():
    b, d = new_bm(), new_bm()
    for sx in (-1, 1):
        gC(b, 0.12, 3.5, sx * 5, 1.75, 0, (0.88, 0.88, 0.92), 'y', n=8); gC(b, 0.14, 1.2, sx * 5, 1.2, 0, (0.9, 0.12, 0.2), 'y', n=8)
        gC(d, 0.13, 0.5, sx * 5, 2.65, 0, (1, 1, 1), 'y', n=8); gS(d, 0.15, sx * 5, 3.55, 0, GOLD)
    gB(d, 10.0, 0.1, 0.04, 0, 3.3, 0, (1, 1, 1), 0); gB(d, 10.0, 0.06, 0.04, 0, 2.1, 0, (1, 1, 1), 0)
    for k in range(26): gB(d, 0.014, 1.2, 0.012, -4.9 + k * 0.392, 2.7, 0, (0.92, 0.92, 0.95), 0)
    for k in range(5): gB(d, 9.9, 0.012, 0.012, 0, 2.2 + k * 0.22, 0, (0.92, 0.92, 0.95), 0)
    for sx in (-1, 1): gC(d, 0.012, 1.2, sx * 4.8, 3.9, 0, (0.95, 0.15, 0.15), 'y', n=4)                               # the antennas
    export('bch_net_body', b); export('bch_net_detail', d)
lm_net()

def lm_tower():          # lifeguard tower. Legs at +-1.4 / +-1.2 (the game's collision circles), deck at 3.4, cabin above, ladder at x = -2.2
    b, d, g = new_bm(), new_bm(), new_bm(); WH = (0.97, 0.97, 1.0); RD = (1.0, 0.24, 0.35); TEAL = (0.12, 0.8, 0.86)
    for sx in (-1, 1):
        for sz in (-1, 1):
            gC(b, 0.12, 3.4, sx * 1.4, 1.7, sz * 1.2, WH, 'y', n=8)
            for y in (0.7, 1.5): gC(b, 0.125, 0.3, sx * 1.4, y, sz * 1.2, RD, 'y', n=8)
    for sx in (-1, 1): gB(b, 0.07, 0.07, 3.0, sx * 1.4, 1.9, 0, WH, 0.01, rx=0.7); gB(b, 0.07, 0.07, 3.0, sx * 1.4, 1.9, 0, WH, 0.01, rx=-0.7)   # cross braces
    gB(b, 3.6, 0.2, 3.2, 0, 3.4, 0, WH, 0.04)                                           # deck
    gB(b, 3.2, 2.0, 2.8, 0, 4.5, 0, RD, 0.08)                                           # cabin
    for k in range(5): gB(b, 3.22, 0.1, 2.82, 0, 3.7 + k * 0.4, 0, WH, 0)               # white boards on the red cabin
    gB(b, 3.7, 0.2, 3.3, 0, 5.62, 0, WH, 0.05); gB(b, 3.4, 0.12, 3.0, 0, 5.8, 0, TEAL, 0.05)
    gB(d, 1.4, 0.9, 0.06, 0, 4.7, 1.42, (0.1, 0.18, 0.3), 0.01); gB(g, 1.3, 0.8, 0.04, 0, 4.7, 1.45, (0.6, 0.95, 1.0), 0)  # front window
    gB(g, 0.9, 0.16, 0.05, 0, 3.95, 1.43, YELLOW, 0)                                    # glowing sign strip
    gB(d, 0.07, 0.55, 0.07, 0.4, 4.0, 1.44, (1, 1, 1), 0); gB(d, 0.55, 0.07, 0.07, 0.4, 4.0, 1.44, (1, 1, 1), 0)         # white cross
    for sx in (-1, 1): gB(b, 0.07, 0.5, 3.2, sx * 1.8, 3.75, 0, WH, 0.01)              # deck rails
    gB(b, 3.6, 0.5, 0.07, 0, 3.75, 1.6, WH, 0.01)
    gC(b, 0.04, 2.2, 1.5, 6.5, 0, WH, 'y', n=6); gB(g, 0.9, 0.5, 0.03, 1.95, 7.3, 0, YELLOW, 0)
    for s in range(3): gB(b, 1.0, 0.1, 0.5, -2.2, 0.3 + s * 0.9, 1.6 - s * 0.3, WH, 0.02)      # the steps (their positions are in game.html too)
    gS(d, 0.28, -1.9, 4.2, 1.55, (1.0, 0.45, 0.1), scale=(1, 0.5, 1)); gT(d, 0.28, 0.07, -1.9, 4.2, 1.55, (1, 1, 1), 'y', nu=14, nv=4)   # a rescue ring on the rail
    export('bch_tower_body', b, shade=0.08); export('bch_tower_detail', d); export('bch_tower_glow', g)
lm_tower()
LOW = False
