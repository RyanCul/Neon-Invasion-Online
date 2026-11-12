# NEON INVASION - REMAKE : the invaders.  Run by build_assets.py (shares its modelling helpers).
#
# One hand-built design per enemy type, each with its own silhouette, palette and props, so you can tell
# them apart at a glance in a crowd.  Every design is split into the rigid pieces the game animates:
#   body (+ optional extras), two legs, two arms.  Limb pieces are modelled hanging from their pivot
#   (hip / shoulder at the origin).  A single limb model is mirrored for the other side.
# Colours are painted per face; the alpha of a colour is how strongly that surface glows in game.
# Blender space: +Z up, the alien faces -Y.  Standard humanoid: feet z=0, hips z=1.3, shoulders z=2.5, head z=3.1.
LOW = True
PI = math.pi

def H(x, k=1.0, g=0.0):
    return (min(1.0, ((x >> 16) & 255) / 255 * k), min(1.0, ((x >> 8) & 255) / 255 * k), min(1.0, (x & 255) / 255 * k), g)
def ell(bm, r, pos, col, rot=(0, 0, 0), u=10, v=6): sphere(bm, 1.0, pos, col, r, u, v, rot)
def cone(bm, r, h, pos, col, rot=(0, 0, 0), n=6): cyl(bm, r, h, pos, col, n=n, r2=0.012, rot=rot)       # tip points +Z before rot (rx=+90deg: forward, rx=180: down)
def limb(bm, a, b, r0, r1, col, m=7): tube(bm, [a, b], [r0, r1], m, col)
WHITE_ = H(0xf4f4f0); BLACK_ = H(0x0c0a12); BONE = H(0xf2ecd2); STEEL_ = H(0xb8c2d4); IRON = H(0x3a3a46); GOLD = H(0xffd23c, 1, 0.12)

def leg_std(c_thigh, c_shin, c_knee, c_foot, th=0.2, foot=(0.36, 0.56, 0.2), toes=0, c_toe=None):
    bm = new_bm()
    limb(bm, (0, 0, 0.02), (0, -0.07, -0.62), th * 1.12, th * 0.88, c_thigh)
    ell(bm, (th * 0.95, th, th * 0.95), (0, -0.09, -0.64), c_knee, u=8, v=5)
    limb(bm, (0, -0.07, -0.64), (0, 0.04, -1.14), th * 0.82, th * 0.62, c_shin)
    box(bm, foot, (0, -0.12, -1.3 + foot[2] / 2), c_foot, 0.06)
    for k in range(toes): cone(bm, 0.05, 0.2, ((k - (toes - 1) / 2) * 0.13, -0.12 - foot[1] / 2, -1.24), c_toe or c_foot, (PI / 2, 0, 0), 5)
    return bm

def arm_std(c_up, c_fore, c_joint, c_hand, th=0.15, fist=1.0, L=1.2):
    bm = new_bm()
    ell(bm, (th * 1.5, th * 1.5, th * 1.4), (0, 0, 0), c_joint, u=8, v=5)
    limb(bm, (0, 0, -0.05), (0, 0.02, -L * 0.5), th, th * 0.85, c_up)
    ell(bm, (th * 0.95,) * 3, (0, 0.02, -L * 0.52), c_joint, u=8, v=5)
    limb(bm, (0, 0.02, -L * 0.52), (0, -0.06, -L * 0.93), th * 0.9, th * 0.7, c_fore)
    ell(bm, (th * 1.15 * fist, th * 1.25 * fist, th * 1.35 * fist), (0, -0.08, -L * 1.02), c_hand, u=8, v=5)
    return bm

def bounds(bm):
    zs = [v.co.z for v in bm.verts]; return (min(zs), max(zs)) if zs else (0, 1)

def reg(t, name, s, body, leg=None, arm=None, hip=(0.4, 0.0, 1.3), sh=(0.95, 0.0, 2.5), ex=(), fly=False, **flags):
    """export one enemy.  leg / arm: one bmesh (mirrored to both sides) or a (minus-x side, plus-x side) pair"""
    obs = []; meta = {'n': name, 's': s, 'body': 'a%d_body' % t}
    if fly: meta['fly'] = 1
    meta.update(flags)
    z0, z1 = bounds(body); hgt = z1 - min(0.0, z0)
    obs.append(export('a%d_body' % t, body, smooth_deg=50, glow=True))
    def limbs(kind, src, piv):
        out = []
        if src is None: return out
        if isinstance(src, (tuple, list)):
            for i, sx in enumerate((-1, 1)):
                nm = 'a%d_%s%d' % (t, kind, i); ob = export(nm, src[i], smooth_deg=50, glow=True)
                ob.location = (sx * piv[0], piv[1], piv[2]); obs.append(ob); out.append({'g': nm, 'p': Tm((sx * piv[0], piv[1], piv[2])), 'mx': 1})
        else:
            nm = 'a%d_%s' % (t, kind); ob = export(nm, src, smooth_deg=50, glow=True)
            ob.location = (piv[0], piv[1], piv[2]); obs.append(ob)
            ob2 = ob.copy(); bpy.context.scene.collection.objects.link(ob2); ob2.location = (-piv[0], piv[1], piv[2]); ob2.scale = (-1, 1, 1); PREVIEW.append(ob2); obs.append(ob2)
            for sx in (-1, 1): out.append({'g': nm, 'p': Tm((sx * piv[0], piv[1], piv[2])), 'mx': sx})
        return out
    meta['legs'] = limbs('leg', leg, hip); meta['arms'] = limbs('arm', arm, sh)
    xs = []
    for k, e in enumerate(ex):
        nm = 'a%d_x%d' % (t, k); ob = export(nm, e['bm'], smooth_deg=50, glow=True)
        par = e.get('par', 'hum'); p = e.get('p', (0, 0, 0))
        base = (0, 0, 0)
        if par == 'arm1': base = (sh[0], sh[1], sh[2])
        elif par == 'arm0': base = (-sh[0], sh[1], sh[2])
        ob.location = (base[0] + p[0], base[1] + p[1], base[2] + p[2]); obs.append(ob)
        d = {'g': nm, 'p': Tm(p), 'par': par}
        if e.get('role'): d['role'] = e['role']
        if e.get('add'): d['add'] = 1
        xs.append(d)
    if xs: meta['ex'] = xs
    ALIENS[t] = meta; ALIEN_SHEET.append({'t': t, 'name': name, 'obs': obs, 'h': max(hgt, 1.5)})

def ring_ex(R, r, col, z=0.0):
    bm = new_bm(); torus(bm, R, r, (0, 0, 0), col, axis='Z', nu=20, nv=5); return {'bm': bm, 'p': (0, 0, z), 'role': 'ring'}

# ============================================================================= 0  FOOT SOLDIER
def a_grunt():
    skin = H(0x46e89a); skin2 = H(0x2fb878); suit = H(0x2b2145); trim = H(0x6a58a8); eye = H(0x05030a); lamp = H(0xfff3b0, 1, 1)
    b = new_bm()
    box(b, (0.74, 0.46, 0.34), (0, 0, 1.36), suit, 0.09)
    tube(b, [(0, 0.02, 1.5), (0, 0, 2.0), (0, -0.02, 2.5)], [0.33, 0.4, 0.5], 8, suit)
    box(b, (0.16, 0.06, 1.0), (-0.16, -0.42, 2.02), trim, 0.02, rot=(0.08, 0.5, 0)); box(b, (0.16, 0.06, 1.0), (0.16, -0.42, 2.02), trim, 0.02, rot=(0.08, -0.5, 0))   # crossed harness
    cyl(b, 0.17, 0.1, (0, -0.47, 2.06), trim, n=8); cyl(b, 0.11, 0.12, (0, -0.48, 2.06), lamp, n=8)                                                                   # chest lamp
    box(b, (0.52, 0.5, 0.2), (0.62, 0, 2.62), trim, 0.06, rot=(0, -0.25, 0)); cone(b, 0.08, 0.3, (0.74, 0, 2.8), BONE, (0, 0.5, 0))                                   # one shoulder guard
    limb(b, (0, 0, 2.5), (0, -0.02, 2.82), 0.17, 0.15, skin2)
    ell(b, (0.66, 0.7, 0.6), (0, 0.0, 3.22), skin, u=12, v=7); ell(b, (0.6, 0.68, 0.5), (0, 0.14, 3.6), skin, u=12, v=6)                                               # the big dome
    ell(b, (0.3, 0.3, 0.26), (0, -0.32, 2.94), skin2)                                                                                                                  # little chin
    for sx in (-1, 1):
        ell(b, (0.25, 0.1, 0.36), (sx * 0.3, -0.56, 3.24), eye, rot=(0.12, sx * 0.5, 0), u=8, v=6); ell(b, (0.05, 0.03, 0.07), (sx * 0.36, -0.66, 3.36), lamp, u=6, v=4)   # huge black eyes with a glint
        limb(b, (sx * 0.24, 0.2, 3.95), (sx * 0.42, 0.34, 4.4), 0.03, 0.02, skin2, 5); ell(b, (0.08, 0.08, 0.08), (sx * 0.43, 0.35, 4.44), lamp, u=6, v=4)             # antennae
    box(b, (0.2, 0.04, 0.03), (0, -0.6, 2.9), eye)
    box(b, (0.3, 0.2, 0.28), (-0.42, 0.06, 1.42), trim, 0.05)                                                                                                          # belt pouch
    leg = leg_std(suit, skin2, trim, suit, 0.19, toes=2, c_toe=skin)
    arm = arm_std(skin, skin2, suit, skin, 0.13)
    for k in (-1, 0, 1): cone(arm, 0.035, 0.2, (k * 0.07, -0.12, -1.34), skin2, (PI + 0.2, 0, k * 0.3), 5)
    reg(0, 'FOOT SOLDIER', 0.85, b, leg, arm)

# ============================================================================= 1  ACID SLINGER
def a_spitter():
    skin = H(0xa56bff); skin2 = H(0x6f3fd0); dark = H(0x2a1a44); acid = H(0xb6ff1c, 1, 1); acid2 = H(0x7ad010, 1, 0.5); wh = H(0xf6f2d8)
    b = new_bm()
    box(b, (0.66, 0.46, 0.32), (0, 0.08, 1.36), dark, 0.09)
    tube(b, [(0, 0.12, 1.45), (0, 0.06, 1.95), (0, -0.14, 2.42)], [0.36, 0.46, 0.38], 8, skin)                                    # hunched back
    ell(b, (0.44, 0.36, 0.4), (0, -0.2, 1.82), skin2)                                                                              # pot belly
    for sx in (-1, 1):
        cyl(b, 0.2, 0.74, (sx * 0.27, 0.5, 2.12), acid2, axis='Z', n=8); cyl(b, 0.22, 0.1, (sx * 0.27, 0.5, 2.52), dark, axis='Z', n=8); cyl(b, 0.22, 0.1, (sx * 0.27, 0.5, 1.72), dark, axis='Z', n=8)   # acid tanks
        tube(b, [(sx * 0.27, 0.5, 2.56), (sx * 0.3, 0.3, 2.95), (sx * 0.2, -0.3, 3.0), (sx * 0.14, -0.72, 2.92)], 0.045, 5, dark)                                                                      # feed hoses
        limb(b, (sx * 0.2, -0.62, 3.4), (sx * 0.34, -0.74, 3.86), 0.05, 0.035, skin2, 5); ell(b, (0.13, 0.13, 0.13), (sx * 0.35, -0.76, 3.92), wh, u=8, v=5); ell(b, (0.06, 0.04, 0.06), (sx * 0.36, -0.87, 3.93), BLACK_, u=6, v=4)   # eye stalks
    tube(b, [(0, -0.12, 2.4), (0, -0.36, 2.78), (0, -0.6, 3.05)], [0.2, 0.17, 0.2], 7, skin2)                                     # long neck
    ell(b, (0.4, 0.5, 0.4), (0, -0.7, 3.2), skin, u=10, v=6)
    tube(b, [(0, -1.0, 3.12), (0, -1.3, 3.06), (0, -1.5, 3.04)], [0.2, 0.19, 0.27], 8, dark); cyl(b, 0.2, 0.05, (0, -1.5, 3.04), acid, n=8, rot=(PI / 2, 0, 0))   # blow-pipe snout
    ell(b, (0.33, 0.3, 0.34), (0, -0.66, 2.72), acid, u=10, v=6)                                                                    # glowing throat sac
    for k in range(4): ell(b, (0.07, 0.07, 0.1), ((k % 2) * 0.24 - 0.12, -1.5 - 0.02 * k, 2.78 - k * 0.12), acid, u=5, v=4)       # drips
    for k in range(5): cone(b, 0.08, 0.26, (0, 0.34 - k * 0.03, 2.6 - k * 0.24), dark, (-1.0, 0, 0), 5)                            # spine
    leg = leg_std(skin, skin2, dark, dark, 0.18, toes=3, c_toe=acid2)
    arm = arm_std(skin, skin2, dark, skin2, 0.12, L=1.3)
    for k in (-1, 1): cone(arm, 0.04, 0.3, (k * 0.07, -0.14, -1.5), acid2, (PI + 0.15, 0, k * 0.25), 5)
    reg(1, 'ACID SLINGER', 0.85, b, leg, arm, sh=(0.72, -0.1, 2.42))

