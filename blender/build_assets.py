# NEON INVASION - REMAKE : asset build script for Blender (4.1+ / 5.x)
#
#   blender --background --python build_assets.py -- <out nx-assets.js> <out .blend> [preview.png]
#
# Models every asset procedurally with bmesh (bevelled hard-surface parts, lathes, tubes), paints vertex colours,
# and writes them as compact base64 buffers into nx-assets.js (loaded by the game with a plain <script> tag, so the
# game still runs from a double-click with no server). The .blend it saves holds every model for hand editing.
#
# Blender space: +Z up, +Y = gun muzzle direction, aliens face -Y.  Game space (three.js): +Y up, -Z forward.
import bpy, bmesh, math, base64, sys, os, json
from array import array
from mathutils import Matrix, Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_JS = argv[0] if len(argv) > 0 else os.path.join(os.path.dirname(__file__), '..', 'nx', 'nx-assets.js')
OUT_BLEND = argv[1] if len(argv) > 1 else os.path.join(os.path.dirname(__file__), 'neon_invasion_assets.blend')
OUT_PNG = argv[2] if len(argv) > 2 else None

# ----------------------------------------------------------------------------- colours
WHITE = (1, 1, 1)
DARK = (0.075, 0.07, 0.1)
RUBBER = (0.04, 0.04, 0.055)
METAL = (0.52, 0.54, 0.6)
STEEL = (0.3, 0.31, 0.37)
GLASS = (0.1, 0.32, 0.55)
def sh(v): return (v, v, v)

# ----------------------------------------------------------------------------- bmesh helpers
def _append(bm, tmp, color):
    """copy tmp into bm and paint the new faces"""
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    n0 = len(bm.faces); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bm.faces.ensure_lookup_table()
    lay = bm.loops.layers.float_color.get('Col') or bm.loops.layers.float_color.new('Col')
    c = (color[0], color[1], color[2], color[3] if len(color) > 3 else 0.0)     # alpha = how much this surface glows
    for f in bm.faces[n0:]:
        for l in f.loops: l[lay] = c

def _xf(pos, rot):
    return Matrix.Translation(Vector(pos)) @ Euler(rot, 'XYZ').to_matrix().to_4x4()

