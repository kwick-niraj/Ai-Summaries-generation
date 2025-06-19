# Convert single file

node convertToM4a.js audio.mp3
node convertToM4a.js audio.wav --quality high

# Batch convert directory

node convertToM4a.js ./audio_files --batch
node convertToM4a.js ./books --batch --recursive

# Convert with chapter embedding

node convertToM4a.js book_complete.wav --embed-chapters

# Merge audio files with chapter alignment

node mergeBookAudio.js 123
node mergeBookAudio.js 123 --format mp3 --m4a
node mergeBookAudio.js book-id --gap 2.0 --m4a --quality high