# ============================================================================= 2  SCOUT DRONE  /  9  GUNSHIP
def a_drone():
    hull = H(0x25f4ff); hull2 = H(0x129ab8); dark = H(0x18223a); pink = H(0xff2fa0, 1, 1); glass = H(0xc8ffff, 1, 0.35); lamp = H(0xfff3b0, 1, 1)
    b = new_bm()
    lathe(b, [(0.0, -0.42), (0.36, -0.42), (0.5, -0.3), (0.95, -0.18), (1.34, -0.04), (1.42, 0.02), (1.3, 0.1), (0.95, 0.2), (0.74, 0.26), (0.0, 0.3)], 18, colors=[dark, dark, dark, hull2, dark, hull, hull, hull2, hull2])
    ell(b, (0.72, 0.72, 0.56), (0, 0, 0.36), glass, u=12, v=6)
    ell(b, (0.26, 0.26, 0.3), (0, 0, 0.42), H(0x46e89a), u=8, v=5); ell(b, (0.1, 0.05, 0.14), (-0.1, -0.24, 0.48), BLACK_, u=6, v=4); ell(b, (0.1, 0.05, 0.14), (0.1, -0.24, 0.48), BLACK_, u=6, v=4)   # the little pilot
    ell(b, (0.3, 0.3, 0.24), (0, 0, -0.46), pink, u=10, v=5); torus(b, 0.36, 0.06, (0, 0, -0.42), dark, axis='Z', nu=12, nv=5)      # the eye underneath
    for k in range(8):
        an = k * PI / 4; ell(b, (0.09, 0.09, 0.06), (1.2 * math.cos(an), 1.2 * math.sin(an), 0.14), lamp if k % 2 else pink, u=6, v=4)
    for k in range(3):
        an = k * 2.094 + 0.5; tube(b, [(0.7 * math.cos(an), 0.7 * math.sin(an), -0.24), (0.9 * math.cos(an), 0.9 * math.sin(an), -0.6), (0.82 * math.cos(an), 0.82 * math.sin(an), -0.86)], [0.05, 0.04, 0.02], 5, dark)
    limb(b, (0.3, 0.3, 0.8), (0.42, 0.42, 1.25), 0.025, 0.02, dark, 5); ell(b, (0.07, 0.07, 0.07), (0.43, 0.43, 1.3), pink, u=6, v=4)
    reg(2, 'SCOUT DRONE', 1.0, b, ex=[ring_ex(1.7, 0.08, pink)], fly=True)

def a_gunship():
    red = H(0xff2040); red2 = H(0xa8102a); dark = H(0x201826); glass = H(0xffd8d8, 1, 0.35); fire = H(0xff9a3c, 1, 1); lamp = H(0xffe8e8, 1, 1)
    b = new_bm()
    lathe(b, [(0.0, -0.36), (0.5, -0.34), (0.95, -0.16), (1.2, 0.0), (1.0, 0.14), (0.6, 0.24), (0.0, 0.28)], 14, colors=[dark, dark, red2, red, red, red2])
    box(b, (0.9, 1.5, 0.34), (0, -0.9, -0.02), red, 0.1, taper=(1.0, 1.0)); box(b, (0.6, 0.7, 0.26), (0, -1.75, -0.04), red2, 0.09)                    # long nose
    ell(b, (0.44, 0.7, 0.36), (0, -0.7, 0.26), glass, u=10, v=6)                                                                                        # canopy
    for sx in (-1, 1):
        cyl(b, 0.3, 1.5, (sx * 1.15, 0.1, -0.08), red2, n=8); cyl(b, 0.34, 0.2, (sx * 1.15, -0.58, -0.08), dark, n=8); cyl(b, 0.22, 0.08, (sx * 1.15, 0.87, -0.08), fire, n=8)   # engine pods
        box(b, (0.5, 0.5, 0.08), (sx * 0.72, 0.1, -0.02), dark, 0.02)
        cyl(b, 0.1, 1.2, (sx * 0.78, -1.0, -0.4), dark, n=6); cyl(b, 0.13, 0.16, (sx * 0.78, -1.62, -0.4), IRON, n=6); ell(b, (0.09, 0.09, 0.09), (sx * 0.78, -1.72, -0.4), lamp, u=6, v=4)   # cannons
        prism(b, [(0, 0), (0.9, -0.1), (1.1, 0.5), (0.3, 0.55)], 0.06, (sx * 0.7, 0.6, 0.2), red, rot=(0, sx * -0.5, 0), plane='YZ')                    # tail fins
    ell(b, (0.3, 0.3, 0.22), (0, 0.1, -0.42), dark, u=8, v=5); cyl(b, 0.07, 0.5, (0, -0.2, -0.5), IRON, n=6)
    for k in range(3): box(b, (0.2, 0.06, 0.04), (0, -1.2 - k * 0.2, 0.17), fire)
    reg(9, 'GUNSHIP', 1.6, b, ex=[ring_ex(1.75, 0.07, H(0xff2040, 1, 1))], fly=True)

# ============================================================================= 3  SIEGE BRUTE
def a_brute():
    hide = H(0xff9a3c); hide2 = H(0xd0701c); arm_ = H(0x3a2418); arm2 = H(0x5a3a26); eye = H(0xffe63c, 1, 1)
    b = new_bm()
    box(b, (1.0, 0.6, 0.4), (0, 0.02, 1.36), arm_, 0.1)
    ell(b, (0.74, 0.62, 0.6), (0, -0.04, 1.78), hide2, u=10, v=6)
    ell(b, (1.14, 0.78, 0.76), (0, 0.02, 2.46), hide, u=12, v=6)
    ell(b, (0.9, 0.62, 0.6), (0, 0.4, 2.8), arm_, u=10, v=6)                                                             # armoured hump
    for k in (-1, 0, 1): cone(b, 0.13, 0.5, (k * 0.44, 0.62, 3.14 - abs(k) * 0.12), BONE, (-0.5, k * 0.25, 0))
    for sx in (-1, 1):
        box(b, (0.6, 0.2, 0.52), (sx * 0.42, -0.62, 2.5), arm2, 0.07, rot=(0.12, 0, sx * -0.16))                         # chest slabs
        tube(b, [(sx * 0.2, -0.74, 2.66), (sx * 0.3, -0.98, 2.78), (sx * 0.32, -0.98, 3.06)], [0.08, 0.07, 0.02], 5, BONE)   # tusks
        ell(b, (0.07, 0.04, 0.05), (sx * 0.17, -0.82, 3.0), eye, u=6, v=4)
    for k in range(3): box(b, (0.7, 0.14, 0.14), (0, -0.56, 1.98 - k * 0.2), arm_, 0.04)
    ell(b, (0.4, 0.42, 0.36), (0, -0.48, 2.96), hide, u=10, v=6)                                                         # small head, sunk between the shoulders
    box(b, (0.56, 0.34, 0.24), (0, -0.62, 2.72), arm_, 0.07); box(b, (0.6, 0.2, 0.12), (0, -0.7, 3.06), arm_, 0.04, rot=(0.3, 0, 0))   # underbite + brow
    cone(b, 0.12, 0.4, (0, -0.5, 3.36), BONE, (0.3, 0, 0))
    ell(b, (0.2, 0.12, 0.2), (0, -0.66, 1.42), BONE, u=8, v=5)                                                            # skull buckle
    leg = leg_std(hide2, arm_, arm2, arm_, 0.3, foot=(0.56, 0.74, 0.24), toes=3, c_toe=BONE)
    arm = new_bm()
    ell(arm, (0.5, 0.5, 0.46), (0, 0, 0.05), arm_, u=10, v=6); cone(arm, 0.14, 0.5, (0.2, 0, 0.5), BONE, (0, 0.5, 0))
    limb(arm, (0, 0, -0.1), (0.04, 0, -0.8), 0.3, 0.27, hide); ell(arm, (0.3, 0.3, 0.3), (0.04, 0, -0.84), arm2, u=8, v=5)
    limb(arm, (0.04, 0, -0.84), (0, -0.14, -1.5), 0.3, 0.42, hide2)
    for k in range(3): torus(arm, 0.36 + k * 0.03, 0.05, (0.02, -0.06 - k * 0.04, -1.12 - k * 0.14), arm_, axis='Z', nu=10, nv=4)
    ell(arm, (0.44, 0.46, 0.4), (0, -0.18, -1.76), arm2, u=10, v=6)
    for k in range(4): box(arm, (0.16, 0.2, 0.18), ((k - 1.5) * 0.19, -0.5, -1.82), BONE, 0.05)
    reg(3, 'SIEGE BRUTE', 1.5, b, leg, arm, hip=(0.5, 0.0, 1.3), sh=(1.34, 0.0, 2.6))

# ============================================================================= 4  THE WARLORD
def a_warlord():
    mag = H(0xff2fa0); mag2 = H(0xb01470); dark = H(0x1e0e28); core = H(0xffffff, 1, 1); vis = H(0x8ffcff, 1, 1); cape_o = H(0x2a0f3a); cape_i = H(0x8a1466)
    b = new_bm()
    box(b, (0.9, 0.55, 0.36), (0, 0, 1.38), dark, 0.09)
    for k in range(5):                                                                                                       # armoured skirt
        an = (k - 2) * 0.62; box(b, (0.44, 0.1, 0.8), (0.56 * math.sin(an), -0.36 * math.cos(an) + 0.05, 1.02), mag2 if k % 2 else mag, 0.04, rot=(0.16 * math.cos(an), 0, -an * 0.6)); box(b, (0.46, 0.11, 0.08), (0.57 * math.sin(an), -0.37 * math.cos(an) + 0.05, 0.64), GOLD, 0.02, rot=(0, 0, -an * 0.6))
    tube(b, [(0, 0, 1.5), (0, 0, 2.0), (0, 0, 2.55)], [0.4, 0.5, 0.72], 8, mag)
    box(b, (0.9, 0.24, 0.5), (0, -0.52, 2.36), mag2, 0.08, rot=(0.12, 0, 0))
    torus(b, 0.27, 0.06, (0, -0.64, 2.14), GOLD, axis='Y', nu=12, nv=5); ell(b, (0.22, 0.14, 0.22), (0, -0.62, 2.14), core, u=10, v=5)                 # reactor
    for sx in (-1, 1):
        box(b, (0.74, 0.74, 0.3), (sx * 0.98, 0, 2.78), mag, 0.1, rot=(0, sx * 0.28, 0)); box(b, (0.6, 0.6, 0.2), (sx * 1.04, 0, 2.98), mag2, 0.07, rot=(0, sx * 0.28, 0))
        box(b, (0.78, 0.78, 0.07), (sx * 0.96, 0, 2.63), GOLD, 0.02, rot=(0, sx * 0.28, 0)); cone(b, 0.13, 0.55, (sx * 1.28, 0, 3.26), GOLD, (0, sx * 0.55, 0))
        cyl(b, 0.16, 0.95, (sx * 0.62, -0.1, 3.24), dark, n=8); cyl(b, 0.2, 0.2, (sx * 0.62, -0.52, 3.24), IRON, n=8); cyl(b, 0.11, 0.06, (sx * 0.62, -0.63, 3.24), vis, n=8)   # shoulder cannons
        tube(b, [(sx * 0.3, 0.06, 3.5), (sx * 0.74, 0.16, 3.76), (sx * 0.98, 0.1, 4.24), (sx * 0.8, -0.1, 4.7)], [0.15, 0.13, 0.09, 0.02], 6, GOLD)                             # great horns
    box(b, (1.9, 0.07, 2.5), (0, 0.5, 1.58), cape_o, 0.02, rot=(-0.13, 0, 0)); box(b, (1.7, 0.05, 2.3), (0, 0.45, 1.6), cape_i, 0.01, rot=(-0.13, 0, 0))                       # cape
    for k in range(4): prism(b, [(-0.24, 0), (0.24, 0), (0, -0.44)], 0.06, (-0.72 + k * 0.48, 0.67, 0.38), cape_o, rot=(PI / 2 - 0.13, 0, 0), plane='XY')                    # tattered hem
    limb(b, (0, 0, 2.6), (0, 0, 2.86), 0.2, 0.18, dark)
    ell(b, (0.44, 0.48, 0.5), (0, 0.02, 3.18), dark, u=10, v=6); box(b, (0.6, 0.2, 0.62), (0, -0.4, 3.12), GOLD, 0.06)
    box(b, (0.46, 0.06, 0.09), (0, -0.52, 3.24), vis); box(b, (0.1, 0.06, 0.34), (0, -0.52, 3.06), vis)                                                                       # T visor
    for k in (-1, 0, 1): cone(b, 0.09, 0.44 + (0.16 if k == 0 else 0), (k * 0.22, -0.16, 3.78), GOLD, (0.2, k * 0.25, 0))
    leg = leg_std(mag, dark, GOLD, mag2, 0.24, foot=(0.44, 0.66, 0.24))
    box(leg, (0.4, 0.14, 0.5), (0, -0.2, -0.28), mag2, 0.06); cone(leg, 0.08, 0.3, (0, -0.32, -0.6), GOLD, (PI / 2 - 0.6, 0, 0))
    arm = arm_std(mag, dark, mag2, dark, 0.19, fist=1.2)
    box(arm, (0.4, 0.42, 0.5), (0, -0.04, -0.94), mag2, 0.08); box(arm, (0.42, 0.44, 0.06), (0, -0.04, -0.72), GOLD, 0.02)
    for k in (-1, 0, 1): cone(arm, 0.05, 0.34, (k * 0.1, -0.16, -1.46), GOLD, (PI + 0.2, 0, k * 0.25), 5)
    reg(4, 'THE WARLORD', 2.8, b, leg, arm, hip=(0.42, 0, 1.3), sh=(1.02, 0, 2.5))

# ============================================================================= 5  SPRINTER
def a_sprinter():
    red = H(0xff4a3c); red2 = H(0xb82418); blk = H(0x1a1220); stripe = H(0xffe63c, 1, 0.6); vis = H(0xffe63c, 1, 1); blade = H(0xf0f4ff)
    b = new_bm()
    box(b, (0.56, 0.4, 0.3), (0, 0.06, 1.36), blk, 0.08)
    tube(b, [(0, 0.08, 1.42), (0, -0.08, 1.9), (0, -0.32, 2.42)], [0.25, 0.3, 0.4], 8, red)                                     # torso leans into the run
    box(b, (0.14, 0.06, 0.9), (0, -0.5, 2.02), stripe, 0.02, rot=(0.42, 0, 0)); box(b, (0.6, 0.5, 0.12), (0, -0.3, 2.5), blk, 0.04, rot=(0.4, 0, 0))
    tube(b, [(0, -1.0, 2.78), (0, -0.62, 2.98), (0, -0.1, 3.2), (0, 0.5, 3.42), (0, 1.05, 3.58)], [0.04, 0.3, 0.33, 0.2, 0.03], 8, red)   # dart-shaped head
    box(b, (0.5, 0.2, 0.09), (0, -0.66, 3.02), vis, 0.02, rot=(0.34, 0, 0))
    prism(b, [(0, 0), (0.9, 0.2), (0.2, 0.36)], 0.05, (0, 0.05, 3.42), red2, rot=(0, 0, 0), plane='YZ')                          # crest fin
    for sx in (-1, 1): prism(b, [(0, 0), (0.7, 0.12), (0.1, 0.3)], 0.05, (sx * 0.3, -0.1, 2.5), blk, rot=(0, sx * -0.6, 0), plane='YZ')   # back fins
    leg = new_bm()                                                                                                               # reverse-jointed runner legs
    limb(leg, (0, 0, 0.02), (0, -0.3, -0.5), 0.2, 0.15, red); ell(leg, (0.15, 0.16, 0.15), (0, -0.31, -0.52), blk, u=8, v=5)
    limb(leg, (0, -0.31, -0.52), (0, 0.2, -0.96), 0.13, 0.09, blk); limb(leg, (0, 0.2, -0.96), (0, -0.2, -1.26), 0.09, 0.08, red2)
    box(leg, (0.26, 0.4, 0.09), (0, -0.3, -1.26), blk, 0.03)
    for k in (-1, 1): cone(leg, 0.05, 0.26, (k * 0.08, -0.52, -1.24), blade, (PI / 2, 0, 0), 5)
    arm = arm_std(red, blk, blk, blk, 0.11, L=1.1)
    prism(arm, [(0.14, 0.2), (0.2, -0.5), (0.02, -1.5), (-0.14, -0.55), (-0.02, 0.1)], 0.05, (0, -0.02, -0.74), blade, rot=(0.1, 0, 0), plane='YZ')   # scythe
    box(arm, (0.08, 0.06, 0.5), (0, -0.2, -0.84), stripe, 0.01)
    reg(5, 'SPRINTER', 0.8, b, leg, arm, hip=(0.34, 0.06, 1.3), sh=(0.72, -0.2, 2.42))