LOW = False      # low-detail mode for models that are drawn many times (aliens, lamps)
def box(bm, size, pos=(0, 0, 0), color=WHITE, bevel=0.0, rot=(0, 0, 0), taper=None, seg=2):
    if LOW: seg = 1
    t = bmesh.new(); bmesh.ops.create_cube(t, size=1.0)
    bmesh.ops.scale(t, vec=Vector(size), verts=t.verts)
    if taper:                                   # (x scale, z scale) of the +Y end
        for v in t.verts:
            if v.co.y > 0: v.co.x *= taper[0]; v.co.z *= taper[1]
    if bevel > 0:
        bmesh.ops.bevel(t, geom=list(t.edges), offset=bevel, offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.transform(t, matrix=_xf(pos, rot), verts=t.verts)
    _append(bm, t, color)

AX = {'Z': (0, 0, 0), 'Y': (-math.pi / 2, 0, 0), 'X': (0, math.pi / 2, 0)}
def cyl(bm, r, length, pos=(0, 0, 0), color=WHITE, axis='Y', n=14, r2=None, bevel=0.0, rot=None):
    if LOW: n = min(n, 8); bevel = 0.0
    t = bmesh.new()
    bmesh.ops.create_cone(t, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=length)
    if bevel > 0:
        rim = [e for e in t.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6 and len(e.link_faces) == 2 and any(len(f.verts) > 4 for f in e.link_faces)]
        if rim: bmesh.ops.bevel(t, geom=rim, offset=bevel, offset_type='OFFSET', segments=2, profile=0.5, affect='EDGES', clamp_overlap=True)
    m = _xf(pos, rot) if rot else _xf(pos, AX[axis])
    bmesh.ops.transform(t, matrix=m, verts=t.verts)
    _append(bm, t, color)

def sphere(bm, r, pos=(0, 0, 0), color=WHITE, scale=(1, 1, 1), u=14, v=9, rot=(0, 0, 0)):
    if LOW: u = min(u, 10); v = min(v, 6)
    t = bmesh.new(); bmesh.ops.create_uvsphere(t, u_segments=u, v_segments=v, radius=r)
    bmesh.ops.scale(t, vec=Vector(scale), verts=t.verts)
    bmesh.ops.transform(t, matrix=_xf(pos, rot), verts=t.verts)
    _append(bm, t, color)

def torus(bm, R, r, pos=(0, 0, 0), color=WHITE, axis='Y', nu=18, nv=8, arc=1.0):
    if LOW: nu = min(nu, 12); nv = min(nv, 5)
    t = bmesh.new(); rings = []
    cnt = nu if arc >= 1.0 else nu + 1
    for i in range(cnt):
        a = 2 * math.pi * arc * i / nu; ring = []
        for j in range(nv):
            b = 2 * math.pi * j / nv
            ring.append(t.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        rings.append(ring)
    for i in range(nu):
        if arc < 1.0 and i + 1 >= cnt: break
        a, b = rings[i], rings[(i + 1) % cnt]
        for j in range(nv): t.faces.new((a[j], b[j], b[(j + 1) % nv], a[(j + 1) % nv]))
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    bmesh.ops.transform(t, matrix=_xf(pos, AX[axis]), verts=t.verts)
    _append(bm, t, color)

def prism(bm, profile, width, pos=(0, 0, 0), color=WHITE, bevel=0.0, rot=(0, 0, 0), plane='YZ'):
    """extrude a 2D outline: plane 'YZ' extrudes along X, 'XY' extrudes along Z"""
    t = bmesh.new()
    if plane == 'YZ': vs = [t.verts.new((-width / 2, p[0], p[1])) for p in profile]; d = Vector((width, 0, 0))
    else: vs = [t.verts.new((p[0], p[1], -width / 2)) for p in profile]; d = Vector((0, 0, width))
    f = t.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(t, geom=[f])
    bmesh.ops.translate(t, vec=d, verts=[e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    if bevel > 0: bmesh.ops.bevel(t, geom=list(t.edges), offset=bevel, offset_type='OFFSET', segments=2, profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.transform(t, matrix=_xf(pos, rot), verts=t.verts)
    _append(bm, t, color)

def lathe(bm, profile, n=24, pos=(0, 0, 0), color=WHITE, axis='Z', colors=None):
    """revolve (radius, height) pairs round Z; colors = optional colour per profile segment"""
    t = bmesh.new(); rings = []
    for (r, h) in profile:
        if r < 1e-6: rings.append([t.verts.new((0, 0, h))])
        else: rings.append([t.verts.new((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), h)) for i in range(n)])
    segf = []
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]; fs = []
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1 and len(b) == 1: continue
            if len(a) == 1: fs.append(t.faces.new((a[0], b[j], b[i])))
            elif len(b) == 1: fs.append(t.faces.new((a[i], a[j], b[0])))
            else: fs.append(t.faces.new((a[i], a[j], b[j], b[i])))
        segf.append(fs)
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    bmesh.ops.transform(t, matrix=_xf(pos, AX[axis]), verts=t.verts)
    if colors is None: _append(bm, t, color); return
    # per-segment colours: paint inside tmp, then append keeping the layer
    lay = t.loops.layers.float_color.new('Col')
    for fs, c in zip(segf, colors):
        for f in fs:
            for l in f.loops: l[lay] = (c[0], c[1], c[2], c[3] if len(c) > 3 else 0.0)
    me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)

def tube(bm, pts, radii, m=8, color=WHITE, caps=True, colors=None):
    """sweep a circle along a polyline (parallel-transport frames); radii = one value or one per point"""
    t = bmesh.new(); P = [Vector(p) for p in pts]; n = len(P)
    if not isinstance(radii, (list, tuple)): radii = [radii] * n
    tang = [(P[min(i + 1, n - 1)] - P[max(i - 1, 0)]).normalized() for i in range(n)]
    up = Vector((1, 0, 0)) if abs(tang[0].x) < 0.9 else Vector((0, 0, 1))
    nrm = tang[0].cross(up).normalized(); rings = []
    for i in range(n):
        if i > 0:
            ax = tang[i - 1].cross(tang[i])
            if ax.length > 1e-8:
                ang = tang[i - 1].angle(tang[i]); nrm = (Matrix.Rotation(ang, 3, ax.normalized()) @ nrm).normalized()
        bi = tang[i].cross(nrm).normalized()
        rings.append([t.verts.new(P[i] + (nrm * math.cos(2 * math.pi * j / m) + bi * math.sin(2 * math.pi * j / m)) * radii[i]) for j in range(m)])
    segf = []
    for i in range(n - 1):
        fs = []
        for j in range(m): fs.append(t.faces.new((rings[i][j], rings[i][(j + 1) % m], rings[i + 1][(j + 1) % m], rings[i + 1][j])))
        segf.append(fs)
    if caps: t.faces.new(list(reversed(rings[0]))); t.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    if colors is None: _append(bm, t, color); return
    lay = t.loops.layers.float_color.new('Col')
    for f in t.faces:
        for l in f.loops: l[lay] = (color[0], color[1], color[2], color[3] if len(color) > 3 else 0.0)
    for fs, c in zip(segf, colors):
        for f in fs:
            for l in f.loops: l[lay] = (c[0], c[1], c[2], c[3] if len(c) > 3 else 0.0)
    me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)

def new_bm():
    bm = bmesh.new(); bm.loops.layers.float_color.new('Col'); return bm

# ----------------------------------------------------------------------------- export
ASSETS = {}; PREVIEW = []
def b64(a): return base64.b64encode(a.tobytes()).decode('ascii')

def export(name, bm, scale=1.0, smooth_deg=38.0, uv=None, meta=None, shade=0.0, keep=True, glow=False):
    """triangulate, compute smoothing-angle normals, weld identical corners, convert to game space and store"""
    if not len(bm.faces): return
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.normal_update(); bm.faces.ensure_lookup_table()
    lay = bm.loops.layers.float_color['Col']; thr = math.radians(smooth_deg)
    zs = [v.co.z for v in bm.verts]; z0, z1 = min(zs), max(zs)
    P = array('f'); N = array('b'); C = array('B'); U = array('f'); GL = array('B'); I = []; seen = {}
    for f in bm.faces:
        if f.calc_area() < 1e-12: continue
        tri = []
        for l in f.loops:
            v = l.vert; acc = Vector((0, 0, 0))
            for f2 in v.link_faces:
                if f2.normal.length > 0 and f.normal.angle(f2.normal, 0.0) < thr: acc += f2.normal * f2.calc_area()
            n = acc.normalized() if acc.length > 1e-12 else f.normal
            c = l[lay]; k = 1.0
            if shade > 0 and z1 > z0: k = 1.0 - shade * (1.0 - (v.co.z - z0) / (z1 - z0))     # darker toward the bottom: cheap grounding
            col = (min(255, int(c[0] * k * 255 + 0.5)), min(255, int(c[1] * k * 255 + 0.5)), min(255, int(c[2] * k * 255 + 0.5)))
            p = (v.co.x * scale, v.co.z * scale, -v.co.y * scale)                               # Blender -> three.js
            nn = (int(round(n.x * 127)), int(round(n.z * 127)), int(round(-n.y * 127)))
            gv = min(255, int(max(0.0, c[3]) * 255 + 0.5)) if glow else 0
            key = (round(p[0], 4), round(p[1], 4), round(p[2], 4), nn, col, gv)
            i = seen.get(key)
            if i is None:
                i = len(seen); seen[key] = i; P.extend(p); N.extend(nn); C.extend(col); GL.append(gv)
                if uv: U.extend(uv(v.co, n))
            tri.append(i)
        I.extend(tri)
    nv = len(seen); i32 = nv > 65535
    d = {'v': nv, 't': len(I) // 3, 'p': b64(P), 'n': b64(N), 'c': b64(C), 'i': b64(array('I' if i32 else 'H', I))}
    if i32: d['i32'] = 1
    if uv: d['u'] = b64(U)
    if glow: d['g'] = b64(GL)
    if meta: d['m'] = meta
    ASSETS[name] = d
    if keep:
        me = bpy.data.meshes.new(name); bm.to_mesh(me)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); PREVIEW.append(ob)
    print('  %-16s %6d verts %6d tris' % (name, nv, len(I) // 3))
    bm.free()
    return PREVIEW[-1] if keep else None

def camo_uv(co, n):      # simple box projection for the gun camo textures
    ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
    if ax >= ay and ax >= az: return (co.y * 5.0, co.z * 5.0)
    if az >= ay: return (co.y * 5.0, co.x * 5.0)
    return (co.x * 5.0, co.z * 5.0)

def Tm(v): return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]   # a point, Blender -> three.js

# ----------------------------------------------------------------------------- first-person weapons
GUNS = []
def gun(i, build):
    g = {'body': new_bm(), 'detail': new_bm(), 'accent': new_bm()}
    muzzle = build(g['body'], g['detail'], g['accent'])
    export('gun%d_body' % i, g['body'], uv=camo_uv, meta={'muzzle': Tm(muzzle)}, shade=0.18)
    export('gun%d_detail' % i, g['detail'], shade=0.12)
    export('gun%d_accent' % i, g['accent'])

def grip(d, pos, tilt=0.28, size=(0.03, 0.046, 0.105)):
    box(d, size, pos, DARK, 0.009, rot=(tilt, 0, 0))
    for k in range(4):   # grip texture ridges
        box(d, (size[0] + 0.003, 0.004, 0.004), (pos[0], pos[1] + 0.006 - k * 0.002, pos[2] + 0.03 - k * 0.02), RUBBER, 0.001, rot=(tilt, 0, 0))

def trigger(d, y, z):
    torus(d, 0.021, 0.0032, (0, y, z), STEEL, 'X', nu=14, nv=6, arc=0.55)
    box(d, (0.006, 0.006, 0.02), (0, y - 0.004, z + 0.012), METAL, 0.0015, rot=(0.25, 0, 0))

def rail(b, d, y0, y1, z, w=0.02):
    box(b, (w, y1 - y0, 0.01), (0, (y0 + y1) / 2, z), sh(0.8), 0.002)
    n = max(2, int((y1 - y0) / 0.022))
    for k in range(n): box(d, (w + 0.003, 0.009, 0.006), (0, y0 + 0.012 + k * (y1 - y0 - 0.024) / max(1, n - 1), z + 0.007), DARK, 0.0012)

def g_pistol(b, d, a):       # FLAMINGO - pink laser pistol
    box(b, (0.034, 0.2, 0.04), (0, 0.04, 0.02), sh(1.0), 0.007)
    box(b, (0.03, 0.13, 0.022), (0, 0.02, -0.008), sh(0.78), 0.005)
    box(b, (0.036, 0.05, 0.03), (0, 0.115, 0.018), sh(0.88), 0.004)
    for k in range(5): box(d, (0.0355, 0.004, 0.026), (0, -0.04 + k * 0.009, 0.024), DARK, 0.001)   # slide serrations
    grip(d, (0, -0.043, -0.07)); trigger(d, 0.026, -0.03)
    cyl(d, 0.013, 0.03, (0, 0.148, 0.02), METAL, bevel=0.002); cyl(d, 0.008, 0.032, (0, 0.15, 0.02), DARK)
    torus(a, 0.0165, 0.0038, (0, 0.158, 0.02))
    box(a, (0.0365, 0.12, 0.0045), (0, 0.05, 0.026)); box(a, (0.006, 0.008, 0.006), (0, 0.13, 0.043))
    cyl(a, 0.0115, 0.042, (0, -0.048, 0.022), axis='X', n=10)
    box(d, (0.022, 0.01, 0.009), (0, -0.052, 0.044), DARK, 0.002); box(d, (0.03, 0.012, 0.008), (0, -0.048, -0.122), STEEL, 0.002, rot=(0.28, 0, 0))
    return (0, 0.175, 0.02)

def g_smg(b, d, a):          # AQUA-9 - cyan laser SMG
    box(b, (0.046, 0.3, 0.062), (0, 0.05, 0.02), sh(1.0), 0.009)
    box(b, (0.04, 0.1, 0.03), (0, 0.16, -0.015), sh(0.8), 0.006)
    rail(b, d, -0.07, 0.17, 0.056)
    grip(d, (0, -0.06, -0.062), 0.25, (0.034, 0.046, 0.11)); trigger(d, 0.0, -0.022)
    box(d, (0.03, 0.036, 0.085), (0, 0.15, -0.066), DARK, 0.009, rot=(-0.12, 0, 0))
    box(d, (0.026, 0.04, 0.14), (0, 0.045, -0.08), DARK, 0.006, rot=(0.08, 0, 0)); box(a, (0.0285, 0.012, 0.09), (0, 0.045, -0.085), rot=(0.08, 0, 0))
    cyl(d, 0.021, 0.06, (0, 0.225, 0.025), STEEL, bevel=0.003); cyl(d, 0.012, 0.13, (0, 0.265, 0.025), METAL); cyl(d, 0.007, 0.132, (0, 0.266, 0.025), DARK)
    for y in (0.262, 0.286, 0.31): torus(a, 0.0175, 0.0033, (0, y, 0.025), nu=14, nv=6)
    box(d, (0.03, 0.09, 0.042), (0, -0.14, 0.022), DARK, 0.012); box(d, (0.034, 0.012, 0.07), (0, -0.19, 0.01), RUBBER, 0.004)
    for sx in (-1, 1):
        torus(a, 0.014, 0.004, (sx * 0.0245, -0.01, 0.03), axis='X', nu=12, nv=6); box(a, (0.002, 0.16, 0.005), (sx * 0.0232, 0.08, 0.035))
    return (0, 0.335, 0.025)

def g_shotgun(b, d, a):      # SUNSET - orange laser shotgun
    for sx in (-1, 1):
        cyl(b, 0.021, 0.42, (sx * 0.022, 0.21, 0.03), sh(0.95), bevel=0.003); cyl(d, 0.015, 0.422, (sx * 0.022, 0.212, 0.03), DARK)
        torus(a, 0.0225, 0.004, (sx * 0.022, 0.41, 0.03), nu=14, nv=6)
    box(b, (0.074, 0.2, 0.074), (0, -0.05, 0.014), sh(1.0), 0.013)
    box(d, (0.08, 0.15, 0.046), (0, 0.17, -0.014), DARK, 0.011)
    for k in range(6): box(d, (0.083, 0.007, 0.036), (0, 0.11 + k * 0.024, -0.014), STEEL, 0.002)
    box(d, (0.092, 0.022, 0.052), (0, 0.335, 0.03), STEEL, 0.006)
    for sx in (-1, 1):
        for k in range(4): box(a, (0.003, 0.026, 0.008), (sx * 0.0365, -0.11 + k * 0.036, 0.03), rot=(0.5, 0, 0))
    grip(d, (0, -0.135, -0.062), 0.36, (0.034, 0.05, 0.11)); trigger(d, -0.07, -0.03)
    box(d, (0.042, 0.17, 0.062), (0, -0.25, 0.0), DARK, 0.014, taper=(1.0, 0.8)); box(d, (0.046, 0.014, 0.08), (0, -0.34, -0.004), RUBBER, 0.005)
    box(a, (0.076, 0.14, 0.004), (0, -0.05, 0.035))
    return (0, 0.435, 0.03)

def g_rail(b, d, a):         # VIOLET RAIL - purple piercing rail gun
    box(b, (0.072, 0.2, 0.094), (0, -0.08, 0.022), sh(1.0), 0.013)
    box(b, (0.022, 0.56, 0.018), (0, 0.3, 0.058), sh(0.92), 0.004); box(b, (0.022, 0.56, 0.018), (0, 0.3, -0.008), sh(0.82), 0.004)
    box(b, (0.03, 0.08, 0.02), (0, 0.06, 0.062), sh(0.75), 0.004); box(b, (0.03, 0.08, 0.02), (0, 0.06, -0.012), sh(0.75), 0.004)
    cyl(a, 0.0055, 0.53, (0, 0.3, 0.025), n=8)
    for k in range(7): torus(a if k % 2 == 0 else d, 0.027, 0.0048, (0, 0.09 + k * 0.075, 0.025), WHITE if k % 2 == 0 else STEEL, nu=16, nv=6)
    for y in (0.04, 0.565): box(d, (0.032, 0.02, 0.09), (0, y, 0.025), STEEL, 0.005)
    for sx in (-1, 1):
        cyl(a, 0.013, 0.09, (sx * 0.042, -0.08, 0.045), n=10); cyl(d, 0.015, 0.02, (sx * 0.042, -0.03, 0.045), STEEL, n=10); cyl(d, 0.015, 0.02, (sx * 0.042, -0.13, 0.045), STEEL, n=10)
    grip(d, (0, -0.1, -0.075), 0.3, (0.032, 0.046, 0.1)); trigger(d, -0.04, -0.04)
    box(d, (0.036, 0.15, 0.052), (0, -0.25, 0.012), DARK, 0.012); box(d, (0.04, 0.014, 0.085), (0, -0.33, 0.0), RUBBER, 0.004)
    box(d, (0.03, 0.05, 0.022), (0, 0.2, -0.03), DARK, 0.005); rail(b, d, -0.15, -0.02, 0.072)
    return (0, 0.6, 0.025)

def g_minigun(b, d, a):      # LIME STORM - green laser minigun
    for k in range(6):
        an = k * math.pi / 3; cyl(d, 0.009, 0.42, (0.028 * math.cos(an), 0.33, 0.028 * math.sin(an)), METAL, n=8)
    cyl(d, 0.011, 0.44, (0, 0.33, 0), STEEL, n=8)
    for y in (0.2, 0.36, 0.52): cyl(d, 0.043, 0.016, (0, y, 0), STEEL, n=18, bevel=0.003)
    cyl(b, 0.056, 0.2, (0, 0.03, 0), sh(1.0), n=18, bevel=0.008)
    box(b, (0.094, 0.11, 0.104), (0, -0.115, 0), sh(0.9), 0.016)
    for k in range(5): box(d, (0.116, 0.01, 0.03), (0, -0.03 + k * 0.03, 0.0), DARK, 0.003)
    for y in (0.0, 0.13): box(d, (0.012, 0.012, 0.05), (0, y, 0.078), DARK, 0.003)
    box(d, (0.018, 0.17, 0.016), (0, 0.065, 0.104), RUBBER, 0.006)
    cyl(d, 0.062, 0.052, (-0.078, -0.03, -0.03), DARK, axis='X', n=18, bevel=0.006); torus(a, 0.045, 0.005, (-0.106, -0.03, -0.03), axis='X'); cyl(a, 0.016, 0.006, (-0.106, -0.03, -0.03), axis='X', n=10)
    grip(d, (0, -0.145, -0.095), 0.3, (0.032, 0.046, 0.1))
    torus(a, 0.0575, 0.0045, (0, 0.105, 0)); torus(a, 0.0575, 0.0045, (0, -0.045, 0)); torus(a, 0.041, 0.004, (0, 0.535, 0))
    return (0, 0.56, 0)

def g_sniper(b, d, a):       # LONGSHOT - blue scope rifle
    box(b, (0.04, 0.3, 0.056), (0, 0.0, 0.01), sh(1.0), 0.009)
    box(b, (0.036, 0.24, 0.04), (0, 0.26, 0.012), sh(0.86), 0.008, taper=(0.75, 0.75))
    cyl(d, 0.0105, 0.56, (0, 0.44, 0.022), METAL, n=10); cyl(d, 0.014, 0.1, (0, 0.21, 0.022), STEEL, n=10)
    box(d, (0.032, 0.065, 0.032), (0, 0.72, 0.022), STEEL, 0.006)
    for y in (0.705, 0.735): box(a, (0.034, 0.012, 0.012), (0, y, 0.022))
    cyl(d, 0.02, 0.26, (0, 0.02, 0.088), DARK, n=14, bevel=0.003); cyl(d, 0.029, 0.055, (0, 0.17, 0.088), DARK, n=14, bevel=0.004); cyl(d, 0.025, 0.045, (0, -0.125, 0.088), DARK, n=14, bevel=0.004)
    cyl(d, 0.025, 0.004, (0, 0.199, 0.088), GLASS, n=14); cyl(d, 0.021, 0.004, (0, -0.149, 0.088), GLASS, n=14); torus(a, 0.0285, 0.003, (0, 0.2, 0.088), nu=16, nv=6)
    cyl(d, 0.011, 0.02, (0, 0.03, 0.115), STEEL, axis='Z', n=10); cyl(d, 0.011, 0.02, (0.027, 0.03, 0.088), STEEL, axis='X', n=10)
    for y in (-0.055, 0.085): box(d, (0.016, 0.022, 0.034), (0, y, 0.055), STEEL, 0.004)
    box(d, (0.036, 0.28, 0.07), (0, -0.29, -0.006), DARK, 0.014, rot=(0, 0, 0), taper=(1.0, 0.72)); box(b, (0.03, 0.13, 0.022), (0, -0.25, 0.04), sh(0.8), 0.008)
    box(d, (0.04, 0.014, 0.09), (0, -0.435, -0.006), RUBBER, 0.004)
    grip(d, (0, -0.1, -0.062), 0.36, (0.03, 0.042, 0.095)); trigger(d, -0.04, -0.028)
    box(d, (0.026, 0.06, 0.05), (0, 0.05, -0.04), DARK, 0.006)
    cyl(d, 0.006, 0.04, (0.035, -0.03, 0.03), STEEL, axis='X', n=8); sphere(d, 0.011, (0.058, -0.03, 0.03), METAL, u=10, v=6)
    box(a, (0.042, 0.2, 0.004), (0, 0.0, 0.014))
    for sx in (-1, 1): tube(d, [(sx * 0.012, 0.36, 0.0), (sx * 0.03, 0.39, -0.05), (sx * 0.05, 0.41, -0.11)], 0.005, 6, STEEL)   # folded bipod
    return (0, 0.76, 0.022)

def g_gatling(b, d, a):      # ARC GATLING - red charge-up minigun
    for k in range(4):
        an = k * math.pi / 2 + math.pi / 4; cyl(d, 0.014, 0.4, (0.03 * math.cos(an), 0.33, 0.03 * math.sin(an)), METAL, n=10); cyl(d, 0.009, 0.402, (0.03 * math.cos(an), 0.332, 0.03 * math.sin(an)), DARK, n=8)
    for y in (0.2, 0.44): cyl(d, 0.054, 0.02, (0, y, 0), STEEL, n=18, bevel=0.004)
    cyl(b, 0.066, 0.22, (0, 0.01, 0), sh(1.0), n=18, bevel=0.01); box(b, (0.104, 0.12, 0.124), (0, -0.14, 0), sh(0.9), 0.018)
    torus(a, 0.06, 0.0075, (0, 0.525, 0), nu=22, nv=8)
    for k in range(4):
        an = k * math.pi / 2; sphere(a, 0.012, (0.06 * math.cos(an), 0.525, 0.06 * math.sin(an)), u=8, v=6); cyl(d, 0.005, 0.085, (0.06 * math.cos(an), 0.485, 0.06 * math.sin(an)), STEEL, n=6)
    box(d, (0.05, 0.17, 0.084), (0.088, -0.02, 0), DARK, 0.011)
    for k in range(4): box(a, (0.052, 0.024, 0.012), (0.088, -0.075 + k * 0.037, 0.022))
    box(d, (0.03, 0.05, 0.1), (0, 0.1, -0.105), DARK, 0.01); grip(d, (0, -0.165, -0.105), 0.3, (0.032, 0.046, 0.1))
    torus(a, 0.0675, 0.004, (0, -0.07, 0)); torus(a, 0.0675, 0.004, (0, 0.09, 0))
    tube(d, [(0.06, -0.1, 0.05), (0.075, -0.04, 0.08), (0.05, 0.05, 0.075), (0.03, 0.1, 0.06)], 0.007, 6, RUBBER)
    return (0, 0.57, 0)

def star_profile(ro, ri, pts=4):
    o = []
    for k in range(pts * 2):
        an = k * math.pi / pts; r = ro if k % 2 == 0 else ri; o.append((r * math.cos(an), r * math.sin(an)))
    return o

def g_stars(b, d, a):        # NEON STARS - gold throwing stars
    tilt = (1.15, 0.0, 0.5)
    prism(b, star_profile(0.105, 0.03), 0.009, (0.0, 0.07, 0.03), sh(1.0), 0.0025, rot=tilt, plane='XY')
    prism(a, star_profile(0.112, 0.022), 0.003, (0.0, 0.07, 0.03), WHITE, 0, rot=tilt, plane='XY')
    cyl(d, 0.018, 0.014, (0.0, 0.07, 0.03), STEEL, n=12, rot=tilt, bevel=0.002); cyl(a, 0.009, 0.017, (0.0, 0.07, 0.03), n=10, rot=tilt)
    prism(b, star_profile(0.085, 0.025), 0.008, (0.012, -0.01, 0.0), sh(0.8), 0.002, rot=(1.25, 0.2, 0.2), plane='XY')
    prism(b, star_profile(0.075, 0.022), 0.008, (0.02, -0.06, -0.02), sh(0.65), 0.002, rot=(1.3, 0.35, 0.9), plane='XY')
    box(d, (0.075, 0.13, 0.05), (0.01, -0.09, -0.06), DARK, 0.016); box(d, (0.08, 0.02, 0.055), (0.01, -0.04, -0.06), STEEL, 0.006)
    box(a, (0.05, 0.08, 0.004), (0.01, -0.1, -0.034))
    return (0, 0.14, 0.04)

def g_flame(b, d, a):        # INFERNO - flamethrower
    box(b, (0.052, 0.3, 0.062), (0, 0.0, 0.022), sh(1.0), 0.011)
    cyl(d, 0.016, 0.32, (0, 0.3, 0.03), METAL, n=12); cyl(d, 0.027, 0.15, (0, 0.3, 0.03), DARK, n=14, bevel=0.003)
    for y in (0.245, 0.3, 0.355): torus(a, 0.028, 0.003, (0, y, 0.03), nu=16, nv=6)
    cyl(d, 0.02, 0.07, (0, 0.475, 0.03), STEEL, n=14, r2=0.032); cyl(d, 0.026, 0.004, (0, 0.512, 0.03), RUBBER, n=14)
    cyl(b, 0.046, 0.22, (0, 0.02, -0.062), sh(0.9), n=18); sphere(b, 0.046, (0, 0.13, -0.062), sh(0.9), (1, 0.6, 1), 18, 8); sphere(b, 0.046, (0, -0.09, -0.062), sh(0.9), (1, 0.6, 1), 18, 8)
    for y in (-0.04, 0.08): torus(a, 0.047, 0.0045, (0, y, -0.062), nu=20, nv=6)
    tube(d, [(0, 0.15, -0.06), (0, 0.2, -0.05), (0, 0.23, -0.015), (0, 0.24, 0.02)], 0.008, 7, RUBBER)
    cyl(a, 0.006, 0.03, (0, 0.5, -0.004), n=8); box(d, (0.008, 0.06, 0.008), (0, 0.47, 0.002), STEEL, 0.002)
    grip(d, (0, -0.11, -0.05), 0.3, (0.032, 0.046, 0.09)); box(d, (0.028, 0.04, 0.07), (0, 0.19, -0.03), DARK, 0.008)
    box(d, (0.04, 0.11, 0.05), (0, -0.2, 0.02), DARK, 0.012)
    box(a, (0.054, 0.06, 0.02), (0, -0.06, 0.036)); rail(b, d, -0.02, 0.13, 0.056)
    return (0, 0.53, 0.03)

def g_gas(b, d, a):          # TOXIC SPRAYER - gas cloud launcher
    box(b, (0.062, 0.2, 0.074), (0, -0.04, 0.012), sh(1.0), 0.012)
    cyl(d, 0.056, 0.1, (0, 0.105, 0.005), STEEL, n=18, bevel=0.005)
    for k in range(6):
        an = k * math.pi / 3; cyl(d, 0.013, 0.104, (0.035 * math.cos(an), 0.106, 0.005 + 0.035 * math.sin(an)), DARK, n=8)
    cyl(b, 0.029, 0.2, (0, 0.255, 0.022), sh(0.9), n=16, bevel=0.003); cyl(d, 0.035, 0.035, (0, 0.352, 0.022), DARK, n=16, bevel=0.004); cyl(d, 0.024, 0.037, (0, 0.354, 0.022), RUBBER, n=14)
    for y in (0.2, 0.3): torus(a, 0.0305, 0.004, (0, y, 0.022), nu=16, nv=6)
    cyl(d, 0.021, 0.1, (0, -0.04, 0.075), GLASS, n=12); cyl(a, 0.0155, 0.092, (0, -0.04, 0.075), n=10)
    for y in (-0.095, 0.015): cyl(d, 0.024, 0.014, (0, y, 0.075), STEEL, n=12, bevel=0.002)
    for k in range(3): box(a, (0.064, 0.02, 0.008), (0, -0.1 + k * 0.045, 0.012), rot=(0.6, 0, 0))
    grip(d, (0, -0.1, -0.07), 0.3, (0.032, 0.046, 0.1)); trigger(d, -0.04, -0.035)
    box(d, (0.04, 0.12, 0.055), (0, -0.2, 0.01), DARK, 0.013); box(d, (0.03, 0.04, 0.07), (0, 0.2, -0.035), DARK, 0.009)
    return (0, 0.375, 0.022)

def g_knuckles(b, d, a):     # BRASS KNUCKLES - two fists
    for sx in (-1, 1):
        x = sx * 0.11
        box(d, (0.08, 0.085, 0.074), (x, 0.0, 0.0), DARK, 0.022, seg=3)
        cyl(d, 0.037, 0.14, (x, -0.1, -0.004), RUBBER, n=14, r2=0.034); torus(d, 0.038, 0.006, (x, -0.04, -0.004), STEEL, nu=16, nv=6)
        box(d, (0.03, 0.05, 0.03), (x - sx * 0.04, 0.012, -0.012), DARK, 0.012, rot=(0, 0, sx * 0.5))
        box(b, (0.09, 0.022, 0.032), (x, 0.048, 0.012), sh(1.0), 0.008)
        for k in range(4):
            fx = x + (k - 1.5) * 0.021
            torus(b, 0.0125, 0.0052, (fx, 0.058, 0.014), sh(0.95), nu=12, nv=6); sphere(a, 0.0075, (fx, 0.075, 0.014), u=8, v=6)
        box(a, (0.088, 0.004, 0.006), (x, 0.038, 0.03))
    return (0, 0.1, 0.01)

def g_bomber(b, d, a):       # MINI-BOMBER - mini bomb launcher
    cyl(b, 0.046, 0.36, (0, 0.14, 0.022), sh(1.0), n=18, bevel=0.004); cyl(d, 0.037, 0.362, (0, 0.142, 0.022), RUBBER, n=16)
    cyl(d, 0.05, 0.03, (0, 0.31, 0.022), STEEL, n=18, bevel=0.004)
    box(b, (0.074, 0.17, 0.084), (0, -0.1, 0.012), sh(0.9), 0.014)
    cyl(d, 0.058, 0.074, (0, -0.07, -0.07), DARK, axis='X', n=18, bevel=0.007); torus(a, 0.04, 0.005, (0.038, -0.07, -0.07), axis='X'); torus(a, 0.04, 0.005, (-0.038, -0.07, -0.07), axis='X')
    for y in (-0.01, 0.11, 0.25): torus(a, 0.0475, 0.0048, (0, y, 0.022), nu=20, nv=6)
    box(d, (0.02, 0.01, 0.045), (0, 0.08, 0.088), DARK, 0.003); box(a, (0.008, 0.012, 0.008), (0, 0.08, 0.112)); box(d, (0.02, 0.03, 0.012), (0, 0.08, 0.068), STEEL, 0.003)
    grip(d, (0, -0.15, -0.075), 0.3, (0.032, 0.046, 0.1)); box(d, (0.03, 0.04, 0.08), (0, 0.13, -0.055), DARK, 0.01, rot=(-0.1, 0, 0))
    box(d, (0.042, 0.11, 0.058), (0, -0.23, 0.012), DARK, 0.014); box(d, (0.046, 0.014, 0.08), (0, -0.29, 0.006), RUBBER, 0.004)
    sphere(a, 0.03, (0, 0.3, 0.022), scale=(1, 0.5, 1), u=12, v=6)
    return (0, 0.345, 0.022)

# ----------------------------------------------------------------------------- palm trees
def build_palm(hi=True):
    bm = new_bm()
    H = 9.0; seg = 7 if hi else 2; m = 6 if hi else 3
    pts = []; rad = []; cols = []
    for i in range(seg + 1):
        s = i / seg
        pts.append((0.9 * s ** 1.7 + 0.12 * math.sin(s * 5.0), 0.25 * math.sin(s * 3.1), H * s))
        rad.append((0.44 - 0.2 * s) * (1.0 + (0.1 if (hi and i % 2 == 0) else 0.0)) * (1.25 if i == 0 else 1.0))
        k = 0.8 + 0.25 * (i % 2)
        cols.append((0.46 * k, 0.29 * k, 0.17 * k))
    tube(bm, pts, rad, m, (0.46, 0.29, 0.17), caps=False, colors=cols[:-1])
    top = Vector(pts[-1])
    nf = 9 if hi else 4; ns = 5 if hi else 2
    lay = bm.loops.layers.float_color['Col']
    for f in range(nf):
        az = 2 * math.pi * f / nf + (0.31 if f % 2 else 0.0)
        L = (5.6 if f % 2 == 0 else 4.7) * (1.0 if hi else 1.05); droop = 3.4 if f % 2 == 0 else 4.4; rise = 1.5 if f % 2 == 0 else 0.7
        dirv = Vector((math.cos(az), math.sin(az), 0)); side = Vector((-math.sin(az), math.cos(az), 0))
        rows = []
        for k in range(ns + 1):
            s = k / ns
            c = top + dirv * (L * s) + Vector((0, 0, rise * math.sin(math.pi * min(1.0, s * 1.25)) - droop * s * s))
            w = 0.95 * (math.sin(math.pi * (0.1 + 0.9 * s)) ** 0.7) * (1.0 if hi else 1.25) + 0.03
            fold = Vector((0, 0, -w * 0.45))
            rows.append((bm.verts.new(c - side * w + fold), bm.verts.new(c + Vector((0, 0, 0.06))), bm.verts.new(c + side * w + fold), s))
        for k in range(ns):
            a, b2 = rows[k], rows[k + 1]
            for (q0, q1, q2, q3) in ((a[0], a[1], b2[1], b2[0]), (a[1], a[2], b2[2], b2[1])):
                face = bm.faces.new((q0, q1, q2, q3)); s = (a[3] + b2[3]) / 2
                g = 0.42 + 0.34 * s; tint = 0.85 if f % 2 else 1.0
                col = (0.1 * tint + 0.16 * s, g * tint, 0.22 * tint * (1.0 - 0.5 * s), 0.0)
                for l in face.loops: l[lay] = col
    if hi:
        for k in range(3):
            an = k * 2.1; sphere(bm, 0.26, (top.x + 0.3 * math.cos(an), top.y + 0.3 * math.sin(an), top.z - 0.38), (0.38, 0.24, 0.1), u=6, v=4)
        sphere(bm, 0.5, (top.x, top.y, top.z - 0.05), (0.36, 0.3, 0.14), (1, 1, 0.7), 7, 4)
    return bm

# ----------------------------------------------------------------------------- aliens (shape only: the game colours each kind)
def al_leg():      # fits a 0.45 x 1.3 x 0.45 box centred on the origin; the hip pivot is at the top
    bm = new_bm()
    sphere(bm, 0.2, (0, 0, 0.5), WHITE, (1.05, 1.05, 1.1), 12, 8)
    cyl(bm, 0.175, 0.5, (0, -0.02, 0.28), WHITE, axis='Z', n=10, r2=0.2, rot=(0.1, 0, 0))
    sphere(bm, 0.16, (0, -0.06, 0.0), WHITE, (1, 1.1, 1), 10, 7)
    box(bm, (0.2, 0.08, 0.16), (0, -0.2, 0.01), WHITE, 0.03)                                        # knee plate
    cyl(bm, 0.105, 0.52, (0, 0.03, -0.27), WHITE, axis='Z', n=10, r2=0.145, rot=(-0.16, 0, 0))
    box(bm, (0.3, 0.46, 0.14), (0, -0.1, -0.58), WHITE, 0.045, taper=(1.25, 1.2))
    for sx in (-1, 0, 1): cyl(bm, 0.05, 0.2, (sx * 0.1, -0.36, -0.6), WHITE, n=6, r2=0.008, rot=(math.pi / 2 + 0.15, 0, sx * -0.25))
    cyl(bm, 0.045, 0.16, (0, 0.17, -0.5), WHITE, n=6, r2=0.008, rot=(-math.pi / 2 - 0.5, 0, 0))    # heel spur
    return bm

def al_arm():      # fits 0.3 x 1.3 x 0.3; the shoulder pivot is at the top
    bm = new_bm()
    sphere(bm, 0.2, (0, 0, 0.56), WHITE, (1.1, 1.1, 0.95), 12, 8)
    box(bm, (0.36, 0.34, 0.14), (0, 0, 0.66), WHITE, 0.05)                                           # pauldron
    cyl(bm, 0.105, 0.48, (0, 0, 0.3), WHITE, axis='Z', n=10, r2=0.13)
    sphere(bm, 0.12, (0, 0, 0.04), WHITE, (1, 1, 1), 10, 7)
    cyl(bm, 0.14, 0.5, (0, -0.03, -0.24), WHITE, axis='Z', n=10, r2=0.1, rot=(-0.12, 0, 0))
    box(bm, (0.2, 0.1, 0.34), (0, 0.11, -0.22), WHITE, 0.03, rot=(-0.12, 0, 0))                      # forearm blade
    sphere(bm, 0.12, (0, -0.06, -0.52), WHITE, (1, 1, 0.9), 10, 6)
    for k in (-1, 0, 1): cyl(bm, 0.042, 0.24, (k * 0.08, -0.1, -0.66), WHITE, n=6, r2=0.006, rot=(math.pi + 0.25, 0, k * 0.3))
    return bm

def al_torso():    # fits 1.3 x 1.3 x 0.8
    bm = new_bm()
    box(bm, (1.16, 0.72, 0.62), (0, 0, 0.3), WHITE, 0.17, seg=3)                                    # ribcage
    box(bm, (0.78, 0.58, 0.5), (0, 0, -0.22), WHITE, 0.14, seg=3)                                   # abdomen
    box(bm, (0.62, 0.5, 0.26), (0, 0, -0.56), WHITE, 0.09)                                          # pelvis
    for sx in (-1, 1):
        box(bm, (0.5, 0.2, 0.36), (sx * 0.3, -0.34, 0.36), WHITE, 0.08, rot=(0.12, 0, sx * -0.12))  # chest plates
        sphere(bm, 0.3, (sx * 0.62, 0, 0.52), WHITE, (1.05, 1.15, 0.72), 12, 7)                      # shoulder caps
        for k in range(3): box(bm, (0.34, 0.12, 0.1), (sx * 0.2, -0.3, -0.06 - k * 0.15), WHITE, 0.035, rot=(0, 0, sx * -0.2))   # abs
        cyl(bm, 0.07, 0.3, (sx * 0.36, 0.34, 0.44), WHITE, n=6, r2=0.01, rot=(-0.9, sx * 0.4, 0))   # back spikes
    for k in range(5): box(bm, (0.16, 0.14, 0.15), (0, 0.38, 0.5 - k * 0.24), WHITE, 0.045)         # spine
    cyl(bm, 0.3, 0.16, (0, 0.02, 0.64), WHITE, axis='Z', n=12, bevel=0.03)                          # collar
    return bm

def al_head():     # fits a 0.65-radius, 1.25x-tall ellipsoid; the face is at -Y, eyes sit at (+-0.25, -0.56, 0.05)
    bm = new_bm()
    sphere(bm, 0.56, (0, 0.1, 0.16), WHITE, (0.98, 1.08, 1.2), 18, 12)                              # cranium, swept back
    sphere(bm, 0.36, (0, 0.34, 0.5), WHITE, (0.9, 1.0, 0.95), 14, 9, rot=(0.5, 0, 0))               # rear lobe
    box(bm, (0.78, 0.26, 0.5), (0, -0.33, -0.05), WHITE, 0.1, seg=3)                                # face plate
    box(bm, (0.9, 0.22, 0.14), (0, -0.44, 0.22), WHITE, 0.055, rot=(0.25, 0, 0))                    # brow ridge
    for sx in (-1, 1):
        box(bm, (0.24, 0.2, 0.3), (sx * 0.4, -0.3, -0.12), WHITE, 0.07, rot=(0, 0, sx * 0.3))        # cheek bones
        cyl(bm, 0.07, 0.34, (sx * 0.2, -0.42, -0.6), WHITE, n=6, r2=0.012, rot=(math.pi - 0.3, sx * -0.25, 0))   # mandibles
        cyl(bm, 0.06, 0.42, (sx * 0.42, 0.2, 0.74), WHITE, n=6, r2=0.008, rot=(-0.5, sx * 0.45, 0))  # crown horns
    box(bm, (0.5, 0.3, 0.26), (0, -0.3, -0.4), WHITE, 0.085, taper=(1.0, 1.0))                      # jaw
    box(bm, (0.12, 0.1, 0.3), (0, -0.5, -0.06), WHITE, 0.035)                                       # nose ridge
    for k in range(4): box(bm, (0.14, 0.18, 0.12), (0, 0.05 + k * 0.16, 0.82 - k * 0.09), WHITE, 0.04, rot=(-0.5 - k * 0.25, 0, 0))   # crest
    cyl(bm, 0.24, 0.3, (0, 0.06, -0.62), WHITE, axis='Z', n=10)                                     # neck
    return bm

def al_saucer():   # flying drone hull, radius 1.4; the game adds the glass dome and the spinning ring
    bm = new_bm()
    prof = [(0.0, -0.5), (0.34, -0.5), (0.4, -0.4), (0.62, -0.34), (0.95, -0.2), (1.32, -0.06), (1.42, 0.0), (1.32, 0.07), (0.98, 0.17), (0.82, 0.22), (0.78, 0.3), (0.0, 0.3)]
    lathe(bm, prof, 20, (0, 0, 0), WHITE)
    for k in range(8):
        an = k * math.pi / 4
        box(bm, (0.34, 0.16, 0.07), (1.08 * math.cos(an), 1.08 * math.sin(an), 0.14), WHITE, 0.025, rot=(0, 0.2, an))
        sphere(bm, 0.09, (1.18 * math.cos(an + 0.39), 1.18 * math.sin(an + 0.39), -0.12), WHITE, u=8, v=5)
    torus(bm, 0.5, 0.06, (0, 0, -0.42), WHITE, axis='Z', nu=20, nv=6)
    return bm

# ----------------------------------------------------------------------------- street furniture
def lamp_post():   # 9 m retro street lamp: pole, curved arm, lantern (the glowing lens is exported apart so it can bloom)
    bm = new_bm(); glow = new_bm()
    cyl(bm, 0.28, 0.5, (0, 0, 0.25), STEEL, axis='Z', n=10, r2=0.2, bevel=0.03)
    cyl(bm, 0.11, 8.2, (0, 0, 4.4), DARK, axis='Z', n=8, r2=0.07)
    for z in (0.9, 5.0): torus(bm, 0.14, 0.04, (0, 0, z), STEEL, axis='Z', nu=10, nv=5)
    pts = [(0, 0, 8.3)] + [(1.5 * math.sin(a), 0, 8.3 + 0.9 * (1 - math.cos(a)) * 0.9) for a in [k * math.pi / 16 for k in range(1, 9)]]
    pts[-1] = (1.55, 0, pts[-1][2])
    tube(bm, pts, 0.055, 6, DARK)
    hx, hz = pts[-1][0], pts[-1][2]
    box(bm, (0.9, 0.42, 0.14), (hx + 0.2, 0, hz - 0.04), STEEL, 0.05)
    box(glow, (0.7, 0.32, 0.06), (hx + 0.2, 0, hz - 0.13), WHITE, 0.02)
    return bm, glow, (hx + 0.2, 0, hz - 0.2)

# ----------------------------------------------------------------------------- build everything
bpy.ops.wm.read_factory_settings(use_empty=True)
print('NEON INVASION assets:')
for i, fn in enumerate([g_pistol, g_smg, g_shotgun, g_rail, g_minigun, g_sniper, g_gatling, g_stars, g_flame, g_gas, g_knuckles, g_bomber]): gun(i, fn)
export('palm_hi', build_palm(True), smooth_deg=50)
export('palm_lo', build_palm(False), smooth_deg=60)
LOW = True
export('al_leg', al_leg(), smooth_deg=44); export('al_arm', al_arm(), smooth_deg=44); export('al_torso', al_torso(), smooth_deg=44); export('al_head', al_head(), smooth_deg=48); export('al_saucer', al_saucer(), smooth_deg=40)
lp, lg, lpos = lamp_post(); export('lamp_post', lp, shade=0.1, meta={'light': Tm(lpos)}); export('lamp_glow', lg)
LOW = False

# ----------------------------------------------------------------------------- the invaders (aliens.py: one hand-built design per enemy type)
ALIENS = {}; ALIEN_SHEET = []
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aliens.py'), encoding='utf-8').read(), 'aliens.py', 'exec'))

# ----------------------------------------------------------------------------- vehicles, shop stations, crates, rooftop kit (props.py)
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'props.py'), encoding='utf-8').read(), 'props.py', 'exec'))

