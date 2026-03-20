// ========== 点唱机曲目 ==========

export interface JukeboxTrack {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: string;
  glowColor: string;
  mood: string;
  price: number;
  artist: string;
  src: string; // 本地 MP3 路径
}

export const TRACKS: JukeboxTrack[] = [
  {
    id: 'quantum-static',
    name: '量子白噪声',
    nameEn: 'Quantum Static',
    emoji: '📡',
    color: '#06b6d4',
    glowColor: '#22d3ee',
    mood: '黑胶唱片里的宇宙背景辐射',
    price: 10,
    artist: 'Duke Ellington — The Mooche',
    src: '/music/quantum-static.mp3',
  },
  {
    id: 'neon-pulse',
    name: '霓虹脉冲',
    nameEn: 'Neon Pulse',
    emoji: '💜',
    color: '#a855f7',
    glowColor: '#c084fc',
    mood: '深夜爵士酒吧的 walking bass',
    price: 15,
    artist: 'Louis Armstrong — After You\'ve Gone',
    src: '/music/neon-pulse.mp3',
  },
  {
    id: 'deep-space',
    name: '深空漂流',
    nameEn: 'Deep Space Drift',
    emoji: '🌌',
    color: '#3b82f6',
    glowColor: '#60a5fa',
    mood: '太空舱里的蓝调独白',
    price: 10,
    artist: 'Billie Holiday — The Man I Love',
    src: '/music/deep-space.mp3',
  },
  {
    id: 'cyber-rain',
    name: '赛博雨夜',
    nameEn: 'Cyber Rain',
    emoji: '🌧️',
    color: '#64748b',
    glowColor: '#94a3b8',
    mood: '烟雾爵士俱乐部 · 雨夜',
    price: 10,
    artist: 'Harlem Kiddies — Stompin\' at the Savoy',
    src: '/music/cyber-rain.mp3',
  },
  {
    id: 'wavefunction',
    name: '波函数坍缩',
    nameEn: 'Wavefunction Collapse',
    emoji: '⚛️',
    color: '#ec4899',
    glowColor: '#f472b6',
    mood: '自由爵士的量子即兴',
    price: 20,
    artist: 'King Oliver\'s Jazz Band — London Cafe Blues',
    src: '/music/wavefunction.mp3',
  },
  {
    id: 'neural-dream',
    name: '神经网络梦境',
    nameEn: 'Neural Dream',
    emoji: '🧠',
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    mood: '电子神经的蓝调之梦',
    price: 15,
    artist: 'Duke Ellington — Creole Love Call',
    src: '/music/neural-dream.mp3',
  },
];

// ========== Audio 播放引擎 ==========

class JukeboxEngine {
  private audio: HTMLAudioElement | null = null;
  private _volume = 0.5;
  private _currentTrackId: string | null = null;

  play(trackId: string): boolean {
    const track = TRACKS.find(t => t.id === trackId);
    if (!track) return false;

    this.stop();

    this.audio = new Audio(track.src);
    this.audio.volume = this._volume;
    this.audio.loop = true;
    this.audio.play().catch(() => {});
    this._currentTrackId = trackId;
    return true;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this._currentTrackId = null;
  }

  get currentTrackId() { return this._currentTrackId; }
  get isPlaying() { return !!this._currentTrackId; }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this._volume;
  }

  getVolume() { return this._volume; }
}

let engine: JukeboxEngine | null = null;
export function getJukeboxEngine(): JukeboxEngine {
  if (!engine) engine = new JukeboxEngine();
  return engine;
}