# ============================================================================= 6  BLAST BUG
def a_bomber():
    yel = H(0xffe63c); blk = H(0x1c1c24); red = H(0xff2040, 1, 1); steel = H(0x9aa3b8); spark = H(0xffb030, 1, 1)
    b = new_bm()
    ell(b, (0.86, 0.86, 0.84), (0, 0, 2.06), blk, u=14, v=8)                                                                    # the bomb
    for k in range(10):
        an = k * PI / 5; box(b, (0.3, 0.07, 0.26), (0.85 * math.sin(an), -0.85 * math.cos(an), 2.06), yel if k % 2 else blk, 0.02, rot=(0, 0, an))   # hazard band
    cyl(b, 0.26, 0.2, (0, 0, 2.94), steel, axis='Z', n=8); tube(b, [(0, 0, 3.0), (0.06, 0.02, 3.28), (0.24, 0.04, 3.48), (0.42, 0.02, 3.5)], 0.045, 5, H(0xd8c8a0))
    ell(b, (0.14, 0.14, 0.14), (0.46, 0.02, 3.52), spark, u=6, v=4)
    for k in range(4): cone(b, 0.03, 0.2, (0.46, 0.02, 3.52), spark, (k * 1.6, 0.9, k * 1.1), 4)
    for sx in (-1, 1):
        cyl(b, 0.2, 0.16, (sx * 0.27, -0.72, 2.46), steel, n=8, rot=(PI / 2 - 0.3, 0, 0)); cyl(b, 0.14, 0.18, (sx * 0.27, -0.75, 2.47), red, n=8, rot=(PI / 2 - 0.3, 0, 0))   # goggles
        for k in range(3): ell(b, (0.04, 0.04, 0.04), (sx * (0.3 + k * 0.18), -0.78 + k * 0.08, 1.56), steel, u=5, v=3)        # rivets
    box(b, (0.66, 0.08, 0.06), (0, -0.83, 2.48), blk)
    for k in range(5): box(b, (0.09, 0.06, 0.12), ((k - 2) * 0.12, -0.84, 2.16), WHITE_, 0.02)                                 # a nervous grin
    leg = new_bm(); limb(leg, (0, 0, 0), (0, 0, -0.9), 0.13, 0.12, blk); box(leg, (0.4, 0.62, 0.3), (0, -0.14, -1.15), yel, 0.1); box(leg, (0.42, 0.64, 0.08), (0, -0.14, -1.27), blk, 0.02)
    arm = arm_std(blk, blk, blk, yel, 0.09, fist=1.7, L=0.9)
    core = new_bm(); ell(core, (0.26, 0.2, 0.26), (0, 0, 0), red, u=10, v=6); torus(core, 0.3, 0.05, (0, 0, 0), steel, axis='Y', nu=12, nv=4)
    reg(6, 'BLAST BUG', 0.85, b, leg, arm, hip=(0.34, 0, 1.3), sh=(0.92, 0, 2.2), ex=[{'bm': core, 'p': (0, -0.84, 1.86), 'role': 'pulse'}])

# ============================================================================= 7  ARMORED GRUNT
def a_knight():
    chrome = H(0xa8bce0); chrome2 = H(0x6f84b0); navy = H(0x26304e); cy = H(0x25f4ff, 1, 1); cloth = H(0x1c4fd8)
    b = new_bm()
    box(b, (0.8, 0.5, 0.34), (0, 0, 1.36), navy, 0.09)
    box(b, (1.24, 0.8, 0.9), (0, 0, 2.14), chrome, 0.16); box(b, (0.9, 0.2, 0.4), (0, -0.4, 2.3), chrome2, 0.07, rot=(0.1, 0, 0))
    for k in range(2): box(b, (0.8, 0.5, 0.16), (0, -0.04, 1.62 - k * 0.0 + k * 0.0), navy, 0.05)
    box(b, (0.5, 0.08, 1.0), (0, -0.42, 1.2), cloth, 0.02); prism(b, [(0, 0.16), (0.14, 0), (0, -0.16), (-0.14, 0)], 0.04, (0, -0.48, 1.32), cy, rot=(PI / 2, 0, 0), plane='XY')   # tabard + crest
    for sx in (-1, 1):
        ell(b, (0.5, 0.52, 0.4), (sx * 0.98, 0, 2.66), chrome, u=10, v=6); torus(b, 0.46, 0.06, (sx * 0.98, 0, 2.5), navy, axis='Z', nu=10, nv=4)
    torus(b, 0.32, 0.1, (0, 0, 2.66), chrome2, axis='Z', nu=10, nv=5)
    cyl(b, 0.48, 0.74, (0, 0, 3.16), chrome, axis='Z', n=10); cyl(b, 0.5, 0.08, (0, 0, 3.52), chrome2, axis='Z', n=10)           # bucket helm
    box(b, (0.72, 0.1, 0.07), (0, -0.44, 3.24), cy); box(b, (0.08, 0.1, 0.36), (0, -0.45, 3.02), cy)
    for k in (-1, 1): box(b, (0.05, 0.06, 0.2), (k * 0.2, -0.46, 2.96), BLACK_)
    prism(b, [(-0.44, 0), (0.5, 0), (0.56, 0.4), (-0.2, 0.34)], 0.08, (0, 0.02, 3.56), cloth, plane='YZ')                         # plume
    leg = leg_std(chrome, chrome2, navy, chrome, 0.21, foot=(0.4, 0.6, 0.22)); box(leg, (0.3, 0.14, 0.3), (0, -0.2, -0.62), chrome, 0.06)
    armL = arm_std(chrome2, chrome, navy, navy, 0.15)
    cyl(armL, 0.045, 1.3, (0, -0.5, -1.2), navy, n=6); cyl(armL, 0.09, 0.4, (0, -1.0, -1.2), cy, n=6)                              # shock baton
    armR = arm_std(chrome2, chrome, navy, navy, 0.15)
    box(armR, (1.05, 0.12, 1.75), (0.12, -0.42, -0.72), chrome, 0.1); box(armR, (0.82, 0.07, 1.5), (0.12, -0.5, -0.72), navy, 0.06)   # tower shield
    box(armR, (0.12, 0.08, 1.2), (0.12, -0.55, -0.72), cy); box(armR, (0.6, 0.08, 0.12), (0.12, -0.55, -0.5), cy)
    reg(7, 'ARMORED GRUNT', 1.15, b, leg, (armR, armL))

# ============================================================================= 8  FIELD MEDIC
def a_medic():
    wh = H(0xf0fff6); wh2 = H(0xc6e6d6); teal = H(0x1fae8a); teal2 = H(0x0f7a62); grn = H(0x3cff9e, 1, 1); dark = H(0x1a2a30); skin = H(0x7fe8c8)
    b = new_bm()
    lathe(b, [(0.36, 2.0), (0.46, 1.6), (0.62, 1.0), (0.78, 0.5), (0.74, 0.46)], 10, colors=[wh, wh, wh2, teal])                # long coat
    tube(b, [(0, 0, 1.9), (0, 0, 2.5)], [0.36, 0.46], 8, wh)
    box(b, (0.5, 0.06, 0.14), (0, -0.44, 2.14), grn); box(b, (0.14, 0.06, 0.5), (0, -0.44, 2.14), grn)                             # cross
    box(b, (1.0, 0.1, 0.14), (0, -0.2, 1.56), teal, 0.03)
    box(b, (0.64, 0.4, 0.8), (0, 0.5, 2.2), teal, 0.1); cyl(b, 0.03, 0.9, (0.2, 0.55, 3.0), dark, axis='Z', n=5)                  # backpack + aerial
    lathe(b, [(0.0, 0.0), (0.2, 0.06), (0.28, 0.16)], 8, (0.2, 0.55, 3.42), wh2); ell(b, (0.06, 0.06, 0.06), (0.2, 0.55, 3.52), grn, u=5, v=4)
    for sx in (-1, 1): tube(b, [(sx * 0.2, 0.5, 2.58), (sx * 0.3, 0.2, 2.84), (sx * 0.26, -0.2, 2.72)], 0.04, 5, teal2)
    limb(b, (0, 0, 2.5), (0, 0, 2.8), 0.15, 0.13, skin)
    ell(b, (0.42, 0.46, 0.52), (0, 0, 3.14), skin, u=10, v=6); box(b, (0.5, 0.26, 0.24), (0, -0.34, 2.98), wh, 0.06)             # mask
    torus(b, 0.44, 0.05, (0, 0, 3.36), dark, axis='Z', nu=12, nv=4); cyl(b, 0.17, 0.05, (0, -0.44, 3.42), STEEL_, n=8, rot=(PI / 2 - 0.2, 0, 0))   # head mirror
    for sx in (-1, 1): ell(b, (0.09, 0.05, 0.07), (sx * 0.18, -0.42, 3.2), grn, u=6, v=4)
    leg = leg_std(teal, teal2, teal2, wh, 0.14, foot=(0.3, 0.5, 0.2))
    armR = arm_std(wh, wh, teal, skin, 0.12)
    cyl(armR, 0.07, 0.36, (0, -0.3, -1.22), STEEL_, n=6); cyl(armR, 0.02, 0.3, (0, -0.6, -1.22), STEEL_, n=4); cyl(armR, 0.055, 0.24, (0, -0.32, -1.22), grn, n=6)   # syringe
    armL = arm_std(wh, wh, teal, skin, 0.12)
    cyl(armL, 0.045, 3.0, (0, -0.16, -0.7), dark, axis='Z', n=6); ell(armL, (0.2, 0.2, 0.34), (0, -0.16, 0.98), grn, u=6, v=4); torus(armL, 0.26, 0.035, (0, -0.16, 0.74), STEEL_, axis='Z', nu=10, nv=4)   # crystal staff
    reg(8, 'FIELD MEDIC', 0.9, b, leg, (armR, armL), hip=(0.26, 0, 1.3), sh=(0.62, 0, 2.44), ex=[ring_ex(0.7, 0.06, grn, 4.1)])

# ============================================================================= 10  MOTHER OF THEM ALL
def a_queen():
    vio = H(0x7a3be0); vio2 = H(0x4a1ca8); lav = H(0xe0c8ff); mag = H(0xff5ad8, 1, 1); egg = H(0xffb8f0, 1, 0.7)
    b = new_bm()
    ell(b, (0.82, 1.3, 0.78), (0, 1.0, 1.2), vio2, u=12, v=7)                                                                     # the egg sac
    for k in range(4): torus(b, 0.8 - abs(k - 1.2) * 0.14, 0.05, (0, 0.4 + k * 0.42, 1.2), vio, axis='Y', nu=12, nv=4)
    for k in range(5):
        for sx in (-1, 1): ell(b, (0.16, 0.16, 0.16), (sx * (0.6 - abs(k - 2) * 0.1), 0.45 + k * 0.32, 1.52 - (k % 2) * 0.5), egg, u=6, v=4)
    cone(b, 0.2, 0.6, (0, 2.36, 1.2), vio, (-PI / 2, 0, 0))
    lathe(b, [(0.34, 1.66), (0.42, 1.3), (0.66, 0.6), (0.84, 0.06), (0.8, 0.02)], 10, colors=[lav, lav, lav, GOLD])              # gown
    tube(b, [(0, 0, 1.6), (0, 0, 2.1), (0, 0, 2.52)], [0.3, 0.26, 0.4], 8, vio)
    for k in range(5):
        an = (k - 2) * 0.42; prism(b, [(-0.16, 0), (0.16, 0), (0.06, 0.78), (-0.06, 0.78)], 0.05, (0.56 * math.sin(an), 0.2, 2.5 + 0.1 * math.cos(an * 2)), lav if k % 2 else GOLD, rot=(PI / 2 - 0.3, an * 0.9, 0), plane='XY')   # collar fan
    for sx in (-1, 1):
        tube(b, [(sx * 0.3, -0.1, 2.0), (sx * 0.5, -0.4, 1.8), (sx * 0.2, -0.56, 1.76)], [0.07, 0.06, 0.05], 5, vio)             # folded second pair of arms
        tube(b, [(sx * 0.3, 0.1, 3.3), (sx * 0.56, 0.3, 3.0), (sx * 0.62, 0.34, 2.4)], [0.06, 0.05, 0.02], 5, vio2)              # head tendrils
    limb(b, (0, 0, 2.5), (0, 0, 2.84), 0.12, 0.1, vio)
    ell(b, (0.34, 0.4, 0.5), (0, 0, 3.14), vio, u=10, v=6)
    for k in range(5): cone(b, 0.09, 0.7 + (0.36 if k == 2 else 0.0) - abs(k - 2) * 0.1, ((k - 2) * 0.17, 0.02, 3.86 + (0.18 if k == 2 else 0)), GOLD, (0, (k - 2) * 0.22, 0))   # crown
    ell(b, (0.09, 0.07, 0.12), (0, -0.3, 3.5), mag, u=6, v=4)
    for k in (-1, 0, 1): box(b, (0.14, 0.05, 0.05), (k * 0.17, -0.36, 3.2 + abs(k) * 0.04), mag, rot=(0, k * -0.3, 0))           # three eyes
    leg = leg_std(vio2, vio2, vio2, GOLD, 0.11, foot=(0.2, 0.36, 0.14))
    arm = arm_std(vio, vio, GOLD, vio, 0.09, L=1.4)
    for k in (-1, 0, 1): cone(arm, 0.028, 0.44, (k * 0.06, -0.14, -1.62), lav, (PI + 0.12, 0, k * 0.2), 4)
    reg(10, 'MOTHER OF THEM ALL', 1.3, b, leg, arm, hip=(0.24, 0, 1.3), sh=(0.6, 0, 2.5))

