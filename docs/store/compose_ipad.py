# Builds 2064x2752 iPad (13 inch) App Store slides in the same style as compose_slides.py: headline over the warm
# gradient, the screenshot in a tablet frame. Raw shots come from the Expo web build at 1032x1376, 2x.
# Usage: python docs/store/compose_ipad.py <raw folder>
import pathlib, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).parent
FONTS = HERE.parent.parent / "app/node_modules/@expo-google-fonts"
SRC = pathlib.Path(sys.argv[1])
OUT = HERE / "slides_ipad"
OUT.mkdir(exist_ok=True)

W, H = 2064, 2752
INK, AMBER, BG = (35, 31, 26), (196, 128, 0), (255, 248, 236)
SLIDES = [
    ("1_bad", "Know what is really", "in the bowl"),
    ("2_flags", "Red flags,", "in plain words"),
    ("3_picks", "Better food,", "one tap away"),
    ("4_fit", "Fit for your", "exact pet"),
    ("5_home", "Feeding made", "simple"),
    ("7_catalog", "300 foods,", "scored the same way"),
]


def background():
    top, bottom = BG, (255, 232, 170)
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = (y / H) ** 1.3
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W * 0.05, H * 0.5, W * 0.95, H * 1.15], fill=120)
    return Image.composite(Image.new("RGB", (W, H), (255, 201, 60)), bg, glow.filter(ImageFilter.GaussianBlur(220)))


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def slide(shot_path, line1, line2):
    canvas = background().convert("RGBA")
    d = ImageDraw.Draw(canvas)
    f = ImageFont.truetype(str(FONTS / "bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf"), 150)
    for i, (text, color) in enumerate([(line1, INK), (line2, AMBER)]):
        d.text(((W - d.textlength(text, font=f)) / 2, 170 + i * 176), text, font=f, fill=color)

    shot = Image.open(shot_path).convert("RGB")
    sw = 1440
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    bezel = 36
    pw, ph = sw + bezel * 2, shot.height + bezel * 2
    x, y = (W - pw) // 2, 640
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x + 10, y + 50, x + pw - 10, y + ph + 50], 110, fill=(90, 60, 0, 90))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(60)))
    body = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle([0, 0, pw - 1, ph - 1], 110, fill=(28, 26, 24, 255))
    bd.rounded_rectangle([3, 3, pw - 4, ph - 4], 107, outline=(90, 84, 76, 255), width=3)
    canvas.alpha_composite(body, (x, y))
    canvas.alpha_composite(rounded(shot, 76), (x + bezel, y + bezel))
    return canvas.convert("RGB")


if __name__ == "__main__":
    for name, l1, l2 in SLIDES:
        slide(SRC / f"{name}.png", l1, l2).save(OUT / f"{name}.png", optimize=True)
        print("wrote", name)
