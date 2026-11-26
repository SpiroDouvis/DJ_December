"""Compose original, sparse ambient piano pieces as MIDI for the background music.

Render (from this folder, with an output dir OUT):
  python3 compose.py OUT
  for n in snowfall hearth lanterns; do
    fluidsynth -ni -q -g 0.6 -R 1 -C 0 -o synth.reverb.room-size=0.8 -o synth.reverb.width=1.0 \
      -o synth.reverb.level=0.7 -o synth.reverb.damp=0.4 -F OUT/$n.wav -r 44100 \
      /usr/share/sounds/sf2/FluidR3_GM.sf2 OUT/$n.mid
    ffmpeg -i OUT/$n.wav -af "silenceremove=start_periods=1:start_threshold=-70dB,volume=13dB,alimiter=limit=0.6" \
      -ac 2 -b:a 96k ../../public/music/$n.mp3
  done
"""
import random
import sys
import mido

TPB = 480  # ticks per beat

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def pc(name):
    return NOTE[name]


QUALITY = {
    "maj7": [0, 4, 7, 11], "add9": [0, 4, 7, 14], "6": [0, 4, 7, 9], "m7": [0, 3, 7, 10],
    "m9": [0, 3, 7, 10, 14], "sus2": [0, 2, 7], "maj9": [0, 4, 7, 11, 14], "": [0, 4, 7], "m": [0, 3, 7],
}


def chord(sym):
    root = sym[:2] if len(sym) > 1 and sym[1] in "#b" else sym[:1]
    q = sym[len(root):]
    return pc(root), QUALITY[q]


class Track:
    def __init__(self):
        self.events = []  # (tick, type, note, vel)

    def note(self, beat, dur, pitch, vel):
        t = int(beat * TPB + random.randint(-12, 12))
        t = max(0, t)
        self.events.append((t, "on", pitch, max(1, min(127, vel))))
        self.events.append((t + int(dur * TPB), "off", pitch, 0))

    def pedal(self, beat, down):
        self.events.append((max(0, int(beat * TPB) + (8 if down else -4)), "cc", 64, 127 if down else 0))