# ============================================================================= 11  SIEGE WALKER
def a_walker():
    red = H(0xc03030); red2 = H(0x7a1818); iron = H(0x34303a); iron2 = H(0x55505e); fire = H(0xff7a30, 1, 1); haz = H(0xffd23c)
    b = new_bm()
    box(b, (1.2, 0.8, 0.44), (0, 0, 1.4), iron, 0.1)
    box(b, (1.95, 1.25, 1.34), (0, 0.04, 2.3), iron2, 0.16)
    box(b, (1.6, 0.14, 0.5), (0, -0.62, 2.68), red, 0.05); box(b, (0.5, 0.14, 0.6), (-0.6, -0.62, 2.1), red, 0.05); box(b, (0.5, 0.14, 0.6), (0.6, -0.62, 2.1), red, 0.05)
    box(b, (0.6, 0.1, 0.56), (0, -0.6, 2.08), fire)                                                                               # furnace
    for k in range(5): box(b, (0.05, 0.12, 0.6), (-0.24 + k * 0.12, -0.64, 2.08), iron)
    for k in range(6): box(b, (0.16, 0.05, 0.12), (-0.7 + k * 0.28, -0.7, 1.72), haz if k % 2 else BLACK_)
    for k in range(3):
        x = (k - 1) * 0.5; cyl(b, 0.17, 0.9, (x, 0.5, 3.3 + (0.2 if k == 1 else 0)), iron, axis='Z', n=8); cyl(b, 0.2, 0.1, (x, 0.5, 3.76 + (0.2 if k == 1 else 0)), fire, axis='Z', n=8)   # smokestacks
    for sx in (-1, 1): cyl(b, 0.52, 0.5, (sx * 1.14, 0, 2.72), red, axis='X', n=10); cyl(b, 0.3, 0.56, (sx * 1.14, 0, 2.72), iron, axis='X', n=8)
    box(b, (0.52, 0.5, 0.42), (0, -0.4, 3.18), iron, 0.08); cyl(b, 0.14, 0.1, (0, -0.66, 3.2), fire, n=8)                         # tiny cyclops head
    box(b, (0.58, 0.12, 0.1), (0, -0.62, 3.38), red2, 0.03)
    leg = new_bm()
    cyl(leg, 0.34, 0.5, (0, 0, -0.2), iron2, axis='Z', n=8); cyl(leg, 0.2, 0.5, (0, 0, -0.62), STEEL_, axis='Z', n=6); cyl(leg, 0.3, 0.3, (0, 0, -0.95), red2, axis='Z', n=8)
    box(leg, (0.84, 1.0, 0.24), (0, -0.08, -1.18), iron, 0.08)
    for k in (-1, 1): box(leg, (0.3, 0.3, 0.16), (k * 0.24, -0.6, -1.22), red, 0.05)
    arm = new_bm()
    limb(arm, (0, 0, 0), (0, 0, -0.6), 0.26, 0.24, iron); cyl(arm, 0.44, 0.9, (0, -0.04, -1.02), iron2, axis='Z', n=10)
    for k in range(3): torus(arm, 0.45, 0.05, (0, -0.04, -0.72 - k * 0.3), red if k != 1 else haz, axis='Z', nu=10, nv=4)
    cyl(arm, 0.22, 0.4, (0, -0.04, -1.6), STEEL_, axis='Z', n=8); cyl(arm, 0.52, 0.3, (0, -0.04, -1.9), iron, axis='Z', n=10)      # pile-driver
    reg(11, 'SIEGE WALKER', 2.2, b, leg, arm, hip=(0.56, 0, 1.3), sh=(1.48, 0, 2.72))

# ============================================================================= 12  SEA MONSTER (same proportions as the original, so its hit zones still fit)
def a_monster():
    hide = H(0x3aa84a); deep = H(0x1d6a30); pale = H(0xe3ea9a); tooth = H(0xffffff); fire = H(0xff7a1a, 1, 1); eye = H(0xffe63c, 1, 1)
    b = new_bm()
    tube(b, [(0, 0.5, 2.1), (0, 0.1, 2.9), (0, -0.7, 3.6), (0, -1.3, 4.3), (0, -1.74, 4.9)], [1.05, 1.3, 1.05, 0.8, 0.72], 9, hide)            # torso + neck
    tube(b, [(0, -0.42, 2.0), (0, -0.98, 2.8), (0, -1.5, 3.5), (0, -1.9, 4.2)], [0.8, 0.95, 0.72, 0.5], 7, pale)                                # belly
    tube(b, [(0, -1.5, 4.95), (0, -2.6, 4.9), (0, -3.6, 4.74), (0, -4.2, 4.64)], [0.85, 0.74, 0.52, 0.3], 8, hide)                             # skull + snout
    tube(b, [(0, -1.7, 4.4), (0, -2.7, 4.2), (0, -3.7, 3.98)], [0.6, 0.5, 0.26], 7, pale)                                                        # open jaw
    box(b, (1.0, 1.6, 0.2), (0, -2.5, 4.56), H(0x7a1420), 0.05, rot=(-0.12, 0, 0))                                                                # mouth
    for k in range(6):
        for sx in (-1, 1):
            cone(b, 0.11, 0.4, (sx * (0.52 - k * 0.04), -2.1 - k * 0.34, 4.5 - k * 0.03), tooth, (PI, 0, 0), 4); cone(b, 0.09, 0.32, (sx * (0.42 - k * 0.035), -2.0 - k * 0.32, 4.44 - k * 0.07), tooth, (0, 0, 0), 4)
    for sx in (-1, 1):
        box(b, (0.3, 0.6, 0.26), (sx * 0.72, -2.0, 5.3), eye, 0.06); box(b, (0.1, 0.2, 0.28), (sx * 0.86, -2.1, 5.3), BLACK_); box(b, (0.5, 0.9, 0.18), (sx * 0.66, -1.95, 5.56), deep, 0.05, rot=(0, sx * 0.3, 0))
        tube(b, [(sx * 0.6, -1.3, 5.6), (sx * 0.9, -1.0, 6.0), (sx * 0.95, -0.7, 6.4)], [0.18, 0.13, 0.03], 5, deep)                            # horns
        box(b, (0.1, 0.12, 0.1), (sx * 0.2, -4.24, 4.78), BLACK_)
        ell(b, (0.5, 0.5, 0.1), (sx * 1.0, 0.3 * sx * 0, 3.0), deep, rot=(0, sx * 0.4, 0), u=6, v=4)
    for k in range(9): cone(b, 0.42 - k * 0.022, 1.3 - k * 0.05, (0, 0.95 - k * 0.42 + (0.5 if k > 5 else 0) * 0, 2.6 + k * 0.36), deep, (-0.4 + k * 0.05, 0, 0), 4)   # dorsal plates
    leg = new_bm()
    limb(leg, (0.1, 0, 0), (0.1, -0.12, -0.75), 0.68, 0.52, hide); limb(leg, (0.1, -0.12, -0.75), (0.1, 0.2, -1.5), 0.44, 0.36, deep)
    box(leg, (1.05, 1.7, 0.36), (0.1, -0.55, -1.74), hide, 0.12)
    for c in (-1, 0, 1): cone(leg, 0.17, 0.66, (0.1 + c * 0.33, -1.55, -1.72), BONE, (PI / 2, 0, 0), 5)
    arm = new_bm(); limb(arm, (0, 0, 0), (0, -0.5, -0.5), 0.24, 0.18, hide); limb(arm, (0, -0.5, -0.5), (0, -0.62, -1.05), 0.18, 0.14, hide)
    for c in (-1, 0, 1): cone(arm, 0.07, 0.38, (c * 0.12, -0.64, -1.22), BONE, (PI, 0, 0), 4)
    tail = new_bm()
    tube(tail, [(0, 0, 0.1)] + [(0, 0.8 + 1.55 * k, -0.2 * k - (0.5 if k > 5 else 0)) for k in range(8)], [1.0] + [0.82 - k * 0.1 for k in range(8)], 8, hide)
    for k in range(6): cone(tail, 0.3 - k * 0.03, 0.9 - k * 0.09, (0, 0.8 + 1.55 * k, 0.5 - 0.3 * k), deep, (-0.15, 0, 0), 4)
    glow = new_bm(); ell(glow, (0.34, 0.34, 0.34), (0, 0, 0), fire, u=8, v=5)
    reg(12, 'SEA MONSTER', 10.5, b, leg, arm, hip=(0.95, 0.1, 1.9), sh=(1.15, -1.6, 2.98), ex=[{'bm': tail, 'p': (0, 1.6, 2.5), 'role': 'wag'}, {'bm': glow, 'p': (0, -2.78, 4.3), 'role': 'pulse'}])

# ============================================================================= 13  BLADE RUNNER
def a_knifer():
    crim = H(0xc0102a); crim2 = H(0x7a0818); blk = H(0x15101c); blk2 = H(0x2a2234); steel = H(0xf2f6ff); vis = H(0xff5a6a, 1, 1)
    b = new_bm()
    box(b, (0.6, 0.4, 0.3), (0, 0, 1.36), blk, 0.08)
    tube(b, [(0, 0, 1.46), (0, 0, 2.0), (0, 0, 2.5)], [0.26, 0.3, 0.42], 8, blk)
    box(b, (0.2, 0.08, 1.2), (0, -0.36, 2.02), crim, 0.03, rot=(0.06, 0.62, 0)); torus(b, 0.3, 0.06, (0, 0, 1.56), crim, axis='Z', nu=10, nv=4)   # sash + belt
    for k in range(3): prism(b, [(0, 0.2), (0.05, 0), (0, -0.2), (-0.05, 0)], 0.03, (-0.3 + k * 0.12, -0.3, 1.5), steel, rot=(PI / 2 - 0.1, 0, 0.3), plane='XY')   # throwing knives
    box(b, (0.5, 0.44, 0.16), (0.58, 0, 2.62), crim2, 0.05, rot=(0, -0.3, 0))
    ell(b, (0.48, 0.52, 0.54), (0, 0.04, 3.14), crim, u=10, v=6); cone(b, 0.3, 0.7, (0, 0.5, 3.36), crim, (-1.1, 0, 0), 6)        # hood with a tail
    ell(b, (0.36, 0.2, 0.38), (0, -0.36, 3.1), BLACK_, u=8, v=5); box(b, (0.5, 0.06, 0.07), (0, -0.52, 3.16), vis)                 # void face, one burning slit
    for sx in (-1, 1): tube(b, [(sx * 0.12, 0.34, 2.72), (sx * 0.3, 0.9, 2.86), (sx * 0.2, 1.5, 2.6), (sx * 0.36, 2.0, 2.78)], [0.09, 0.08, 0.07, 0.02], 4, crim)   # scarf tails
    leg = leg_std(blk, blk2, blk, blk, 0.16, foot=(0.28, 0.5, 0.16))
    for k in range(3): torus(leg, 0.14 - k * 0.012, 0.03, (0, 0.0 + k * 0.02, -0.8 - k * 0.12), crim, axis='Z', nu=8, nv=4)
    arm = arm_std(blk, blk2, crim2, blk, 0.11)
    prism(arm, [(0.07, 0.0), (0.07, -1.3), (0.0, -1.7), (-0.06, -1.3), (-0.06, 0.0)], 0.035, (0, -0.2, -1.22), steel, rot=(-PI / 2 + 0.5, 0, 0), plane='YZ')   # long knife
    box(arm, (0.3, 0.08, 0.08), (0, -0.14, -1.22), crim, 0.02)
    reg(13, 'BLADE RUNNER', 0.88, b, leg, arm, hip=(0.3, 0, 1.3), sh=(0.72, 0, 2.48))

# ============================================================================= 14  THE STALKER
def a_stalker():
    navy = H(0x24304f); navy2 = H(0x18203a); mask = H(0xeeeee6); hair = H(0x2a1608); steel = H(0xf2f6ff); boot = H(0x0c0a10)
    b = new_bm()
    box(b, (0.9, 0.56, 0.4), (0, 0, 1.38), navy2, 0.1)
    box(b, (1.3, 0.7, 1.0), (0, 0, 2.08), navy, 0.2); box(b, (0.06, 0.08, 1.2), (0, -0.36, 1.98), STEEL_)                        # coveralls + zip
    box(b, (0.34, 0.08, 0.3), (0.34, -0.36, 2.26), navy2, 0.03); box(b, (0.6, 0.5, 0.16), (0, -0.02, 2.62), navy2, 0.05)           # pocket, collar
    limb(b, (0, 0, 2.6), (0, 0, 2.84), 0.2, 0.18, mask)
    ell(b, (0.46, 0.44, 0.6), (0, -0.04, 3.14), mask, u=12, v=7)                                                                    # blank white mask
    ell(b, (0.5, 0.5, 0.42), (0, 0.14, 3.36), hair, u=10, v=6)
    for k in range(7):
        an = k * 0.9; cone(b, 0.12, 0.4, (0.36 * math.cos(an), 0.16 + 0.34 * math.sin(an), 3.5), hair, (0.5 * math.sin(an) - 0.3, 0.6 * math.cos(an), 0), 4)
    for sx in (-1, 1): ell(b, (0.12, 0.08, 0.1), (sx * 0.19, -0.42, 3.22), BLACK_, u=6, v=4); box(b, (0.03, 0.04, 0.03), (sx * 0.05, -0.47, 3.04), BLACK_)
    box(b, (0.14, 0.04, 0.03), (0, -0.44, 2.86), H(0x8a8a84))
    leg = leg_std(navy, navy, navy2, boot, 0.22, foot=(0.42, 0.64, 0.26))
    armR = arm_std(navy, navy, navy2, mask, 0.17)
    armL = arm_std(navy, navy, navy2, mask, 0.17)
    prism(armL, [(0.16, 0.0), (0.2, -1.2), (-0.1, -1.75), (-0.1, 0.0)], 0.04, (0, -0.34, -1.26), steel, rot=(-PI / 2 + 0.4, 0, 0), plane='YZ')   # the kitchen knife
    box(armL, (0.12, 0.42, 0.14), (0, -0.16, -1.26), boot, 0.03, rot=(0.4, 0, 0))
    reg(14, 'THE STALKER', 1.28, b, leg, (armR, armL))

