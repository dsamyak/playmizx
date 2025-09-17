// Audio Player Core
const audioPlayer = new Audio();
let currentSong = null;
let isPlaying = false;
let isShuffled = false;
let isRepeating = false;
let currentPlaylist = [];
let queue = [];
let allPlaylists = [];

// === DOM CACHE ===
const el = {
  grid:         document.getElementById('recent-tracks'),
  playBtn:      document.getElementById('play-btn'),
  prevBtn:      document.getElementById('prev-btn'),
  nextBtn:      document.getElementById('next-btn'),
  progressBar:  document.getElementById('progress-bar'),
  volumeBar:    document.getElementById('volume-bar'),
  title:        document.getElementById('current-song'),
  artist:       document.getElementById('current-artist'),
  cover:        document.getElementById('current-album-art'),
  waveform:     document.getElementById('waveform'),
  currentTime:  document.getElementById('current-time'),
  duration:     document.getElementById('duration')
};

/* ------------------  INIT  ------------------ */
document.addEventListener('DOMContentLoaded', () => {
  loadSongs();
  loadPlaylists();
  setupEventListeners();
  setupWaveform();
  setupContextMenu();
});

/* ------------------  FETCH + RENDER SONGS ------------------ */
async function loadSongs() {
  try {
    const res = await fetch('http://localhost:5000/api/songs');
    const { songs } = await res.json();
    currentPlaylist = songs;
    renderSongs(songs);
    if (songs.length && !currentSong) updatePlayerInfo(songs[0]);
  } catch (err) {
    console.error('❌ Failed to fetch songs:', err);
    el.grid.innerHTML = '<p style="color:red">Error loading songs</p>';
  }
}

function renderSongs(songs) {
  el.grid.innerHTML = '';
  songs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.id = song._id;
    card.innerHTML = `
      <div class="album-art">
        <img src="http://localhost:5000${song.cover}" alt="Cover" />
        <div class="play-overlay"><i class="fas fa-play"></i></div>
      </div>
      <div class="song-info-text">
        <h4>${song.title}</h4>
        <p>${song.artist}</p>
      </div>`;
    el.grid.appendChild(card);
  });
}

/* ------------------  FETCH + RENDER PLAYLISTS ------------------ */
async function loadPlaylists() {
  try {
    const res = await fetch('http://localhost:5000/api/playlists');
    allPlaylists = await res.json();
    console.log('Playlists loaded:', allPlaylists);
  } catch (err) {
    console.error('❌ Failed to load playlists:', err);
  }
}

