import { useState, useEffect, useRef } from 'react';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export default function AudioPlayer({ src, dark = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset state when src changes
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(false);
    setError(false);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => { setLoading(false); setPlaying(true); setError(false); };
    const onPause = () => setPlaying(false);
    const onError = () => { setError(true); setLoading(false); setPlaying(false); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    setError(false);
    setLoading(true);
    // Safari exige que .play() se llame sincrónicamente dentro del handler del gesto
    // de usuario (sin await previo) para desbloquear la reproducción.
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        setError(true);
        setLoading(false);
        setPlaying(false);
      });
    }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`audio-player${dark ? ' audio-player-dark' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
      <button
        className={`audio-play-btn ${playing ? 'pause' : 'play'}`}
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : error ? 'Reintentar' : 'Reproducir'}
      >
        {loading ? <span className="audio-spinner" /> : playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="audio-controls">
        <div
          className="audio-progress-track"
          onClick={seek}
          role="slider"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
          <div className="audio-progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <div className="audio-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