# ============================================================================= 15  ROOF SNIPER
def a_sniper():
    tan = H(0xc98a3c); tan2 = H(0x8a5a22); dark = H(0x1a0b33); lens = H(0xff2040, 1, 1); iron = H(0x26202e)
    b = new_bm()
    box(b, (0.66, 0.44, 0.32), (0, 0, 1.36), dark, 0.08); tube(b, [(0, 0, 1.46), (0, 0, 2.5)], [0.3, 0.42], 8, dark)
    lathe(b, [(0.2, 2.9), (0.6, 2.62), (0.86, 2.1), (0.92, 1.7)], 10, colors=[tan, tan, tan2])                                     # poncho
    for k in range(10):
        an = k * PI / 5; prism(b, [(-0.14, 0), (0.14, 0), (0, -0.46)], 0.03, (0.9 * math.cos(an), 0.9 * math.sin(an), 1.72), tan2 if k % 2 else tan, rot=(PI / 2, 0, an + PI / 2), plane='XY')
    ell(b, (0.52, 0.56, 0.56), (0, 0.04, 3.14), tan, u=10, v=6); cone(b, 0.26, 0.5, (0, 0.2, 3.66), tan, (-0.6, 0, 0), 6); ell(b, (0.38, 0.22, 0.38), (0, -0.34, 3.1), BLACK_, u=8, v=5)   # hood
    cyl(b, 0.13, 0.3, (0.16, -0.56, 3.16), iron, n=8); cyl(b, 0.09, 0.04, (0.16, -0.72, 3.16), lens, n=8)                           # scope eye
    box(b, (0.16, 3.0, 0.2), (0.5, -1.2, 2.2), iron, 0.04); box(b, (0.2, 0.7, 0.34), (0.5, 0.05, 2.12), tan2, 0.06)                # rifle
    cyl(b, 0.1, 0.8, (0.5, -1.2, 2.45), iron, n=8); cyl(b, 0.07, 0.04, (0.5, -1.62, 2.45), lens, n=8); cyl(b, 0.08, 0.3, (0.5, -2.76, 2.2), dark, n=6)
    for k in (-1, 1): limb(b, (0.5, -2.2, 2.14), (0.5 + k * 0.26, -2.3, 1.7), 0.03, 0.02, iron, 4)
    leg = leg_std(dark, dark, tan2, dark, 0.17)
    arm = arm_std(tan, dark, tan2, dark, 0.13)
    reg(15, 'ROOF SNIPER', 0.95, b, leg, arm, hip=(0.32, 0, 1.3), sh=(0.8, 0, 2.5), sniper=1, armrot=[0, -1.2])

# ============================================================================= 16  HOUND
def a_hound():
    hide = H(0x8a5a3a); hide2 = H(0x5a3622); dark = H(0x201410); eye = H(0xffe63c, 1, 1)
    b = new_bm()
    tube(b, [(0, 1.0, 0.95), (0, 0.5, 1.05), (0, -0.3, 1.08), (0, -0.85, 1.2)], [0.26, 0.4, 0.46, 0.34], 8, hide)
    tube(b, [(0, -0.85, 1.2), (0, -1.2, 1.36), (0, -1.5, 1.3)], [0.3, 0.26, 0.24], 7, hide2)
    tube(b, [(0, -1.4, 1.34), (0, -1.75, 1.26), (0, -2.0, 1.2)], [0.26, 0.19, 0.13], 7, hide); tube(b, [(0, -1.45, 1.08), (0, -1.8, 0.98), (0, -1.98, 0.96)], [0.2, 0.15, 0.1], 6, dark)   # muzzle + jaw
    for sx in (-1, 1):
        for k in range(3): cone(b, 0.04, 0.16, (sx * (0.13 - k * 0.02), -1.68 - k * 0.13, 1.1), WHITE_, (PI, 0, 0), 4)
        cone(b, 0.12, 0.46, (sx * 0.18, -1.2, 1.66), dark, (-0.5, sx * 0.3, 0), 4); ell(b, (0.06, 0.05, 0.04), (sx * 0.17, -1.6, 1.44), eye, u=6, v=4)
    for k in range(6): cone(b, 0.11, 0.34 - abs(k - 2) * 0.03, (0, 0.7 - k * 0.3, 1.46 + (0.08 if k < 4 else 0)), BONE, (-0.3, 0, 0), 4)   # spine plates
    tube(b, [(0, 1.0, 1.0), (0, 1.5, 1.3), (0, 1.9, 1.2)], [0.1, 0.07, 0.05], 5, hide2); ell(b, (0.12, 0.12, 0.12), (0, 1.94, 1.2), BONE, u=6, v=4)
    leg = new_bm(); limb(leg, (0, 0, 0.05), (0, -0.12, -0.36), 0.15, 0.1, hide); limb(leg, (0, -0.12, -0.36), (0, 0.06, -0.7), 0.09, 0.07, hide2); box(leg, (0.2, 0.3, 0.1), (0, -0.04, -0.75), dark, 0.04)
    fl = new_bm(); limb(fl, (0, 0, 0.05), (0, 0.06, -0.4), 0.15, 0.1, hide); limb(fl, (0, 0.06, -0.4), (0, -0.04, -0.7), 0.09, 0.07, hide2); box(fl, (0.2, 0.3, 0.1), (0, -0.1, -0.75), dark, 0.04)
    reg(16, 'HOUND', 1.0, b, leg, fl, hip=(0.35, 0.7, 0.8), sh=(0.35, -0.7, 0.8))

# ============================================================================= 17  THE HIVE MIND
def a_overmind():
    robe = H(0x6a16b8); robe2 = H(0x3a0a70); brain = H(0xff4fd8, 1, 0.55); vein = H(0xffd8f8, 1, 1); gold = H(0xffe63c, 1, 0.3); eye = H(0xffffff, 1, 1)
    b = new_bm()
    lathe(b, [(0.5, 2.5), (0.56, 2.0), (0.72, 1.3), (1.0, 0.5), (0.9, 0.42)], 12, colors=[robe, robe, robe2, gold])
    for k in range(9):
        an = k * 0.7; prism(b, [(-0.2, 0), (0.2, 0), (0, -0.5)], 0.04, (0.94 * math.cos(an), 0.94 * math.sin(an), 0.46), robe2, rot=(PI / 2, 0, an + PI / 2), plane='XY')   # ragged hem
    lathe(b, [(0.3, 2.86), (0.9, 2.66), (1.14, 2.4), (1.0, 2.3)], 12, colors=[gold, robe, gold])                                    # mantle
    ell(b, (0.2, 0.08, 0.3), (0, -0.56, 2.1), eye, u=8, v=5); torus(b, 0.3, 0.05, (0, -0.56, 2.1), gold, axis='Y', nu=12, nv=4)       # chest eye
    limb(b, (0, 0, 2.8), (0, 0, 3.0), 0.2, 0.2, robe2)
    ell(b, (0.44, 0.44, 0.4), (0, -0.05, 3.16), robe2, u=10, v=6)                                                                    # small masked face under the brain
    for k in (-1, 0, 1): ell(b, (0.09, 0.05, 0.06 + (0.05 if k == 0 else 0)), (k * 0.2, -0.44, 3.2 + (0.12 if k == 0 else 0)), eye, u=6, v=4)
    for k in range(8):
        an = k * PI / 4; cone(b, 0.15, 0.8, (1.0 * math.cos(an), 1.0 * math.sin(an), 4.5), gold, (0.4 * math.sin(an), 0.4 * math.cos(an), 0), 5)   # crown
    br = new_bm()
    for sx in (-1, 1):
        ell(br, (0.62, 0.9, 0.72), (sx * 0.5, 0.0, 0.0), brain, u=10, v=6)
        for k in range(4): ell(br, (0.3, 0.34, 0.3), (sx * 0.84, -0.6 + k * 0.4, 0.26 - (k % 2) * 0.4), brain, u=7, v=4)
        tube(br, [(sx * 0.1, -0.9, 0.2), (sx * 0.4, -0.4, 0.74), (sx * 0.2, 0.3, 0.76), (sx * 0.5, 0.86, 0.3)], 0.06, 4, vein)
    ell(br, (0.5, 0.6, 0.4), (0, 0.5, -0.3), brain, u=8, v=5)
    tent = new_bm()
    for k in range(2):
        y = -0.4 + k * 0.8; tube(tent, [(0, y, 0), (0.14, y * 1.2, -0.7), (-0.06, y * 1.3, -1.4), (0.12, y * 1.5, -2.1), (0.0, y * 1.6, -2.7)], [0.2, 0.17, 0.13, 0.09, 0.03], 6, brain)
    arm = new_bm()
    lathe(arm, [(0.16, 0.1), (0.2, -0.5), (0.4, -1.1)], 8, colors=[robe, robe2]); limb(arm, (0, 0, -0.9), (0, -0.06, -1.4), 0.07, 0.05, H(0xe0c8ff))
    for k in (-1, 0, 1): cone(arm, 0.03, 0.5, (k * 0.06, -0.08, -1.62), H(0xe0c8ff), (PI + 0.1, 0, k * 0.2), 4)
    reg(17, 'THE HIVE MIND', 26, b, tent, arm, hip=(0.5, 0, 1.6), sh=(1.02, 0, 2.6), ex=[{'bm': br, 'p': (0, 0, 3.95), 'role': 'pulse'}, ring_ex(1.7, 0.07, H(0xffe63c, 1, 1), 5.4)])

# ============================================================================= 18  BEACH BITER  /  26  APEX PREDATOR
def a_shark(t, name, giant):
    top = H(0x2fb4ff if not giant else 0x3a5a8a); belly = H(0xcfefff if not giant else 0xb8c8d8); fin = H(0x1d6ec0 if not giant else 0x1a2a4a); gill = H(0xff2fa0, 1, 1); dark = H(0x162036); mouth = H(0x8a1430)
    b = new_bm()
    n0 = len(b.faces)
    tube(b, [(0, 3.1, 1.7), (0, 1.6, 1.78), (0, -0.8, 1.8), (0, -3.4, 1.7), (0, -5.0, 1.72), (0, -6.3, 1.66)], [0.6, 1.2, 1.42, 1.2, 0.85, 0.16], 10, top)
    b.faces.ensure_lookup_table(); lay = b.loops.layers.float_color['Col']; b.normal_update()
    for f in b.faces[n0:]:
        if f.normal.z < -0.25:
            for l in f.loops: l[lay] = belly                                                                                         # pale underside
    box(b, (1.5, 2.3, 0.3), (0, -4.6, 0.86), dark, 0.1, rot=(0.14, 0, 0)); box(b, (1.3, 2.0, 0.1), (0, -4.6, 1.04), mouth, 0.03, rot=(0.14, 0, 0))   # lower jaw
    for k in range(7):
        for sx in (-1, 1):
            cone(b, 0.15, 0.5, (sx * (0.62 - k * 0.06), -3.9 - k * 0.3, 1.2 + k * 0.01), WHITE_, (PI, 0, 0), 4); cone(b, 0.13, 0.42, (sx * (0.56 - k * 0.055), -3.8 - k * 0.3, 1.06 - k * 0.04), WHITE_, (0, 0, 0), 4)
    for sx in (-1, 1):
        ell(b, (0.14, 0.16, 0.14), (sx * 1.0, -4.4, 2.08), gill, u=6, v=4); box(b, (0.3, 0.6, 0.12), (sx * 0.92, -4.4, 2.28), dark, 0.04, rot=(0, sx * 0.5, 0))
        for k in range(3): box(b, (0.08, 0.16, 0.8), (sx * 1.33, -3.0 + k * 0.36, 1.6), gill, rot=(0, 0, sx * 0.2))
        prism(b, [(0, 0), (1.5, 0.3), (0.5, 1.9)], 0.12, (sx * 1.2, -2.4, 1.2), fin, rot=(0, sx * (PI / 2 + 0.5), sx * -0.3), plane='YZ')          # side fins
        for y in (-1.0, 1.6): limb(b, (sx * 0.9, y, 0.9), (sx * 1.0, y - 0.1, 0.0), 0.26, 0.2, dark, 6); box(b, (0.5, 0.7, 0.2), (sx * 1.0, y - 0.3, 0.1), dark, 0.06)   # stubby legs
    prism(b, [(-0.9, 0), (1.3, 0), (1.0, 2.4)], 0.14, (0, -0.2, 3.1), fin, plane='YZ')                                                               # dorsal fin
    if giant:
        for k in range(3): prism(b, [(-0.4, 0), (0.6, 0), (0.5, 1.0)], 0.1, (0, 1.2 + k * 0.7, 2.8 - k * 0.24), fin, plane='YZ')
        for k in range(3): box(b, (0.06, 1.2, 0.06), (0.9 - k * 0.2, -2.6 + k * 0.3, 2.86 - k * 0.06), H(0xff9ab0), rot=(0, 0, 0.5))                 # old scars
        tube(b, [(0.9, -5.2, 1.5), (1.2, -5.5, 1.1), (1.1, -5.4, 0.7)], [0.05, 0.04, 0.02], 4, STEEL_)                                                 # a harpoon line it never noticed
    tail = new_bm()
    tube(tail, [(0, 0, 0), (0, 1.1, 0.05), (0, 2.2, 0.2)], [0.62, 0.4, 0.2], 8, top)
    prism(tail, [(0, 0), (1.6, 1.9), (0.8, 0.4), (1.3, -1.3), (0, -0.4)], 0.12, (0, 2.0, 0.2), fin, plane='YZ')
    reg(t, name, 1.0, b, ex=[{'bm': tail, 'p': (0, 3.0, 1.7), 'role': 'wag'}], fly=True, gs=(3.2 if giant else 1.0))

