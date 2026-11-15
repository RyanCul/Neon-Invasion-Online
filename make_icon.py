import math
from PIL import Image, ImageDraw, ImageFilter

def create_neon_icon(size=512):
    # Create master image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # 1. Dark squircle base with neon rim
    # Background circular plate
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    
    pad = 20
    bbox = [pad, pad, size - pad, size - pad]
    
    # Radial dark gradient plate
    center_x, center_y = size / 2, size / 2
    max_r = (size - 2 * pad) / 2
    
    for r in range(int(max_r), 0, -2):
        k = r / max_r
        # Dark purple-black center to deep midnight violet at edge
        red = int(22 * (1 - k) + 10 * k)
        green = int(6 * (1 - k) + 2 * k)
        blue = int(48 * (1 - k) + 24 * k)
        bg_draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=(red, green, blue, 255))
    
    # 2. Retro Synthwave Sun in upper-middle
    sun_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sun_draw = ImageDraw.Draw(sun_layer)
    sun_cx, sun_cy = size / 2, size * 0.44
    sun_r = size * 0.28
    
    # Sun gradient
    for r in range(int(sun_r), 0, -1):
        k = r / sun_r
        # Yellow hot core to bright magenta edge
        sr = int(255)
        sg = int(240 * (1 - k*0.9))
        sb = int(80 * (1 - k) + 160 * k)
        sun_draw.ellipse([sun_cx - r, sun_cy - r, sun_cx + r, sun_cy + r], fill=(sr, sg, sb, 255))
        
    # Cut horizontal scanlines through lower half of sun
    sun_mask = Image.new("L", (size, size), 255)
    mask_draw = ImageDraw.Draw(sun_mask)
    num_bars = 7
    bar_start_y = sun_cy
    for i in range(num_bars):
        by = bar_start_y + i * (sun_r / num_bars) * 0.95
        bw = 3 + i * 3.5
        mask_draw.rectangle([0, by, size, by + bw], fill=0)
    
    sun_layer.putalpha(Image.composite(sun_layer.split()[-1], Image.new("L", (size, size), 0), sun_mask))
    
    # 3. Retro Wireframe Grid at bottom
    grid_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    grid_horizon = size * 0.62
    
    # Perspective lines converging at center horizon
    for i in range(-7, 8):
        x_bottom = center_x + i * 44
        grid_draw.line([(center_x, grid_horizon), (x_bottom, size - pad - 10)], fill=(37, 244, 255, 180), width=3)
        
    # Horizontal grid lines with perspective spacing
    for i in range(1, 7):
        p = (i / 7) ** 1.8
        gy = grid_horizon + p * (size - pad - 10 - grid_horizon)
        alpha = int(90 + 150 * p)
        grid_draw.line([(pad + 15, gy), (size - pad - 15, gy)], fill=(255, 47, 160, alpha), width=2)
        
    # Clip grid to circle
    circle_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(circle_mask).ellipse(bbox, fill=255)
    grid_layer.putalpha(Image.composite(grid_layer.split()[-1], Image.new("L", (size, size), 0), circle_mask))

    # 4. Alien Invader Emblem in Center (Foreground)
    alien_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    alien_draw = ImageDraw.Draw(alien_layer)
    
    # Stylized Synthwave Alien Head
    # Coordinates centered at (center_x, size * 0.52)
    acx = center_x
    acy = size * 0.52
    
    # Outer neon glow shadow
    head_pts = [
        (acx, acy - 105),             # Top apex / crown
        (acx + 42, acy - 95),
        (acx + 85, acy - 65),         # Upper temple
        (acx + 105, acy - 15),        # Wide cheekbone
        (acx + 75, acy + 45),         # Lower jaw
        (acx + 35, acy + 95),         # Chin corner
        (acx, acy + 110),             # Chin tip
        (acx - 35, acy + 95),
        (acx - 75, acy + 45),
        (acx - 105, acy - 15),
        (acx - 85, acy - 65),
        (acx - 42, acy - 95),
    ]
    
    # Draw solid sleek dark alien silhouette
    alien_draw.polygon(head_pts, fill=(16, 8, 32, 245))
    
    # Neon rim on alien head (hot pink outline)
    alien_draw.line(head_pts + [head_pts[0]], fill=(255, 47, 160, 255), width=7)
    
    # Inner accent lines (cyan forehead crest)
    crest_pts = [
        (acx, acy - 88),
        (acx + 28, acy - 75),
        (acx + 48, acy - 45),
        (acx, acy - 30),
        (acx - 48, acy - 45),
        (acx - 28, acy - 75),
    ]
    alien_draw.line(crest_pts + [crest_pts[0]], fill=(37, 244, 255, 230), width=4)
    alien_draw.line([(acx, acy - 88), (acx, acy - 30)], fill=(255, 255, 255, 240), width=3)
    
    # Large slanted almond alien eyes (Glowing Cyan with White Core)
    def draw_eye(side):
        # side: -1 for left, +1 for right
        eye_center_x = acx + side * 44
        eye_center_y = acy + 12
        
        eye_pts = [
            (eye_center_x - side * 34, eye_center_y - 28),   # top inner
            (eye_center_x + side * 30, eye_center_y - 8),    # top outer
            (eye_center_x + side * 38, eye_center_y + 18),   # outer corner
            (eye_center_x + side * 15, eye_center_y + 35),   # bottom outer
            (eye_center_x - side * 22, eye_center_y + 15),   # bottom inner
        ]
        # Outer cyan glow
        alien_draw.polygon(eye_pts, fill=(37, 244, 255, 255))
        # Inner brilliant white core
        core_pts = [
            (eye_center_x - side * 20, eye_center_y - 15),
            (eye_center_x + side * 20, eye_center_y - 4),
            (eye_center_x + side * 25, eye_center_y + 12),
            (eye_center_x + side * 10, eye_center_y + 22),
            (eye_center_x - side * 12, eye_center_y + 10),
        ]
        alien_draw.polygon(core_pts, fill=(255, 255, 255, 255))
        
    draw_eye(-1)
    draw_eye(1)
    
    # Breathing slit / chin vents
    for s in (-1, 1):
        alien_draw.line([(acx + s * 14, acy + 68), (acx + s * 24, acy + 74)], fill=(37, 244, 255, 220), width=3)
        alien_draw.line([(acx + s * 10, acy + 80), (acx + s * 18, acy + 85)], fill=(255, 47, 160, 220), width=3)

    # 5. Glowing Neon Outer Ring
    ring_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring_layer)
    
    # Gradient ring: Cyan on left, Hot Pink on right
    rw = 12
    ring_bbox = [pad + 6, pad + 6, size - pad - 6, size - pad - 6]
    ring_draw.arc(ring_bbox, start=90, end=270, fill=(37, 244, 255, 255), width=rw)
    ring_draw.arc(ring_bbox, start=270, end=90, fill=(255, 47, 160, 255), width=rw)
    # Bright blend highlights at top and bottom
    ring_draw.arc([pad + 6, pad + 6, size - pad - 6, size - pad - 6], start=80, end=100, fill=(255, 240, 255, 255), width=rw)
    ring_draw.arc([pad + 6, pad + 6, size - pad - 6, size - pad - 6], start=260, end=280, fill=(255, 240, 255, 255), width=rw)

    # 6. Composite with bloom/glow
    # Create glow for alien and ring
    glow_src = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_src = Image.alpha_composite(glow_src, ring_layer)
    glow_src = Image.alpha_composite(glow_src, alien_layer)
    
    glow_blur = glow_src.filter(ImageFilter.GaussianBlur(radius=16))
    glow_blur2 = glow_src.filter(ImageFilter.GaussianBlur(radius=6))
    
    # Combine layers
    final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final = Image.alpha_composite(final, bg)
    final = Image.alpha_composite(final, sun_layer)
    final = Image.alpha_composite(final, grid_layer)
    final = Image.alpha_composite(final, glow_blur)
    final = Image.alpha_composite(final, glow_blur2)
    final = Image.alpha_composite(final, alien_layer)
    final = Image.alpha_composite(final, ring_layer)
    
    return final

if __name__ == '__main__':
    master = create_neon_icon(512)
    master.save('icon.png', 'PNG')
    
    # Generate multi-size .ico (256, 128, 64, 48, 32, 16)
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    master.save('icon.ico', format='ICO', sizes=sizes)
    print('Generated icon.png and icon.ico successfully!')
