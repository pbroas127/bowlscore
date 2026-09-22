# Builds 1290x2796 App Store slides the Wick way: two line headline over a warm gradient, screenshot in a phone frame.
# Raw shots come from the Expo web build (430x878 at 3x); a 9:41 status bar is drawn on top so they read as a phone.
# Usage: python docs/store/compose_slides.py <raw folder>
import pathlib, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).parent
FONTS = HERE.parent.parent / "app/node_modules/@expo-google-fonts"
SRC = pathlib.Path(sys.argv[1])
OUT = HERE / "slides"
OUT.mkdir(exist_ok=True)

W, H = 1290, 2796
INK, AMBER, BG = (35, 31, 26), (196, 128, 0), (255, 248, 236)
SLIDES = [
    ("1_bad", "Know what is really", "in the bowl"),
    ("2_flags", "Red flags,", "in plain words"),
    ("3_picks", "Better food,", "one tap away"),
    ("4_fit", "Fit for your", "exact pet"),
    ("5_home", "Feeding made", "simple"),
    ("6b_variants", "The right formula", "and bag size"),
    ("7_catalog", "300 foods,", "scored the same way"),
]


def font(path, size):
    return ImageFont.truetype(str(FONTS / path), size)


def background():
    top, bottom = BG, (255, 232, 170)
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = (y / H) ** 1.3
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W * 0.05, H * 0.5, W * 0.95, H * 1.15], fill=120)
    return Image.composite(Image.new("RGB", (W, H), (255, 201, 60)), bg, glow.filter(ImageFilter.GaussianBlur(170)))


def with_status_bar(shot):
    bar = 162
    screen = Image.new("RGB", (shot.width, shot.height + bar), shot.getpixel((20, 20)))
    screen.paste(shot, (0, bar))
    d = ImageDraw.Draw(screen)
    d.text((150, 60), "9:41", font=font("dm-sans/600SemiBold/DMSans_600SemiBold.ttf", 52), fill=INK)
    x = shot.width - 300
    for i, h in enumerate([14, 22, 30, 38]):  # signal
        d.rounded_rectangle([x + i * 18, 106 - h, x + i * 18 + 11, 106], 3, fill=INK)
    cx, cy = x + 125, 108  # wifi
    for r in (40, 27, 14):
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 225, 315, fill=INK)
        d.pieslice([cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7], 225, 315, fill=screen.getpixel((5, 5)))
    d.pieslice([cx - 8, cy - 8, cx + 8, cy + 8], 225, 315, fill=INK)
    d.rounded_rectangle([x + 175, 66, x + 245, 104], 11, outline=INK, width=4)  # battery
    d.rounded_rectangle([x + 182, 73, x + 238, 97], 6, fill=INK)
    d.rounded_rectangle([x + 249, 78, x + 255, 92], 2, fill=INK)
    return screen


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def slide(shot_path, line1, line2):
    canvas = background().convert("RGBA")
    d = ImageDraw.Draw(canvas)
    f = font("bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf", 112)
    for i, (text, color) in enumerate([(line1, INK), (line2, AMBER)]):
        d.text(((W - d.textlength(text, font=f)) / 2, 150 + i * 132), text, font=f, fill=color)

    shot = with_status_bar(Image.open(shot_path).convert("RGB"))
    sw = 1000
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    bezel = 26
    pw, ph = sw + bezel * 2, shot.height + bezel * 2
    x, y = (W - pw) // 2, 500
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x + 10, y + 40, x + pw - 10, y + ph + 40], 150, fill=(90, 60, 0, 90))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(50)))
    body = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle([0, 0, pw - 1, ph - 1], 150, fill=(28, 26, 24, 255))
    bd.rounded_rectangle([3, 3, pw - 4, ph - 4], 147, outline=(90, 84, 76, 255), width=3)
    canvas.alpha_composite(body, (x, y))
    canvas.alpha_composite(rounded(shot, 124), (x + bezel, y + bezel))
    return canvas.convert("RGB")


if __name__ == "__main__":
    for name, l1, l2 in SLIDES:
        slide(SRC / f"{name}.png", l1, l2).save(OUT / f"{name}.png", optimize=True)
        print("wrote", name)
    # The subscription review screenshot: the plain paywall with a status bar, no marketing frame.
    with_status_bar(Image.open(SRC / "9_paywall.png").convert("RGB")).save(OUT / "paywall_review.png")
