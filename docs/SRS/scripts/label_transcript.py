"""Add a hyperref anchor to every speaker turn in the interview transcript.

Each turn ``\\item[P1 (28:37)]`` gets ``\\phantomsection\\label{int:P1-28:37}``
so the SRS can link to it with ``\\intref{P1}{28:37}``. Running the script
again changes nothing.

Usage: python docs/SRS/scripts/label_transcript.py docs/SRS/InterviewTranscript.text
"""
import re
import sys

TURN = re.compile(r"\\item\[([A-Za-z0-9]+) \((\d{1,2}:\d{2})\)\](?!\\phantomsection)")


def main(path):
    with open(path, newline="") as f:
        text = f.read()
    labels = [f"{s}-{t}" for s, t in TURN.findall(text)]
    if len(labels) != len(set(labels)):
        sys.exit("duplicate speaker turns: labels would clash")
    text, count = TURN.subn(
        lambda m: f"{m.group(0)}\\phantomsection\\label{{int:{m.group(1)}-{m.group(2)}}}",
        text,
    )
    with open(path, "w", newline="") as f:
        f.write(text)
    print(f"labelled {count} turns")


if __name__ == "__main__":
    main(sys.argv[1])
