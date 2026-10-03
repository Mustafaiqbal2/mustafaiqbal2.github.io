# Firework field recording

`public/meeno/firework-burst.mp3` is the high-quality preview of **Sharp Explosion 1 (of 5)** by **Rudmer_Rotteveel**, recorded with a Tascam DR-05.

- Source: https://freesound.org/people/Rudmer_Rotteveel/sounds/336006/
- Download: https://cdn.freesound.org/previews/336/336006_4921277-hq.mp3
- License: CC0 1.0, confirmed on the source page on 2026-10-03.
- Playback uses lower gain, low-pass filtering, slight speed variation, and a quiet delayed tail. The file itself is unmodified.

Ocean, wind, insects, and the quiet launch hiss remain locally synthesized. The app attempts ambience on mount and retries after interaction if the browser blocks audible autoplay.

## Instrumental recording

`public/meeno/music-married-life.mp3`: **Married Life (From "Up")**, **Mellow Strings**, https://youtu.be/2LA8YECkcKg, supplied by the user.

This is the linked recording, not a synthesized arrangement or an original project composition. The CC0 license above applies only to the explosion recording. The previously used Harry James and Test Drive files have both been removed.

The local copy is stereo MP3 at 112 kbps / 24 kHz. The measured source level was -25.52 LUFS; a constant +5.52 dB adjustment brings it to approximately -20 LUFS while retaining dynamics. Short endpoint fades are applied; pitch and playback speed are unchanged.

One buffer and one looping source play throughout the walk, Yes, fireworks and replay. Yes changes only gain: .34 during the walk and .12 under fireworks, before the shared .65 master. Main explosions additionally duck the music to 30%; the smaller flowers use 65%, preserving any stronger duck already in progress. Replay restores the walking volume without seeking. Mute and hidden-tab suspension remain shared with ambience.

The instant download captures the existing master mix through a dedicated MediaStream destination. It does not play or decode a second soundtrack, use the microphone, or upload audio. Its destination is disconnected when the recording finishes or the walk is disposed. The original cinematic fallback retains its separate recording-only mix if automatic capture is unavailable.
