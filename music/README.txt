Place audio files (mp3, ogg, etc.) in this directory and describe them in playlist.json using the format:
{
  "tracks": [
    {
      "title": "Song title",
      "artist": "Performer",
      "src": "music/filename.mp3"
    }
  ]
}
Tracks will play in the listed order. Keep src values as relative paths.