# ============================================================================= 19  DELIVERY GUY
def a_chef():
    skin = H(0xffb347); skin2 = H(0xe08a28); wh = H(0xfcfcf4); wh2 = H(0xd8d8cc); red = H(0xd8281c); stache = H(0x2a1608); cheese = H(0xffd23c, 1, 0.3); crust = H(0xe8a64a); pep = H(0xc0201c)
    b = new_bm()
    box(b, (0.84, 0.5, 0.34), (0, 0, 1.36), BLACK_, 0.09)
    ell(b, (0.72, 0.66, 0.66), (0, -0.08, 1.92), wh, u=12, v=7); tube(b, [(0, 0, 2.1), (0, 0, 2.56)], [0.56, 0.5], 8, wh)            # big belly in a chef jacket
    for k in range(3):
        for sx in (-1, 1): ell(b, (0.06, 0.04, 0.06), (sx * 0.16, -0.64 + k * 0.05 - abs(k - 1) * 0.02, 1.7 + k * 0.28), stache, u=5, v=3)   # buttons
    box(b, (0.8, 0.08, 0.86), (0, -0.56, 1.36), wh2, 0.03, rot=(-0.14, 0, 0)); prism(b, [(0, 0.2), (0.16, -0.14), (-0.16, -0.14)], 0.04, (0, -0.64, 1.3), red, rot=(PI / 2 + 0.14, 0, 0), plane='XY')   # apron + slice logo
    torus(b, 0.36, 0.09, (0, 0, 2.62), red, axis='Z', nu=10, nv=5); cone(b, 0.12, 0.34, (0.1, -0.4, 2.56), red, (PI - 0.4, 0, 0), 4)   # neckerchief
    ell(b, (0.46, 0.48, 0.5), (0, 0, 3.1), skin, u=10, v=6); ell(b, (0.16, 0.16, 0.14), (0, -0.5, 3.04), skin2, u=6, v=4)             # head + nose
    for sx in (-1, 1):
        tube(b, [(sx * 0.04, -0.52, 2.9), (sx * 0.3, -0.56, 2.84), (sx * 0.52, -0.5, 2.96), (sx * 0.5, -0.46, 3.1)], [0.08, 0.07, 0.05, 0.02], 5, stache)   # curly moustache
        ell(b, (0.06, 0.03, 0.07), (sx * 0.18, -0.44, 3.22), BLACK_, u=5, v=4); box(b, (0.16, 0.04, 0.03), (sx * 0.18, -0.44, 3.34), stache, rot=(0, sx * 0.3, 0))
    cyl(b, 0.46, 0.2, (0, 0, 3.56), wh2, axis='Z', n=10); cyl(b, 0.4, 0.7, (0, 0, 3.96), wh, axis='Z', n=10)
    for k in range(5):
        an = k * 1.257; ell(b, (0.32, 0.32, 0.3), (0.3 * math.cos(an), 0.3 * math.sin(an), 4.36), wh, u=8, v=5)                    # toque
    ell(b, (0.34, 0.34, 0.3), (0, 0, 4.5), wh, u=8, v=5)
    leg = new_bm()
    tube(leg, [(0, 0, 0.02), (0, -0.04, -0.3), (0, -0.07, -0.6), (0, -0.02, -0.9), (0, 0.04, -1.14)], [0.24, 0.22, 0.2, 0.17, 0.15], 7, wh, colors=[BLACK_, wh, BLACK_, wh])   # checked trousers
    box(leg, (0.38, 0.6, 0.2), (0, -0.14, -1.2), BLACK_, 0.07)
    armR = arm_std(wh, wh, wh2, skin, 0.16)
    cyl(armR, 0.03, 0.6, (0, -0.3, -1.24), stache, n=5); cyl(armR, 0.2, 0.03, (0, -0.66, -1.24), STEEL_, axis='X', n=10)               # pizza cutter
    armL = arm_std(wh, wh, wh2, skin, 0.16)
    cyl(armL, 0.95, 0.1, (0, -0.72, -1.14), crust, n=14, rot=(-0.5, 0, 0)); cyl(armL, 0.8, 0.12, (0, -0.72, -1.14), cheese, n=14, rot=(-0.5, 0, 0))   # the pizza, held out
    for k in range(6):
        an = k * 1.047; cyl(armL, 0.13, 0.15, (0.45 * math.cos(an), -0.72 + 0.45 * math.sin(an) * 0.88, -1.14 - 0.45 * math.sin(an) * 0.48), pep, n=6, rot=(-0.5, 0, 0))
    reg(19, 'DELIVERY GUY', 1.0, b, leg, (armR, armL), sniper=1, armrot=[0, -1.0])

# ============================================================================= 20  CINEPHILE
def a_movie():
    skin = H(0xff6a8a); skin2 = H(0xd84a6a); coat = H(0x6a1238); coat2 = H(0x420a22); red = H(0xe8282c); wh = H(0xffffff); lr = H(0xff2040, 1, 0.7); lc = H(0x25c8ff, 1, 0.7); corn = H(0xfff3b0)
    b = new_bm()
    box(b, (0.7, 0.46, 0.34), (0, 0, 1.36), coat2, 0.09)
    tube(b, [(0, 0, 1.46), (0, 0, 2.0), (0, 0, 2.52)], [0.34, 0.4, 0.5], 8, coat)                                                    # usher's jacket
    for k in range(4): ell(b, (0.05, 0.04, 0.05), (0.1, -0.44 - (0.02 if k in (1, 2) else 0), 1.7 + k * 0.2), GOLD, u=5, v=3)
    box(b, (0.08, 0.06, 0.9), (-0.06, -0.42, 2.0), GOLD, 0.01)
    for sx in (-1, 1): box(b, (0.36, 0.36, 0.1), (sx * 0.62, 0, 2.6), GOLD, 0.03); prism(b, [(0, 0), (0.2, 0.1), (0.2, -0.1)], 0.06, (sx * 0.02, -0.5, 2.62), red, rot=(PI / 2, 0, 0 if sx > 0 else PI), plane='XY')   # epaulettes + bow tie
    cyl(b, 0.2, 0.06, (-0.5, -0.02, 1.5), STEEL_, axis='X', n=8); cyl(b, 0.06, 0.08, (-0.52, -0.02, 1.5), BLACK_, axis='X', n=6)      # film reel on the belt
    limb(b, (0, 0, 2.5), (0, 0, 2.8), 0.15, 0.14, skin2)
    ell(b, (0.46, 0.5, 0.52), (0, 0, 3.12), skin, u=10, v=6)
    box(b, (0.94, 0.08, 0.34), (0, -0.48, 3.2), wh, 0.03); box(b, (0.36, 0.06, 0.24), (-0.24, -0.53, 3.2), lr); box(b, (0.36, 0.06, 0.24), (0.24, -0.53, 3.2), lc)   # 3D glasses
    for sx in (-1, 1): box(b, (0.05, 0.5, 0.06), (sx * 0.47, -0.2, 3.24), wh)
    box(b, (0.34, 0.05, 0.12), (0, -0.5, 2.88), wh, 0.02)                                                                            # a big grin
    cyl(b, 0.6, 0.9, (0, 0, 3.96), red, axis='Z', n=12, r2=0.46, rot=(PI, 0, 0))                                                     # popcorn bucket hat
    for k in range(6):
        an = k * 1.047 + 0.3; box(b, (0.16, 0.04, 0.9), (0.54 * math.cos(an), 0.54 * math.sin(an), 3.96), wh, rot=(0.13 * math.sin(an) * 0, 0, an + PI / 2))
    for k in range(9):
        an = k * 2.4; ell(b, (0.2, 0.2, 0.18), (0.3 * math.cos(an) * (k % 3) / 2, 0.3 * math.sin(an) * (k % 3) / 2, 4.46 + (k % 3) * 0.1), corn, u=6, v=4)
    ell(b, (0.14, 0.14, 0.12), (0.5, -0.3, 2.7), corn, u=6, v=4)                                                                     # one that got away
    leg = leg_std(coat, coat, coat2, BLACK_, 0.18); box(leg, (0.05, 0.3, 1.0), (0.2, -0.04, -0.56), GOLD, 0.01)
    armR = arm_std(coat, coat, coat2, skin, 0.14)
    cyl(armR, 0.2, 0.5, (0, -0.24, -1.3), red, axis='Z', n=8, r2=0.26); cyl(armR, 0.27, 0.05, (0, -0.24, -1.04), wh, axis='Z', n=8); cyl(armR, 0.025, 0.4, (0.06, -0.24, -0.84), wh, axis='Z', n=4)   # soda
    armL = arm_std(coat, coat, coat2, skin, 0.14)
    box(armL, (0.9, 0.1, 0.6), (0, -0.5, -1.2), BLACK_, 0.03); box(armL, (0.92, 0.12, 0.16), (0.04, -0.5, -0.82), wh, 0.02, rot=(0, -0.25, 0))   # clapperboard
    for k in range(4): box(armL, (0.1, 0.13, 0.17), (-0.3 + k * 0.22, -0.5, -0.9 + k * 0.055), BLACK_, rot=(0, -0.25 + 0.5, 0))
    for k in range(2): box(armL, (0.7, 0.11, 0.04), (0, -0.5, -1.1 - k * 0.2), wh)
    reg(20, 'CINEPHILE', 1.05, b, leg, (armR, armL), sniper=1, armrot=[0, -1.0])

# ============================================================================= 21  QUEEN OF THE MOON NILE
def a_cleo():
    skin = H(0x2fb8a0); skin2 = H(0x1f8a78); gold = H(0xffd23c, 1, 0.14); blue = H(0x1c4fd8); linen = H(0xf4f0e0); linen2 = H(0xd8d0b8); em = H(0x3cff9e, 1, 1); kohl = H(0x0a0a14)
    b = new_bm()
    lathe(b, [(0.36, 2.3), (0.3, 1.7), (0.36, 1.2), (0.4, 0.4), (0.5, 0.2)], 10, colors=[linen, linen, linen, linen2])               # sheath dress
    box(b, (0.2, 0.06, 1.1), (0, -0.37, 1.0), blue, 0.02); torus(b, 0.33, 0.06, (0, 0, 1.62), gold, axis='Z', nu=10, nv=4); ell(b, (0.1, 0.06, 0.12), (0, -0.36, 1.62), em, u=6, v=4)
    tube(b, [(0, 0, 2.2), (0, 0, 2.5)], [0.36, 0.44], 8, linen)
    lathe(b, [(0.2, 2.74), (0.55, 2.66), (0.8, 2.56), (1.0, 2.44), (0.96, 2.38)], 12, colors=[gold, blue, gold, blue])               # broad collar
    limb(b, (0, 0, 2.6), (0, 0, 2.86), 0.13, 0.12, skin2)
    ell(b, (0.4, 0.44, 0.5), (0, 0, 3.14), skin, u=10, v=6)
    for k in range(6): box(b, (1.05 + k * 0.1, 0.84, 0.16), (0, 0.16, 3.62 - k * 0.2), gold if k % 2 == 0 else blue, 0.05)           # striped headdress
    for sx in (-1, 1):
        for k in range(5): box(b, (0.26, 0.2, 0.2), (sx * 0.5, -0.22, 2.94 - k * 0.2), blue if k % 2 == 0 else gold, 0.04)           # lappets
        box(b, (0.32, 0.05, 0.05), (sx * 0.24, -0.42, 3.22), kohl, rot=(0, sx * -0.2, 0)); ell(b, (0.09, 0.04, 0.06), (sx * 0.18, -0.42, 3.21), em, u=5, v=4)   # kohl + eyes
        torus(b, 0.0, 0.0, (0, 0, 0), gold) if False else None
    tube(b, [(0, -0.44, 3.5), (0, -0.62, 3.64), (0, -0.56, 3.9), (0, -0.66, 4.02)], [0.06, 0.06, 0.07, 0.09], 5, gold); ell(b, (0.04, 0.03, 0.04), (0, -0.74, 4.04), em, u=4, v=3)   # cobra on the brow
    leg = leg_std(skin, skin, gold, gold, 0.12, foot=(0.22, 0.42, 0.1))
    armR = arm_std(skin, skin, gold, skin, 0.1); torus(armR, 0.12, 0.035, (0, 0.0, -0.36), gold, axis='Z', nu=8, nv=4)
    tube(armR, [(0, -0.12, -1.22), (0, -0.14, -0.6), (0, -0.14, -0.4)], 0.03, 4, gold); torus(armR, 0.13, 0.03, (0, -0.14, -0.26), gold, axis='Y', nu=8, nv=4); box(armR, (0.34, 0.05, 0.05), (0, -0.14, -0.46), gold)   # ankh
    armL = arm_std(skin, skin, gold, skin, 0.1); torus(armL, 0.12, 0.035, (0, 0.0, -0.36), gold, axis='Z', nu=8, nv=4)
    cyl(armL, 0.06, 3.6, (0, -0.4, -0.9), gold, axis='Z', n=6); ell(armL, (0.26, 0.26, 0.26), (0, -0.4, 0.96), em, u=8, v=5); torus(armL, 0.3, 0.04, (0, -0.4, 0.96), gold, axis='Y', nu=10, nv=4)   # sceptre
    reg(21, 'QUEEN OF THE MOON NILE', 1.05, b, leg, (armR, armL), hip=(0.2, 0, 1.3), sh=(0.62, 0, 2.48), armrot=[0, -0.5], snakes=1)

