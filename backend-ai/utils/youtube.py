import html
import re
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=|\/videos\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Cannot extract video ID from: {url}")


def get_transcript_chunks(video_id: str, chunk_size: int = 10) -> list[dict]:
    """Fetch transcript and return timestamped text chunks."""
    try:
        entries = YouTubeTranscriptApi().fetch(video_id).to_raw_data()
    except TranscriptsDisabled:
        raise ValueError("This video has transcripts disabled.")
    except NoTranscriptFound:
        raise ValueError("No transcript found for this video.")

    if not entries:
        raise ValueError("Transcript is empty for this video.")

    print(f"[youtube] fetched {len(entries)} transcript entries for {video_id}")

    chunks = []
    for i in range(0, len(entries), chunk_size):
        group = entries[i : i + chunk_size]
        text = html.unescape(" ".join(e["text"] for e in group)).strip()
        if not text:
            continue
        start = group[0]["start"]
        minutes, seconds = divmod(int(start), 60)
        chunks.append({
            "text": text,
            "timestamp": f"{minutes:02d}:{seconds:02d}",
            "start_seconds": start,
        })

    print(f"[youtube] produced {len(chunks)} chunks for {video_id}")
    return chunks
