'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getJukeboxEngine, TRACKS, JukeboxTrack } from '@/lib/jukebox';

export function useJukebox(token: string | null) {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [paying, setPaying] = useState(false);
  // 已付费的曲目（本次会话内免费重播）
  const paidTracks = useRef<Set<string>>(new Set());

  const play = useCallback(async (trackId: string): Promise<{ ok: boolean; error?: string; coins?: number }> => {
    // 1. 先播放音乐（纯客户端，不依赖 API）
    const engine = getJukeboxEngine();
    const played = engine.play(trackId);
    if (!played) return { ok: false, error: '曲目不存在' };
    setCurrentTrackId(trackId);
    setIsPlaying(true);

    // 已付过费 → 免费重播
    if (paidTracks.current.has(trackId)) return { ok: true };

    // 2. 后台尝试扣金币（失败也不影响播放）
    if (token) {
      setPaying(true);
      try {
        const res = await fetch('/api/jukebox', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ trackId }),
        });
        const data = await res.json();
        if (res.ok) {
          paidTracks.current.add(trackId);
          return { ok: true, coins: data.coins };
        }
        // 金币不足 — 音乐照放，返回提示
        paidTracks.current.add(trackId);
        return { ok: true, coinError: data.error, coins: data.coins } as any;
      } catch {
        // API 失败 — 音乐照放
        paidTracks.current.add(trackId);
      } finally {
        setPaying(false);
      }
    }

    paidTracks.current.add(trackId);
    return { ok: true };
  }, [token]);

  const stop = useCallback(() => {
    getJukeboxEngine().stop();
    setCurrentTrackId(null);
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v: number) => {
    getJukeboxEngine().setVolume(v);
    setVolumeState(v);
  }, []);

  // 组件卸载时停止
  useEffect(() => {
    return () => { getJukeboxEngine().stop(); };
  }, []);

  const currentTrack: JukeboxTrack | null = currentTrackId
    ? TRACKS.find(t => t.id === currentTrackId) || null
    : null;

  return { currentTrack, isPlaying, volume, paying, play, stop, setVolume, tracks: TRACKS };
}