# ============================================================================= 22  SPACE PIRATE
def a_pirate():
    skin = H(0x2a8fa8); skin2 = H(0x1c6a80); coat = H(0x8a1020); coat2 = H(0x5a0814); blk = H(0x14141c); wood = H(0x7a4a22); wh = H(0xf0ece0); eye = H(0xffe63c, 1, 1); plume = H(0xff5fb0, 1, 0.3)
    b = new_bm()
    box(b, (0.8, 0.5, 0.34), (0, 0, 1.36), blk, 0.09)
    lathe(b, [(0.5, 2.5), (0.44, 1.7), (0.62, 1.2), (0.8, 0.7), (0.76, 0.66)], 10, colors=[coat, coat, coat, GOLD])                  # captain's coat
    box(b, (0.3, 0.1, 1.5), (0, -0.44, 1.5), blk, 0.02); box(b, (0.98, 0.1, 0.16), (0, -0.24, 1.6), wood, 0.03); box(b, (0.22, 0.1, 0.22), (0, -0.48, 1.6), GOLD, 0.04)   # open front, belt, buckle
    for k in range(3): ell(b, (0.06, 0.04, 0.06), (0.22, -0.46, 1.9 + k * 0.22), GOLD, u=5, v=3)
    ell(b, (0.24, 0.14, 0.3), (0, -0.44, 2.44), wh, u=8, v=5)                                                                         # cravat
    for sx in (-1, 1): box(b, (0.5, 0.56, 0.16), (sx * 0.72, 0, 2.6), coat2, 0.05); box(b, (0.52, 0.58, 0.05), (sx * 0.72, 0, 2.52), GOLD, 0.02)
    limb(b, (0, 0, 2.5), (0, 0, 2.8), 0.16, 0.14, skin2)
    ell(b, (0.44, 0.48, 0.5), (0, 0, 3.12), skin, u=10, v=6)
    for k in range(3): tube(b, [((k - 1) * 0.16, -0.4, 2.9), ((k - 1) * 0.2, -0.46, 2.6), ((k - 1) * 0.16, -0.42, 2.34)], [0.09, 0.07, 0.04], 5, blk); ell(b, (0.06, 0.06, 0.06), ((k - 1) * 0.16, -0.42, 2.3), GOLD, u=5, v=3)   # braided beard
    box(b, (0.3, 0.06, 0.24), (0.2, -0.46, 3.2), blk, 0.03); box(b, (0.96, 0.9, 0.05), (0, 0, 3.28), blk, rot=(0, 0.25, 0)); ell(b, (0.08, 0.04, 0.07), (-0.2, -0.45, 3.2), eye, u=5, v=4)   # eyepatch + good eye
    cyl(b, 0.52, 0.34, (0, 0, 3.62), blk, axis='Z', n=10)                                                                            # tricorn
    for k in range(3):
        an = k * 2.094 + PI / 2; box(b, (1.3, 0.1, 0.44), (0.56 * math.cos(an), 0.56 * math.sin(an), 3.6), blk, 0.03, rot=(0.5, 0, an + PI / 2)); box(b, (1.3, 0.11, 0.07), (0.63 * math.cos(an), 0.63 * math.sin(an), 3.8), GOLD, 0.01, rot=(0.5, 0, an + PI / 2))
    ell(b, (0.16, 0.06, 0.16), (0, -0.56, 3.66), BONE, u=6, v=4); box(b, (0.3, 0.04, 0.05), (0, -0.58, 3.56), BONE, rot=(0, 0.6, 0)); box(b, (0.3, 0.04, 0.05), (0, -0.58, 3.56), BONE, rot=(0, -0.6, 0))   # skull and bones
    tube(b, [(0.3, 0.2, 3.76), (0.5, 0.5, 4.2), (0.4, 0.9, 4.36)], [0.1, 0.14, 0.03], 5, plume)                                       # feather
    ell(b, (0.2, 0.26, 0.2), (-0.74, 0.0, 2.9), H(0x3cff9e), u=6, v=4); ell(b, (0.13, 0.13, 0.13), (-0.74, -0.14, 3.12), H(0x3cff9e), u=6, v=4); cone(b, 0.06, 0.18, (-0.74, -0.28, 3.1), GOLD, (PI / 2, 0, 0), 4); ell(b, (0.03, 0.02, 0.03), (-0.68, -0.25, 3.16), lens_ if False else eye, u=4, v=3)   # robo-parrot
    legP = new_bm(); limb(legP, (0, 0, 0.02), (0, -0.05, -0.56), 0.22, 0.18, blk); cyl(legP, 0.17, 0.12, (0, -0.05, -0.6), STEEL_, axis='Z', n=8); limb(legP, (0, -0.05, -0.62), (0, 0, -1.3), 0.11, 0.07, wood, 6)   # peg leg
    legB = leg_std(blk, wood, blk, wood, 0.2, foot=(0.38, 0.6, 0.22)); cyl(legB, 0.26, 0.2, (0, -0.06, -0.6), wood, axis='Z', n=8)
    armR = arm_std(coat, coat, coat2, skin, 0.16); cyl(armR, 0.22, 0.26, (0, -0.04, -0.98), GOLD, axis='Z', n=8)
    box(armR, (0.1, 0.5, 0.14), (0, -0.4, -1.2), wood, 0.03); cyl(armR, 0.06, 0.6, (0, -0.74, -1.14), GOLD, n=6); cyl(armR, 0.08, 0.06, (0, -1.04, -1.14), eye, n=6)   # ray flintlock
    armL = arm_std(coat, coat, coat2, coat2, 0.16, fist=0.9); cyl(armL, 0.22, 0.26, (0, -0.04, -0.98), GOLD, axis='Z', n=8)
    cyl(armL, 0.13, 0.14, (0, -0.08, -1.3), STEEL_, axis='Z', n=8); torus(armL, 0.26, 0.06, (0, -0.2, -1.6), STEEL_, axis='X', nu=12, nv=5, arc=0.68)   # the hook
    reg(22, 'SPACE PIRATE', 1.1, b, (legP, legB), (armR, armL), sniper=1, armrot=[0, -1.0])

# ============================================================================= 23  RINGMASTER
def a_ringmaster():
    face = H(0xf6f6ff); pink = H(0xff4fa8); pink2 = H(0xb01c6a); cy = H(0x25f4ff); yel = H(0xffe63c); nose = H(0xff1030, 1, 0.8); wh = H(0xffffff)
    b = new_bm()
    box(b, (0.74, 0.48, 0.34), (0, 0, 1.36), pink2, 0.09)
    tube(b, [(0, 0, 1.46), (0, 0, 2.0), (0, 0, 2.5)], [0.36, 0.42, 0.52], 8, pink)                                                   # tailcoat
    for sx in (-1, 1):
        box(b, (0.2, 0.08, 0.8), (sx * 0.2, -0.44, 2.14), GOLD, 0.02, rot=(0, sx * 0.2, 0)); prism(b, [(0, 0), (0.34, 0), (0.1, -1.0)], 0.06, (sx * 0.24, 0.42, 1.5), pink2, rot=(PI / 2, 0, 0 if sx > 0 else 0), plane='XY')   # lapels, tails
        prism(b, [(0, 0), (0.3, 0.16), (0.3, -0.16)], 0.08, (sx * 0.03, -0.52, 2.56), cy, rot=(PI / 2, 0, 0 if sx > 0 else PI), plane='XY')   # bow tie
        ell(b, (0.2, 0.2, 0.22), (sx * 0.5, 0.05, 3.2), cy, u=6, v=4)                                                               # hair tufts
        box(b, (0.05, 0.04, 0.26), (sx * 0.19, -0.45, 3.24), H(0x1c4fd8)); box(b, (0.2, 0.04, 0.05), (sx * 0.19, -0.45, 3.24), H(0x1c4fd8))   # cross eyes
    for k in range(3): ell(b, (0.07, 0.04, 0.07), (0, -0.48, 1.74 + k * 0.2), yel, u=5, v=3)
    torus(b, 0.62, 0.2, (0, 0, 2.62), wh, axis='Z', nu=14, nv=5)                                                                     # ruff
    for k in range(12):
        an = k * PI / 6; box(b, (0.1, 0.42, 0.3), (0.7 * math.cos(an), 0.7 * math.sin(an), 2.62), face, 0.03, rot=(0, 0, an + PI / 2))
    ell(b, (0.46, 0.48, 0.52), (0, 0, 3.12), face, u=10, v=6); ell(b, (0.19, 0.19, 0.19), (0, -0.52, 3.04), nose, u=8, v=5)
    torus(b, 0.24, 0.04, (0, -0.4, 2.98), H(0xd8102a), axis='Y', nu=12, nv=4, arc=0.5) if False else box(b, (0.44, 0.05, 0.07), (0, -0.46, 2.82), H(0xd8102a), 0.02)
    cyl(b, 1.2, 0.07, (0, 0, 3.5), yel, axis='Z', n=14)
    for k in range(5): cyl(b, 0.74, 0.31, (0, 0, 3.68 + k * 0.3), pink if k % 2 == 0 else (wh if k == 1 else cy), axis='Z', n=12)   # the striped top hat
    cyl(b, 0.78, 0.06, (0, 0, 5.02), yel, axis='Z', n=12)
    leg = new_bm()
    tube(leg, [(0, 0, 0.02), (0, -0.04, -0.4), (0, -0.05, -0.8), (0, 0.02, -1.12)], [0.22, 0.2, 0.18, 0.15], 7, pink, colors=[pink, wh, pink])
    ell(leg, (0.3, 0.6, 0.2), (0, -0.3, -1.16), H(0xd8102a), u=8, v=5); ell(leg, (0.2, 0.2, 0.18), (0, -0.74, -1.12), yel, u=6, v=4)   # clown shoes
    armR = arm_std(pink, pink, pink2, wh, 0.15); cyl(armR, 0.035, 1.5, (0, -0.2, -0.9), BLACK_, axis='Z', n=5); ell(armR, (0.1, 0.1, 0.1), (0, -0.2, -0.12), GOLD, u=6, v=4)   # cane
    armL = arm_std(pink, pink, pink2, wh, 0.15)
    for i, c in enumerate([0xff2040, 0x25c8ff, 0xffe63c, 0x3cff9e]):
        x = (i - 1.5) * 0.46; z = 1.0 + (i % 2) * 0.34
        ell(armL, (0.4, 0.4, 0.46), (x, -0.4, z), H(c, 1, 0.25), u=8, v=6); cone(armL, 0.06, 0.1, (x, -0.4, z - 0.48), H(c), (PI, 0, 0), 4)   # balloons
        tube(armL, [(x, -0.4, z - 0.5), (x * 0.4, -0.25, -0.4), (0, -0.1, -1.2)], 0.012, 3, wh)
    reg(23, 'RINGMASTER', 1.15, b, leg, (armR, armL), armrot=[0, -0.6])

# ============================================================================= 24  CHAINSAW KILLER
def a_butcher():
    leather = H(0xb08a62); leather2 = H(0x7a5a3a); shirt = H(0x6a5a48); apron = H(0xd9d2c0); stain = H(0x7a0a10); hair = H(0x14100c); saw = H(0xff7a1a); bar = H(0xcfd8e8); dark = H(0x242028)
    b = new_bm()
    box(b, (0.96, 0.6, 0.4), (0, 0, 1.38), dark, 0.1)
    box(b, (1.36, 0.78, 1.04), (0, 0, 2.1), shirt, 0.22)
    box(b, (1.2, 0.08, 1.9), (0, -0.44, 1.5), apron, 0.03); box(b, (0.08, 0.5, 0.06), (-0.3, -0.2, 2.6), apron); box(b, (0.08, 0.5, 0.06), (0.3, -0.2, 2.6), apron)   # apron
    for (x, z, w, h) in [(-0.3, 1.9, 0.4, 0.3), (0.2, 1.5, 0.5, 0.26), (-0.1, 1.1, 0.34, 0.4), (0.38, 2.14, 0.24, 0.2), (0.3, 0.8, 0.3, 0.2)]: box(b, (w, 0.05, h), (x, -0.49, z), stain, 0.02)   # stains
    limb(b, (0, 0, 2.6), (0, 0, 2.84), 0.22, 0.2, leather2)
    ell(b, (0.48, 0.46, 0.6), (0, -0.02, 3.14), leather, u=12, v=7)                                                                    # stitched mask
    for k in range(5): box(b, (0.36, 0.04, 0.035), ((k % 2) * 0.16 - 0.08, -0.46, 2.84 + k * 0.15), hair, rot=(0, 0.6 if k % 2 else -0.6, 0))
    for sx in (-1, 1): ell(b, (0.11, 0.07, 0.09), (sx * 0.2, -0.42, 3.24), BLACK_, u=6, v=4); box(b, (0.3, 0.24, 0.5), (sx * 0.42, 0.1, 3.2), leather2, 0.06)
    box(b, (0.26, 0.05, 0.1), (0, -0.44, 2.9), BLACK_);
    for k in range(4): box(b, (0.04, 0.05, 0.07), (-0.09 + k * 0.06, -0.46, 2.92), BONE)
    ell(b, (0.5, 0.48, 0.3), (0, 0.12, 3.5), hair, u=8, v=5)
    for k in range(6): cone(b, 0.1, 0.5, (0.4 * math.cos(k * 1.05), 0.14 + 0.36 * math.sin(k * 1.05), 3.3), hair, (PI - 0.4 * math.sin(k * 1.05), 0.4 * math.cos(k * 1.05), 0), 4)
    leg = leg_std(dark, dark, dark, H(0x1a2a1a), 0.23, foot=(0.44, 0.66, 0.3))
    armR = arm_std(shirt, leather, shirt, leather, 0.19, fist=1.1)
    box(armR, (0.06, 0.6, 0.56), (0, -0.36, -1.5), bar, 0.02); box(armR, (0.1, 0.16, 0.4), (0, -0.08, -1.36), hair, 0.03)              # cleaver
    armL = arm_std(shirt, leather, shirt, leather, 0.19, fist=1.1)
    box(armL, (0.5, 1.0, 0.46), (0, -0.6, -1.22), saw, 0.1); cyl(armL, 0.2, 0.54, (0, -0.4, -1.2), dark, axis='X', n=8)                 # the chainsaw
    torus(armL, 0.3, 0.045, (0, -0.5, -0.92), dark, axis='X', nu=10, nv=4, arc=0.5)
    box(armL, (0.1, 2.3, 0.3), (0, -2.2, -1.22), bar, 0.04)
    for k in range(9): box(armL, (0.14, 0.12, 0.1), (0, -1.2 - k * 0.25, -1.04 - (k % 2) * 0.36), dark)
    reg(24, 'CHAINSAW KILLER', 1.3, b, leg, (armR, armL), armrot=[0, -0.7])

