# Builds the Play Store graphics from the app's assets and screenshots: python store/make_graphics.py
# (Fonts come from mobile/node_modules: run `npm install` in mobile first.)
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent / 'mobile'
FONTS = APP / 'node_modules' / '@expo-google-fonts'
BG, TEXT, MUTED, ACCENT = (11, 16, 32), (238, 241, 248), (122, 132, 163), (61, 220, 151)
GAME_COLORS = ['#7AA2FF', '#FF7A6B', '#F5B83D', '#C792FF', '#3DDC97', '#5FD4F4', '#FF9EC7', '#B4E05A']

TAGLINES = {
    'fr': ('Le monde en jeux', 'Drapeaux, capitales, frontières, quiz · défis du jour et multijoueur'),
    'en': ('The world, in games', 'Flags, capitals, borders, quizzes · daily challenges and multiplayer'),
}


def font(family, weight, size):
    return ImageFont.truetype(str(FONTS / family / weight / f'{family_name(family)}_{weight}.ttf'), size)


def family_name(family):
    return {'bricolage-grotesque': 'BricolageGrotesque', 'inter': 'Inter'}[family]


def rounded(im, radius):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *im.size), radius, fill=255)
    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


def phone(shot, height):
    """The screenshot in a simple dark phone frame."""
    im = Image.open(shot).convert('RGB')
    w = round(im.width * height / im.height)
    screen = rounded(im.resize((w, height), Image.LANCZOS), 34)
    pad = 9
    frame = Image.new('RGBA', (w + 2 * pad, height + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((0, 0, *frame.size), 42, fill=(35, 44, 72), outline=(52, 64, 106), width=2)
    frame.alpha_composite(screen, (pad, pad))
    return frame


def feature_graphic(lang):
    W, H = 1024, 500
    im = Image.new('RGBA', (W, H), BG + (255,))
    # Soft colored glows behind the phones.
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((560, -60, 980, 360), fill=(61, 220, 151, 70))
    g.ellipse((700, 200, 1120, 620), fill=(122, 162, 255, 80))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))

    shots = ROOT / 'screenshots' / lang / 'raw'
    back = phone(shots / '4_border_guess.png', 400).rotate(8, resample=Image.BICUBIC, expand=True)
    front = phone(shots / '2_placement.png', 440).rotate(-6, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(back, (800, 70))
    im.alpha_composite(front, (600, 40))

    d = ImageDraw.Draw(im)
    logo = Image.open(APP / 'assets' / 'images' / 'logo.png').convert('RGBA').resize((92, 92), Image.LANCZOS)
    im.alpha_composite(logo, (56, 110))
    d.text((164, 112), 'GeoGame', font=font('bricolage-grotesque', '700Bold', 76), fill=TEXT)
    title, subtitle = TAGLINES[lang]
    d.text((58, 238), title, font=font('bricolage-grotesque', '600SemiBold', 44), fill=ACCENT)
    body = font('inter', '500Medium', 22)
    # Wrap the subtitle on the " · " so each part stays whole.
    for i, line in enumerate(subtitle.split(' · ')):
        d.text((58, 306 + i * 34), line[0].upper() + line[1:], font=body, fill=MUTED)
    for i, color in enumerate(GAME_COLORS):
        x = 60 + i * 30
        d.ellipse((x, 400, x + 16, 416), fill=color)
    return im.convert('RGB')


def main():
    out = ROOT / 'graphics'
    out.mkdir(exist_ok=True)
    Image.open(APP / 'assets' / 'images' / 'icon.png').convert('RGBA').resize((512, 512), Image.LANCZOS).save(out / 'icon-512.png')
    for lang in TAGLINES:
        feature_graphic(lang).save(out / f'feature-graphic-{lang}.png')
    print('done:', *sorted(p.name for p in out.iterdir()))


if __name__ == '__main__':
    main()