js = 'window.NX_ASSETS=' + json.dumps({'geo': ASSETS, 'aliens': ALIENS, 'made': 'Blender %s - build_assets.py' % bpy.app.version_string}, separators=(',', ':')) + ';\n'
os.makedirs(os.path.dirname(os.path.abspath(OUT_JS)), exist_ok=True)
with open(OUT_JS, 'w', encoding='utf-8') as f: f.write(js)
print('wrote %s (%.0f KB, %d meshes, %d triangles, %d enemy designs)' % (OUT_JS, len(js) / 1024, len(ASSETS), sum(a['t'] for a in ASSETS.values()), len(ALIENS)))

# ----------------------------------------------------------------------------- lay the models out, save the .blend, render contact sheets
mat = bpy.data.materials.new('VertexColour'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes.get('Principled BSDF')
attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
if bsdf:
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    try:
        mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'MULTIPLY'; mix.inputs[1].default_value = 2.5
        nt.links.new(attr.outputs['Alpha'], mix.inputs[0]); nt.links.new(attr.outputs['Color'], bsdf.inputs['Emission Color']); nt.links.new(mix.outputs[0], bsdf.inputs['Emission Strength'])
    except Exception as e: print('emission link skipped:', e)
for ob in PREVIEW: ob.data.materials.append(mat)
alien_obs = set(o for grp in ALIEN_SHEET for o in grp['obs'])
groups = {}
for ob in PREVIEW:
    if ob in alien_obs: continue
    key = ob.name.rsplit('_', 1)[0] if ob.name.startswith(('gun', 'car', 'st_', 'mbox')) else ob.name
    groups.setdefault(key, []).append(ob)
col_n = 6; i = 0
for key, obs in groups.items():
    big = key.startswith(('palm', 'lamp', 'car', 'st_', 'mbox', 'roof'))
    sc = 1.0 if key.startswith('gun') else (0.09 if big else 0.42)
    x = (i % col_n) * 1.1; z = -(i // col_n) * 1.05
    for ob in obs:
        ob.scale = (sc, sc, sc); ob.location = (x, 0, z - (0.35 if big else 0.0)); ob.rotation_euler = (0, 0, math.radians(-62 if key.startswith('gun') else 28))
    i += 1
prop_rows = (i + col_n - 1) // col_n
# aliens: each one under an empty, parts at their pivots, on a separate grid 40 units to the right
AX0 = 40.0; acol = 6
for k, grp in enumerate(ALIEN_SHEET):
    em = bpy.data.objects.new('ALIEN_%02d_%s' % (grp['t'], grp['name'].replace(' ', '_')), None); bpy.context.scene.collection.objects.link(em)
    for ob in grp['obs']: ob.parent = em
    h = grp['h']; s = 1.5 / max(h, 0.5)
    em.scale = (s, s, s); em.location = (AX0 + (k % acol) * 2.0, 0, -(k // acol) * 2.1); em.rotation_euler = (0, 0, math.radians(32))
try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND)); print('saved', OUT_BLEND)
except Exception as e: print('could not save .blend:', e)
if OUT_PNG:
    try:
        sc = bpy.context.scene
        cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
        cam.data.type = 'ORTHO'
        sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')); sc.collection.objects.link(sun); sun.rotation_euler = (math.radians(50), math.radians(-25), 0); sun.data.energy = 3.5
        sc.world = bpy.data.worlds.new('W'); sc.world.use_nodes = True
        bg = sc.world.node_tree.nodes.get('Background')
        if bg: bg.inputs[0].default_value = (0.16, 0.1, 0.24, 1); bg.inputs[1].default_value = 1.3
        sc.render.image_settings.file_format = 'PNG'
        for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
            try: sc.render.engine = eng; break
            except Exception: pass
        def shot(path, cx, cz, w, h, rx, ry):
            cam.data.ortho_scale = max(w, h * rx / ry) ; cam.location = (cx, -30, cz + 30 * math.tan(math.radians(15.4))); cam.rotation_euler = (math.radians(74.6), 0, 0)
            sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.filepath = os.path.abspath(path); bpy.ops.render.render(write_still=True); print('rendered', path)
        base = OUT_PNG[:-4] if OUT_PNG.lower().endswith('.png') else OUT_PNG
        shot(base + '.png', (col_n - 1) * 1.1 / 2, -(prop_rows - 1) * 1.05 / 2 + 0.1, col_n * 1.1 + 0.3, prop_rows * 1.05 + 0.4, 1800, 1000)
        arows = (len(ALIEN_SHEET) + acol - 1) // acol
        for r0 in range(0, arows, 2):       # two rows of enemies per sheet so the details are readable
            shot('%s_aliens%d.png' % (base, r0 // 2 + 1), AX0 + (acol - 1) * 2.0 / 2, -(r0 + 0.5) * 2.1 + 0.75, acol * 2.0 + 0.2, 4.3, 1800, 640)
    except Exception as e: print('preview render failed:', e)