#!/usr/bin/env python3
"""
Extract transcript, paraphrasedVerses, and quote from a ProAssist transcript JSON.
Output format:
  transcript: <text>
  paraphrasedVerses: <refs/verse text>
  quote: <keyPoints with category quote>
"""

import json
import sys
from pathlib import Path


def main():
    default_path = Path.home() / "Downloads" / "transcript-2026-02-01T05-06-25.json"
    json_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path

    if not json_path.exists():
        print(f"File not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    out_lines = []

    for seg in segments:
        transcript = seg.get("text", "").strip()
        if not transcript:
            continue

        # paraphrasedVerses: from references (displayRef + verseText)
        refs = seg.get("references") or []
        paraphrased = []
        for r in refs:
            disp = r.get("displayRef", "")
            verse = r.get("verseText", "")
            if disp and verse:
                paraphrased.append(f"{disp}: {verse}")
            elif verse:
                paraphrased.append(verse)
            elif disp:
                paraphrased.append(disp)
        paraphrased_str = " | ".join(paraphrased) if paraphrased else ""

        # quote: keyPoints where category == "quote"
        key_points = seg.get("keyPoints") or []
        quotes = [kp.get("text", "").strip() for kp in key_points if kp.get("category") == "quote"]
        quote_str = " | ".join(q for q in quotes if q) if quotes else ""

        out_lines.append("transcript: " + transcript)
        out_lines.append("paraphrasedVerses: " + paraphrased_str)
        out_lines.append("quote: " + quote_str)
        out_lines.append("")  # blank line between segments

    output_text = "\n".join(out_lines)
    out_path = Path(__file__).parent / "transcript_extract_output.txt"
    out_path.write_text(output_text, encoding="utf-8")
    print(f"Wrote {len(segments)} segments to {out_path}")


if __name__ == "__main__":
    main()