/* ------------------  CONTEXT MENU ------------------ */
function setupContextMenu() {
  const contextMenu = document.createElement('div');
  contextMenu.id = 'song-context-menu';
  contextMenu.style.position = 'absolute';
  contextMenu.style.display = 'none';
  contextMenu.style.background = '#222';
  contextMenu.style.color = '#fff';
  contextMenu.style.borderRadius = '6px';
  contextMenu.style.padding = '10px';
  contextMenu.style.zIndex = 1000;
  contextMenu.innerHTML = `
    <div class="context-option" data-action="delete">🗑 Delete</div>
    <div class="context-option" data-action="share">🔗 Share</div>
    <div class="context-option" data-action="queue">➕ Add to Queue</div>
    <div class="context-option" data-action="addtoplaylist">📂 Add to Playlist</div>
  `;
  document.body.appendChild(contextMenu);

  let targetSongId = null;

  document.addEventListener('contextmenu', e => {
    const card = e.target.closest('.song-card');
    if (!card) return;
    e.preventDefault();
    targetSongId = card.dataset.id;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.display = 'block';
  });

  document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
  });

  contextMenu.addEventListener('click', async e => {
    const action = e.target.dataset.action;
    if (!action || !targetSongId) return;

    if (action === 'delete') {
      if (confirm('Delete this song?')) await deleteSong(targetSongId);
    } else if (action === 'queue') {
      const song = currentPlaylist.find(s => s._id === targetSongId);
      if (song) queue.push(song);
      alert('Added to queue');
    } else if (action === 'share') {
      const song = currentPlaylist.find(s => s._id === targetSongId);
      if (song) {
        const link = `http://localhost:5000${song.url}`;
        navigator.clipboard.writeText(link);
        alert('Song link copied to clipboard');
      }
    } else if (action === 'addtoplaylist') {
      const playlistName = prompt('Enter playlist name:');
      if (!playlistName) return;

      let playlist = allPlaylists.find(p => p.name === playlistName);
      if (!playlist) {
        const createRes = await fetch('http://localhost:5000/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playlistName })
        });
        playlist = await createRes.json();
        allPlaylists.push(playlist);
      }

      await fetch(`http://localhost:5000/api/playlists/${playlist._id}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: targetSongId })
      });

      alert('Added to playlist');
    }
  });
}

/* ------------------  DELETE SONG ------------------ */
async function deleteSong(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/songs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete song');
    await loadSongs();
  } catch (err) {
    alert('❌ Error deleting song');
    console.error(err);
  }
}

/* ------------------  UI LISTENERS  ------------------ */
function setupEventListeners() {
  el.playBtn.addEventListener('click', togglePlay);
  el.nextBtn.addEventListener('click', playNext);
  el.prevBtn.addEventListener('click', playPrev);
  el.progressBar.addEventListener('input', () => {
    audioPlayer.currentTime = el.progressBar.value;
  });
  el.volumeBar.addEventListener('input', () => {
    audioPlayer.volume = el.volumeBar.value;
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') playNext();
    if (e.code === 'ArrowLeft')  playPrev();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('.play-overlay')) {
      const id = e.target.closest('.song-card').dataset.id;
      playSongById(id);
    }
  });
}

/* ------------------  PLAYBACK LOGIC  ------------------ */
function playSongById(id) {
  const song = currentPlaylist.find(s => s._id === id);
  if (!song) return;
  currentSong = song;
  updatePlayerInfo(song);
  audioPlayer.src = `http://localhost:5000${song.url}`;
  audioPlayer.play().then(() => {
    isPlaying = true;
    el.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    updateWaveform();
  });
}

function togglePlay() {
  if (!currentSong) return;
  if (isPlaying) {
    audioPlayer.pause();
    el.playBtn.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    audioPlayer.play();
    el.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }
  isPlaying = !isPlaying;
}

function playNext() {
  if (!currentSong) return;
  const idx = currentPlaylist.findIndex(s => s._id === currentSong._id);
  const next = currentPlaylist[(idx + 1) % currentPlaylist.length];
  playSongById(next._id);
}

function playPrev() {
  if (!currentSong) return;
  const idx = currentPlaylist.findIndex(s => s._id === currentSong._id);
  const prev = currentPlaylist[(idx - 1 + currentPlaylist.length) % currentPlaylist.length];
  playSongById(prev._id);
}

/* ------------------  PLAYER UI  ------------------ */
function updatePlayerInfo(song) {
  el.title.textContent = song.title;
  el.artist.textContent = song.artist;
  el.cover.src = `http://localhost:5000${song.cover}`;
}

/* ------------------  WAVESURFER  ------------------ */
function setupWaveform() {
  if (!el.waveform) return;
  window.wavesurfer = WaveSurfer.create({
    container: el.waveform,
    waveColor: '#00c3ff',
    progressColor: '#fc00ff',
    height: 70,
    barWidth: 2,
    responsive: true
  });
}

function updateWaveform() {
  if (window.wavesurfer && currentSong) {
    window.wavesurfer.load(`http://localhost:5000${currentSong.url}`);
  }
}

// Audio Events
audioPlayer.addEventListener('play', () => {
  isPlaying = true;
  el.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
});

audioPlayer.addEventListener('pause', () => {
  isPlaying = false;
  el.playBtn.innerHTML = '<i class="fas fa-play"></i>';
});

audioPlayer.addEventListener('ended', () => {
  isPlaying = false;
  el.playBtn.innerHTML = '<i class="fas fa-play"></i>';
});

audioPlayer.addEventListener('timeupdate', () => {
  el.progressBar.max = audioPlayer.duration || 0;
  el.progressBar.value = audioPlayer.currentTime || 0;
  el.currentTime.textContent = formatTime(audioPlayer.currentTime);
  el.duration.textContent = formatTime(audioPlayer.duration);
});

function formatTime(time) {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
