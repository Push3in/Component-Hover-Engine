"""One continuous virtual camera over the two recordings, 1920x1080 @ 120fps.

Instead of cuts, the camera glides (eased zoom + pan) between framings. Each
output frame samples the nearest captured frame and resamples the camera's
window from it with Lanczos, at sub-pixel precision, so slow moves don't jitter.
"""
import json, subprocess, sys, os
from multiprocessing import Pool
from PIL import Image, ImageOps
import numpy as np

FF, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1920, 1080, 120
BG = (246, 246, 246)
PAD = 600  # source padding (device px) so the camera may look past the page edges

def smooth(k):  # gentle ease-in-out, for slow drifts
    k = min(1, max(0, k))
    return k * k * k * (k * (6 * k - 15) + 10)

def out(k):  # ease-out (quint): leaves at full speed, lands softly, so moves carry momentum
    k = min(1, max(0, k))
    return 1 - (1 - k) ** 5

# Camera keyframes per take: (source time s, centre x, centre y, width, easing) in CSS px.
# The easing shapes the move that ARRIVES at that keyframe; equal neighbours hold still.
# Moves start as the cursor sets off, so the camera leads into each action.
TAKES = [
    dict(frames='frames', meta='frames.json', dpr=1.5, start=0.15, end=25.4, keys=[
        (0.15, 800, 515, 1400, out), (4.3, 800, 515, 1290, smooth),     # intro: slow push in on the pile → fan
        (4.4, 800, 515, 1290, out), (5.5, 640, 535, 1180, out),        # follow the cursor onto the Player
        (7.7, 640, 535, 1180, out), (8.7, 790, 525, 1180, out),        # … across to Status
        (10.6, 790, 525, 1180, out), (11.6, 930, 530, 1180, out),      # … and Audience
        (13.4, 930, 530, 1180, out), (14.4, 800, 520, 1440, out),      # pull back wide for the swipe
        (17.25, 800, 520, 1440, out), (18.25, 520, 545, 960, out),     # in to the Player: pause / resume
        (20.8, 520, 545, 960, out), (21.8, 910, 520, 960, out),        # over to Status + Audience
        (24.0, 910, 520, 930, smooth), (24.9, 800, 515, 1290, out),    # back out wide
        (25.4, 800, 515, 1290, out),
    ]),
    dict(frames='frames2', meta='frames2.json', dpr=1.25, start=4.3, end=15.6, keys=[
        (4.3, 1300, 515, 2100, out), (4.5, 1300, 515, 2100, out),      # wide, matching the end of take 1
        (5.5, 1890, 430, 1480, out),                                    # follow the cursor up to the DialKit button
        (6.0, 1890, 430, 1480, out), (7.0, 1640, 470, 1940, out),      # settle on panel + fan once it opens
        (15.6, 1660, 470, 1840, smooth),                                # slow drift in while tuning
    ]),
]
XFADE = 0.1  # seconds the two takes overlap (both wide, cards at rest)

def cam(keys, t):
    if t <= keys[0][0]: return keys[0][1:4]
    for k0, k1 in zip(keys, keys[1:]):
        t0, t1 = k0[0], k1[0]
        if t <= t1:
            e = k1[4]((t - t0) / (t1 - t0)) if t1 > t0 else 1
            return [k0[i] + (k1[i] - k0[i]) * e for i in (1, 2, 3)]
    return keys[-1][1:4]

def load(take):
    meta = json.load(open(take['meta']))['frames']
    times = np.array([f['t'] for f in meta])
    return [f['name'] for f in meta], times

def render(job):
    take, t = job
    names, times = TAKE_DATA[take['meta']]
    i = int(np.clip(np.searchsorted(times, t), 0, len(times) - 1))
    if i > 0 and abs(times[i - 1] - t) < abs(times[i] - t): i -= 1
    im = Image.open(os.path.join(take['frames'], names[i])).convert('RGB')
    im = ImageOps.expand(im, border=PAD, fill=BG)
    cx, cy, w = cam(take['keys'], t)
    h = w * H / W
    d = take['dpr']
    box = ((cx - w / 2) * d + PAD, (cy - h / 2) * d + PAD, (cx + w / 2) * d + PAD, (cy + h / 2) * d + PAD)
    return np.asarray(im.resize((W, H), Image.LANCZOS, box=box), dtype=np.uint8)

TAKE_DATA = {}
def init():
    for take in TAKES: TAKE_DATA[take['meta']] = load(take)

def jobs():
    a, b = TAKES
    na = round((a['end'] - a['start']) * FPS)
    nb = round((b['end'] - b['start']) * FPS)
    nx = round(XFADE * FPS)
    for k in range(na - nx): yield ('a', [(a, a['start'] + k / FPS)])
    for k in range(nx):       # crossfade: last XFADE of take 1 over first XFADE of take 2
        yield ('x', [(a, a['start'] + (na - nx + k) / FPS), (b, b['start'] + k / FPS), (k + 0.5) / nx])
    for k in range(nx, nb): yield ('b', [(b, b['start'] + k / FPS)])

def work(job):
    kind, args = job
    if kind == 'x':
        fa, fb = render(args[0]), render(args[1])
        m = args[2]
        return (fa * (1 - m) + fb * m).astype(np.uint8).tobytes()
    return render(args[0]).tobytes()

if __name__ == '__main__':
    init()
    all_jobs = list(jobs())
    print('frames', len(all_jobs), 'length', round(len(all_jobs) / FPS, 2), 's', flush=True)
    enc = subprocess.Popen([FF, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
        '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-profile:v', 'high', '-level', '5.2',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    with Pool(os.cpu_count(), initializer=init) as pool:
        for n, buf in enumerate(pool.imap(work, all_jobs, chunksize=8)):
            enc.stdin.write(buf)
            if n % 600 == 0: print('frame', n, flush=True)
    enc.stdin.close(); enc.wait()
    print('done')
