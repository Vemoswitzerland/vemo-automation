#!/usr/bin/env python3
"""
Lokale Voice-Memo Transkription mit faster-whisper + PyAV
Kein API-Key noetig — laeuft vollstaendig lokal.

Usage:
  python3 transcribe.py <audio_file_path> [language]
  python3 transcribe.py /tmp/voice.oga de
  python3 transcribe.py /tmp/voice.wav

Output: JSON { "text": "...", "language": "...", "segments": [...] }
"""

import sys
import os
import json
import tempfile
import traceback


def convert_to_wav(input_path: str) -> str:
    """Convert any audio format to WAV using PyAV (no ffmpeg binary needed)."""
    import av

    output_path = input_path + "_converted.wav"
    try:
        with av.open(input_path) as in_container:
            # Get the first audio stream
            audio_stream = next(
                (s for s in in_container.streams if s.type == 'audio'), None
            )
            if audio_stream is None:
                raise ValueError("No audio stream found in file")

            # Re-encode to WAV / PCM s16le at 16kHz mono (ideal for Whisper)
            with av.open(output_path, 'w', format='wav') as out_container:
                out_stream = out_container.add_stream(
                    'pcm_s16le',
                    rate=16000,
                    layout='mono'
                )

                resampler = av.audio.resampler.AudioResampler(
                    format='s16',
                    layout='mono',
                    rate=16000
                )

                for frame in in_container.decode(audio_stream):
                    resampled = resampler.resample(frame)
                    for r in (resampled if isinstance(resampled, list) else [resampled]):
                        for packet in out_stream.encode(r):
                            out_container.mux(packet)

                # Flush
                for packet in out_stream.encode(None):
                    out_container.mux(packet)

        return output_path
    except Exception:
        # Cleanup on error
        if os.path.exists(output_path):
            os.remove(output_path)
        raise


def transcribe(audio_path: str, language: str = None) -> dict:
    """Transcribe audio file using faster-whisper (local, no API key)."""
    from faster_whisper import WhisperModel

    # Use small model for speed; switch to "medium" or "large-v3" for accuracy
    model_size = os.environ.get("WHISPER_MODEL", "small")

    # CPU inference (device="cpu", compute_type="int8" is fastest on Mac)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    # If file needs conversion (not wav/mp3/flac), convert first
    converted_path = None
    work_path = audio_path

    ext = os.path.splitext(audio_path)[1].lower()
    if ext in ('.oga', '.ogg', '.opus', '.m4a', '.aac', '.wma'):
        work_path = convert_to_wav(audio_path)
        converted_path = work_path

    try:
        kwargs = {}
        if language:
            kwargs['language'] = language

        segments, info = model.transcribe(work_path, beam_size=5, **kwargs)

        # Collect all segment texts
        all_segments = []
        full_text_parts = []
        for seg in segments:
            all_segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip()
            })
            full_text_parts.append(seg.text.strip())

        return {
            "text": " ".join(full_text_parts),
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "segments": all_segments
        }
    finally:
        if converted_path and os.path.exists(converted_path):
            os.remove(converted_path)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: transcribe.py <audio_file> [language]"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    try:
        result = transcribe(audio_path, language)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
