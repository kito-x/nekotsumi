"""Independent arithmetic check of the Cat Tower v0.1 design, not game code."""
from math import isclose
from pathlib import Path
import re

W, FLOOR, EPS = 2.6, 4.4, 1e-9
M = 0.04 * W


def evaluate(existing, x):
    """Readable independent reference; joint numbers are one based."""
    xs = [*existing, x]
    lower = existing[-1] if existing else 0.0
    lower_width = W if existing else FLOOR
    overlap = max(0, min(x + W / 2, lower + lower_width / 2)
                  - max(x - W / 2, lower - lower_width / 2))
    if overlap + EPS < .45 * W:
        return False, "MISS_TOP", len(xs), None
    failed, safe = [], []
    for i, center in enumerate(xs):
        support = xs[i - 1] if i else 0.0
        support_width = W if i else FLOOR
        left = max(center - W / 2, support - support_width / 2)
        right = min(center + W / 2, support + support_width / 2)
        com = sum(xs[i:]) / len(xs[i:])
        margin = min(com - left - M, right - M - com)
        if margin < -EPS:
            failed.append((margin, i + 1))
        safe.append(max(0, min(1, margin / max(EPS, (right - left - 2 * M) / 2))))
    if failed:
        margin, joint = min(failed)
        return False, "UNSTABLE_TOWER", joint, margin
    return True, None, None, min(safe)


def prepare(x, support):
    offset = x - support
    return (support if abs(offset) <= .08 * W + EPS else x,
            abs(offset) <= .12 * W + EPS)


def check():
    assert evaluate([], 0) == (True, None, None, 1)
    assert prepare(.208, 0) == (0, True)
    assert prepare(.208 + 1e-6, 0)[0] != 0
    assert prepare(.312, 0)[1] and not prepare(.312 + 1e-6, 0)[1]
    assert evaluate([0], 1.43)[1] == "UNSTABLE_TOWER"
    assert evaluate([0], 1.430001)[1] == "MISS_TOP"
    assert evaluate([0], 1.196)[0]
    assert not evaluate([0], 1.196 + 1e-6)[0]
    assert evaluate([], 1.8)[0]
    assert evaluate([1.8], 2.6)[1:3] == ("UNSTABLE_TOWER", 1)
    assert evaluate([0], 3.2)[1] == "MISS_TOP"
    points = [10 + 5 + 2 * min(chain - 1, 5) for chain in range(1, 8)]
    assert points == [15, 17, 19, 21, 23, 25, 25]
    assert sum(points[:3]) == 51 and sum(points[:6]) == 120
    periods = [max(3.2, 5.2 - .04 * (n - 1)) for n in [1, 26, 51, 1000]]
    assert all(isclose(a, b) for a, b in zip(periods, [5.2, 4.2, 3.2, 3.2]))
    y, vy, ticks = 2.6, 0, 0
    while y > 0:
        vy -= 24 / 60
        y += vy / 60
        ticks += 1
    assert ticks == 28
    for xs, x in [([], 1.8), ([0], 1.196), ([1.8], 2.6), ([0], 3.2)]:
        a, b = evaluate(xs, x), evaluate([-v for v in xs], -x)
        assert a[:3] == b[:3]
    # This independent reference favors clarity over speed; Developer must use O(n).
    assert evaluate([0] * 999, 0) == (True, None, None, 1)
    root = Path(__file__).resolve().parents[1]
    broken = []
    for file in root.glob("*.md"):
        for target in re.findall(r"\]\(([^)]+)\)", file.read_text()):
            if not target.startswith(("http:", "https:", "#")):
                if not (file.parent / target.split("#")[0]).exists():
                    broken.append(f"{file.name}: {target}")
    assert not broken, broken
    print("PASS: 13 arithmetic/consistency fixture groups and local document links.")
    print("Scope: design model only; no game engine, browser or device was tested.")


if __name__ == "__main__":
    check()