def compose(seed, key_scale, progression, bpm, bars_per_chord, sections, out):
    random.seed(seed)
    scale_pcs = [pc(n) for n in key_scale]
    rh, lh = Track(), Track()
    beat = 0.0
    melody_cache = {}

    def scale_notes(lo, hi):
        return [n for n in range(lo, hi + 1) if n % 12 in scale_pcs]

    mel_pool = scale_notes(62, 84)

    def make_phrase(chords_slice, density):
        """A phrase: list of (offset_beats, dur, pitch, vel) across the chords."""
        phrase = []
        prev = random.choice([n for n in mel_pool if 67 <= n <= 76])
        for ci, sym in enumerate(chords_slice):
            r, q = chord(sym)
            tones = {(r + i) % 12 for i in q}
            start = ci * 4 * bars_per_chord
            t = random.choice([0.5, 1.0, 1.5])
            end = start + 4 * bars_per_chord - 1.0
            while t + start < end + start - start and start + t < end:
                if random.random() > density:
                    t += random.choice([1.0, 1.5, 2.0])
                    continue
                cands = [n for n in mel_pool if abs(n - prev) <= 5]
                weights = [3.0 if n % 12 in tones else 1.0 for n in cands]
                p = random.choices(cands, weights)[0]
                dur = random.choice([1.0, 1.5, 2.0, 2.0, 3.0])
                phrase.append((start + t, dur, p, random.randint(44, 62)))
                prev = p
                t += dur + random.choice([0, 0, 0.5, 1.0])
        return phrase

    def vary(phrase):
        out = []
        for off, dur, p, v in phrase:
            if random.random() < 0.25:
                cands = [n for n in mel_pool if 0 < abs(n - p) <= 3]
                if cands:
                    p = random.choice(cands)
            if random.random() < 0.1:
                continue
            out.append((off, dur, p, v + random.randint(-5, 5)))
        return out

    span = 4 * bars_per_chord
    for sec in sections:
        kind = sec[0]
        reps = sec[1] if len(sec) > 1 else 1
        for _ in range(reps):
            prog = progression
            if kind in ("A", "A2", "B"):
                base = kind[0]
                if base not in melody_cache:
                    melody_cache[base] = make_phrase(progression if base == "A" else progression[::-1][:len(progression)],
                                                    0.75 if base == "A" else 0.6)
                phrase = melody_cache[base] if kind != "A2" else vary(melody_cache["A"])
                if base == "B":
                    prog = progression[::-1]
                if kind == "A2":
                    phrase = [(o, d, p + 12 if p < 72 and random.random() < 0.3 else p, v) for o, d, p, v in phrase]
                for off, dur, p, v in phrase:
                    rh.note(beat + off, dur, p, v)
            for ci, sym in enumerate(prog):
                r, q = chord(sym)
                cb = beat + ci * span
                lh.pedal(cb, False)
                lh.pedal(cb, True)
                bass = 36 + r if r >= 4 else 48 + r
                soft = kind in ("intro", "outro")
                vbase = 38 if soft else 44
                for bar in range(bars_per_chord):
                    b0 = cb + bar * 4
                    lh.note(b0, 3.8, bass, vbase + random.randint(-3, 4))
                    upper = sorted(60 + ((r + i) % 12) - (12 if (r + i) % 12 > 7 else 0) for i in q[1:])
                    pattern = [(0.5 if random.random() < 0.5 else 1.0, upper[0])]
                    pattern.append((pattern[0][0] + 1.0, upper[1 % len(upper)]))
                    pattern.append((pattern[1][0] + 1.0, upper[-1]))
                    if random.random() < 0.4:
                        pattern.append((3.5, upper[0] + 12 if upper[0] + 12 < 72 else upper[0]))
                    for o, p in pattern:
                        lh.note(b0 + o, 4 - o, p, vbase - 8 + random.randint(-4, 4))
                    if kind == "outro" and bar == bars_per_chord - 1 and ci == len(prog) - 1:
                        pass
            beat += span * len(prog)
    # final chord
    r, q = chord(progression[0])
    lh.pedal(beat, False)
    lh.pedal(beat, True)
    lh.note(beat, 8, (36 + r if r >= 4 else 48 + r), 40)
    for i, iv in enumerate(q):
        lh.note(beat + 0.15 * i, 8, 60 + ((r + iv) % 12), 34)
    rh.note(beat + 1.0, 7, 72 + ((r + q[1]) % 12), 40)
    lh.pedal(beat + 10, False)

    mid = mido.MidiFile(ticks_per_beat=TPB)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm)))
    mid.tracks.append(meta)
    for trk, ch in ((rh, 0), (lh, 0)):
        mt = mido.MidiTrack()
        mt.append(mido.Message("program_change", program=0, channel=ch, time=0))
        last = 0
        for t, typ, a, b in sorted(trk.events, key=lambda e: (e[0], 0 if e[1] in ("off", "cc") else 1)):
            dt = t - last
            last = t
            if typ == "on":
                mt.append(mido.Message("note_on", note=a, velocity=b, channel=ch, time=dt))
            elif typ == "off":
                mt.append(mido.Message("note_off", note=a, velocity=0, channel=ch, time=dt))
            else:
                mt.append(mido.Message("control_change", control=a, value=b, channel=ch, time=dt))
        mid.tracks.append(mt)
    mid.save(out)


PIECES = {
    "snowfall": dict(seed=11, key_scale=["D", "E", "F#", "A", "B", "G", "C#"],
                     progression=["Dmaj7", "Bm7", "Gmaj9", "Aadd9"], bpm=64, bars_per_chord=2,
                     sections=[("intro",), ("A",), ("A2",), ("B",), ("A",), ("outro",)]),
    "hearth": dict(seed=27, key_scale=["F", "G", "A", "C", "D", "Bb", "E"],
                   progression=["Fmaj7", "Am7", "Bbmaj7", "C6"], bpm=60, bars_per_chord=2,
                   sections=[("intro",), ("A",), ("B",), ("A2",), ("A",), ("outro",)]),
    "lanterns": dict(seed=5, key_scale=["C", "D", "E", "G", "A", "F", "B"],
                     progression=["Am9", "Fmaj7", "Cmaj7", "Gadd9"], bpm=58, bars_per_chord=2,
                     sections=[("intro",), ("A",), ("A2",), ("B",), ("A",), ("outro",)]),
}

if __name__ == "__main__":
    outdir = sys.argv[1]
    for name, cfg in PIECES.items():
        compose(out=f"{outdir}/{name}.mid", **cfg)
        print(name)