# ============================================================================= 25  PARTY CRASHER
def a_boozer():
    skin = H(0xe8a33c); skin2 = H(0xc07a22); shirt = H(0x1fb6c8); straw = H(0xf3d79f); straw2 = H(0xc8a868); pink = H(0xff2fa0); amber = H(0xd98a12, 1, 0.35); shorts = H(0xff5fb0)
    b = new_bm()
    box(b, (0.84, 0.52, 0.4), (0, 0, 1.34), shorts, 0.1); box(b, (0.86, 0.54, 0.08), (0, 0, 1.2), WHITE_, 0.02)
    ell(b, (0.66, 0.62, 0.6), (0, -0.1, 1.86), skin, u=12, v=7); ell(b, (0.05, 0.03, 0.05), (0, -0.7, 1.74), skin2, u=4, v=3)         # the belly, proudly out
    tube(b, [(0, 0.04, 1.8), (0, 0.02, 2.52)], [0.56, 0.5], 8, shirt)
    for sx in (-1, 1): box(b, (0.36, 0.1, 0.94), (sx * 0.36, -0.44, 2.04), shirt, 0.04, rot=(0, 0, sx * -0.12))                         # open shirt
    FL = [0xff2fa0, 0xffe63c, 0xffffff]
    for k in range(8): ell(b, (0.1, 0.05, 0.1), ((1 if k % 2 else -1) * (0.3 + (k % 3) * 0.07), -0.5 - (k % 2) * 0.01, 1.7 + k * 0.1), H(FL[k % 3]), u=5, v=3)   # hibiscus print
    LEI = [0xff2fa0, 0x25f4ff, 0xffe63c, 0x3cff9e, 0xff7a1a]
    for k in range(11):
        an = -1.4 + k * 0.28; ell(b, (0.15, 0.15, 0.13), (0.62 * math.sin(an), -0.36 * math.cos(an) - 0.06, 2.56 - 0.3 * math.cos(an)), H(LEI[k % 5], 1, 0.15), u=6, v=4)   # lei
    limb(b, (0, 0, 2.5), (0, 0, 2.8), 0.17, 0.15, skin2)
    ell(b, (0.46, 0.48, 0.5), (0, 0, 3.1), skin, u=10, v=6); ell(b, (0.14, 0.14, 0.12), (0, -0.5, 3.02), H(0xff6a5a), u=6, v=4)       # sunburnt nose
    box(b, (0.92, 0.08, 0.22), (0, -0.44, 3.2), BLACK_, 0.04); box(b, (0.12, 0.03, 0.04), (-0.26, -0.49, 3.24), WHITE_)                # shades
    box(b, (0.4, 0.05, 0.09), (0.04, -0.47, 2.84), WHITE_, 0.02, rot=(0, 0.12, 0))                                                    # lopsided grin
    lathe(b, [(0.0, 3.36), (1.2, 3.3), (1.3, 3.2)], 14, colors=[straw, straw2]); cyl(b, 0.56, 0.44, (0, 0, 3.58), straw, axis='Z', n=10, r2=0.48); cyl(b, 0.6, 0.12, (0, 0, 3.44), pink, axis='Z', n=10)   # floppy hat
    leg = new_bm(); limb(leg, (0, 0, 0.02), (0, -0.05, -0.36), 0.25, 0.22, shorts); limb(leg, (0, -0.05, -0.36), (0, 0.03, -1.16), 0.17, 0.12, skin); box(leg, (0.34, 0.62, 0.08), (0, -0.14, -1.26), pink, 0.03); box(leg, (0.05, 0.3, 0.1), (0, -0.2, -1.2), WHITE_)
    def bottle(a, col):
        cyl(a, 0.2, 0.8, (0, -0.42, -1.2), col, axis='Z', n=8); cyl(a, 0.12, 0.5, (0, -0.42, -0.62), col, axis='Z', n=8, r2=0.07); cyl(a, 0.21, 0.3, (0, -0.42, -1.26), WHITE_, axis='Z', n=8); cyl(a, 0.08, 0.06, (0, -0.42, -0.36), H(0xffe63c), axis='Z', n=6)
    armR = arm_std(shirt, skin, shirt, skin, 0.15); bottle(armR, H(0x3cff9e, 1, 0.3))
    armL = arm_std(shirt, skin, shirt, skin, 0.15); bottle(armL, amber)
    reg(25, 'PARTY CRASHER', 1.05, b, leg, (armR, armL), armrot=[0, -0.8])

# ============================================================================= 27  CLEANUP HITTER
def a_slugger():
    skin = H(0x7ad84a); skin2 = H(0x52a82c); wh = H(0xf6f6ff); red = H(0xd8182c); wood = H(0xd9a860); mitt = H(0x7a4a22); gum = H(0xff8fd0, 1, 0.25)
    b = new_bm()
    box(b, (0.84, 0.52, 0.36), (0, 0, 1.36), wh, 0.09); box(b, (0.88, 0.56, 0.1), (0, 0, 1.52), BLACK_, 0.02)
    box(b, (1.3, 0.72, 0.98), (0, 0, 2.08), wh, 0.2)                                                                                  # jersey
    for k in range(5): box(b, (0.035, 0.04, 0.9), (-0.44 + k * 0.22, -0.37, 2.06), red)                                               # pinstripes
    box(b, (0.36, 0.05, 0.1), (0.02, -0.39, 2.36), red); box(b, (0.1, 0.05, 0.5), (0.1, -0.39, 2.12), red, rot=(0, 0.3, 0))           # a big 7
    limb(b, (0, 0, 2.56), (0, 0, 2.8), 0.17, 0.15, skin2)
    ell(b, (0.46, 0.48, 0.5), (0, 0, 3.1), skin, u=10, v=6)
    for sx in (-1, 1): box(b, (0.22, 0.04, 0.07), (sx * 0.2, -0.45, 3.06), BLACK_); ell(b, (0.07, 0.04, 0.06), (sx * 0.2, -0.44, 3.2), WHITE_, u=5, v=4)   # eye black
    ell(b, (0.2, 0.2, 0.2), (0.16, -0.6, 2.86), gum, u=8, v=5)                                                                        # bubble gum
    ell(b, (0.5, 0.52, 0.34), (0, 0.02, 3.42), red, u=10, v=5); box(b, (0.7, 0.6, 0.07), (0, -0.56, 3.36), red, 0.03, rot=(-0.12, 0, 0)); ell(b, (0.14, 0.05, 0.14), (0, -0.5, 3.54), wh, u=6, v=4)   # cap
    cyl(b, 0.12, 3.2, (-1.1, 0, 3.0), wood, n=8, r2=0.2, rot=(0, -0.35, 0)); ell(b, (0.14, 0.14, 0.08), (-0.55, 0, 1.5), wood, u=6, v=4)   # bat on the shoulder
    leg = new_bm(); tube(leg, [(0, 0, 0.02), (0, -0.06, -0.62), (0, 0.0, -0.84), (0, 0.04, -1.14)], [0.23, 0.19, 0.16, 0.13], 7, wh, colors=[wh, red, red]); box(leg, (0.36, 0.6, 0.2), (0, -0.14, -1.2), BLACK_, 0.07)
    armR = arm_std(wh, skin, red, mitt, 0.16, fist=1.9)
    armL = arm_std(wh, skin, red, skin, 0.16)
    ell(armL, (0.2, 0.2, 0.2), (0, -0.3, -1.3), WHITE_, u=8, v=5); torus(armL, 0.2, 0.02, (0, -0.3, -1.3), red, axis='X', nu=10, nv=3)   # the ball
    reg(27, 'CLEANUP HITTER', 1.15, b, leg, (armR, armL), sniper=1, armrot=[0, -1.0])

# ============================================================================= 28  GALACTIC ICON  /  29  BIGGEST FAN
def a_disco():
    skin = H(0xb04dff); wh = H(0xf6f6ff, 1, 0.2); wh2 = H(0xcfcfe0); blk = H(0x07070c); sil = H(0xe8f4ff, 1, 0.6); spark = H(0xffffff, 1, 1)
    b = new_bm()
    box(b, (0.74, 0.48, 0.34), (0, 0, 1.36), blk, 0.09)
    box(b, (1.3, 0.74, 1.04), (0, 0, 2.06), wh, 0.2)                                                                                  # white jacket
    box(b, (0.4, 0.06, 1.0), (0, -0.37, 2.0), blk)
    for k in range(6): box(b, (0.18, 0.06, 0.09), (0, -0.4, 2.44 - k * 0.17), WHITE_ if k % 2 else blk)                              # striped tie
    for sx in (-1, 1): box(b, (0.28, 0.08, 0.96), (sx * 0.3, -0.38, 2.06), wh2, 0.03, rot=(0, sx * 0.2, 0)); ell(b, (0.07, 0.03, 0.05), (sx * 0.19, -0.44, 3.2), spark, u=5, v=4)
    limb(b, (0, 0, 2.56), (0, 0, 2.8), 0.16, 0.14, skin)
    ell(b, (0.44, 0.47, 0.5), (0, 0, 3.1), skin, u=10, v=6)
    tube(b, [(0.1, -0.44, 3.4), (0.16, -0.56, 3.26), (0.1, -0.54, 3.12)], [0.05, 0.04, 0.015], 4, blk)                                 # the one loose curl
    cyl(b, 1.0, 0.07, (0, 0, 3.56), wh, axis='Z', n=14); cyl(b, 0.62, 0.56, (0, 0, 3.88), wh, axis='Z', n=10, r2=0.5); cyl(b, 0.64, 0.2, (0, 0, 3.7), blk, axis='Z', n=10)   # fedora
    box(b, (0.3, 0.5, 0.1), (0, -0.74, 3.5), wh, 0.03, rot=(0.2, 0, 0))                                                               # brim tipped low
    leg = new_bm()
    tube(leg, [(0, 0, 0.02), (0, -0.05, -0.5), (0, -0.02, -0.92), (0, 0.02, -1.16)], [0.22, 0.2, 0.17, 0.15], 7, blk, colors=[blk, blk, WHITE_])   # short trousers, white socks
    box(leg, (0.36, 0.7, 0.2), (0, -0.16, -1.2), blk, 0.07); box(leg, (0.3, 0.26, 0.05), (0, -0.3, -1.09), WHITE_, 0.01)
    armR = arm_std(wh, wh, wh2, skin, 0.16)
    armL = arm_std(wh, wh, wh2, skin, 0.16, fist=0.6)
    glove = new_bm(); ell(glove, (0.22, 0.24, 0.3), (0, 0, 0), sil, u=8, v=6)
    for k in range(7): ell(glove, (0.04, 0.04, 0.04), (0.2 * math.cos(k * 0.9), 0.22 * math.sin(k * 0.9), ((k % 3) - 1) * 0.16), spark, u=4, v=3)
    aura = new_bm(); ell(aura, (2.6, 2.6, 2.6), (0, 0, 0), H(0xfff0a0, 0.35, 1), u=12, v=8)
    reg(28, 'GALACTIC ICON', 1.15, b, leg, (armR, armL), ex=[{'bm': glove, 'p': (0, -0.08, -1.26), 'role': 'ball', 'par': 'arm1'}, {'bm': aura, 'p': (0, 0, 2.0), 'role': 'aura', 'par': 'g', 'add': 1}], hum=1, bm=1)

def a_fan():
    skin = H(0x25f4ff); skin2 = H(0x129ab8); tee = H(0xffffff); pink = H(0xff2fa0, 1, 0.8); yel = H(0xffe63c, 1, 0.8); foam = H(0xffe63c, 1, 0.3)
    b = new_bm()
    box(b, (0.6, 0.42, 0.32), (0, 0, 1.36), H(0x2a2a40), 0.08)
    tube(b, [(0, 0, 1.46), (0, 0, 2.0), (0, 0, 2.46)], [0.3, 0.36, 0.44], 8, tee)                                                    # fan-club t-shirt
    prism(b, star_profile(0.26, 0.11, 5), 0.05, (0, -0.4, 2.06), pink, rot=(PI / 2, 0, 0.3), plane='XY')
    torus(b, 0.34, 0.035, (0, -0.02, 2.5), yel, axis='Z', nu=10, nv=4); torus(b, 0.38, 0.035, (0, -0.04, 2.42), pink, axis='Z', nu=10, nv=4)   # glow necklaces
    limb(b, (0, 0, 2.46), (0, 0, 2.76), 0.13, 0.12, skin2)
    ell(b, (0.56, 0.58, 0.58), (0, 0, 3.16), skin, u=12, v=7)                                                                        # big starstruck head
    torus(b, 0.56, 0.07, (0, 0, 3.44), pink, axis='Z', nu=14, nv=5); box(b, (0.98, 0.08, 0.2), (0, -0.54, 3.18), yel, 0.04)           # headband + shades
    box(b, (0.42, 0.05, 0.14), (0, -0.56, 2.9), WHITE_, 0.03)
    for sx in (-1, 1): limb(b, (sx * 0.3, 0, 3.66), (sx * 0.44, 0, 4.06), 0.03, 0.02, skin2, 4); prism(b, star_profile(0.12, 0.05, 5), 0.04, (sx * 0.46, 0, 4.14), yel, rot=(PI / 2, 0, 0), plane='XY')   # star boppers
    leg = leg_std(skin, skin, skin2, WHITE_, 0.15, foot=(0.3, 0.5, 0.2))
    for k in range(3): torus(leg, 0.16 - k * 0.01, 0.045, (0, 0.0, -0.8 - k * 0.1), pink, axis='Z', nu=8, nv=4)                     # leg warmers
    armR = arm_std(skin, skin, tee, skin, 0.11); cyl(armR, 0.05, 0.9, (0, -0.1, -1.6), pink, axis='Z', n=6)                           # glow stick
    armL = arm_std(skin, skin, tee, foam, 0.11)
    box(armL, (0.5, 0.2, 0.6), (0, -0.1, -1.5), foam, 0.08); box(armL, (0.16, 0.18, 0.6), (0, -0.1, -2.04), foam, 0.06)               # foam finger
    reg(29, 'BIGGEST FAN', 0.8, b, leg, (armR, armL), hip=(0.3, 0, 1.3), sh=(0.72, 0, 2.42), hum=1, dance=1)

for fn in (a_grunt, a_spitter, a_drone, a_brute, a_warlord, a_sprinter, a_bomber, a_knight, a_medic, a_gunship, a_queen, a_walker, a_monster, a_knifer, a_stalker, a_sniper, a_hound, a_overmind):
    fn()
a_shark(18, 'BEACH BITER', False)
for fn in (a_chef, a_movie, a_cleo, a_pirate, a_ringmaster, a_butcher, a_boozer):
    fn()
a_shark(26, 'APEX PREDATOR', True)
for fn in (a_slugger, a_disco, a_fan):
    fn()
LOW = False
print('enemy designs:', len(ALIENS), 'of 30   triangles:', sum(ASSETS[k]['t'] for k in ASSETS if k.startswith('a') and k[1:2].isdigit()))
