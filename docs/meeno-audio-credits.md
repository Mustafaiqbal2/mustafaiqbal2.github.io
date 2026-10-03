# Firework field recording

`public/meeno/firework-burst.mp3` is the high-quality preview of **Sharp Explosion 1 (of 5)** by **Rudmer_Rotteveel**, recorded with a Tascam DR-05.

- Source: https://freesound.org/people/Rudmer_Rotteveel/sounds/336006/
- Download: https://cdn.freesound.org/previews/336/336006_4921277-hq.mp3
- License: CC0 1.0, confirmed on the source page on 2026-10-03.
- Playback uses lower gain, low-pass filtering, slight speed variation, and a quiet delayed tail. The file itself is unmodified.

Ocean, wind, insects, and the quiet launch hiss remain locally synthesized. The app attempts ambience on mount and retries after interaction if the browser blocks audible autoplay.

## Selected instrumental recordings

The user supplied these exact recordings for the private invitation on 2026-10-03:

- `public/meeno/music-married-life.mp3`: **Married Life (From "Up")**, **Mellow Strings**, https://youtu.be/2LA8YECkcKg. Plays through the walk, with the wind/insects reduced underneath it.
- `public/meeno/music-test-drive.mp3`: **John Powell - Test Drive (Slowed + Reverb)**, supplied upload by **Macrotus**, https://www.youtube.com/watch?v=nIEfTwW_1Mw. The local excerpt starts at 2:10 in that exact recording. On Yes, a 2.8-second overlap fades Married Life out while Test Drive fades in. Replay restores the walking track. The previously requested Harry James recording has been removed.

These are the linked recordings, not synthesized arrangements. Neither recording is represented as CC0 or as original project music; the CC0 license above applies only to the explosion recording.

Local copies use stereo MP3 at 112 kbps / 24 kHz. Measured source integrated levels were -25.52 LUFS (Mellow Strings) and -12.70 LUFS (Test Drive excerpt). Constant gains of +5.52 dB and -7.30 dB respectively bring both to approximately -20 LUFS while retaining musical dynamics. There are short endpoint fades; pitch and playback speed are unchanged.

Runtime music gain is .34 for the walk and .12 for the ending (about 9 dB quieter), before the shared .65 master. Main explosions duck the ending track to 30% of its already quiet level; the smaller flowers use 65%, retaining any stronger duck already in progress. Recovery takes place gradually after each burst. Mute, tab suspension, replay, pending downloads and disposal share the existing Web Audio lifecycle. Decoding at 24 kHz keeps the combined PCM allocation below 30 MB.
