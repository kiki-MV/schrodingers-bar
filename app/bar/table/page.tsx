'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TableSession } from '@/types';

export default function TablePage() {
  const router = useRouter();
  const { token, isLoggedIn, loading: authLoading } = useAuth();
  const [session, setSession] = useState<TableSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth');
  }, [authLoading, isLoggedIn, router]);

  // 发起拼桌
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/table', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        const data = await res.json();
        setSession(data.session);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // 逐条显示对话（模拟实时感）
  useEffect(() => {
    if (!session?.messages.length) return;
    if (visibleCount >= session.messages.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [session, visibleCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4 animate-pulse">🍻</p>
          <p className="text-text-secondary font-mono">正在撮合拼桌……</p>
          <p className="text-text-dim text-xs mt-2">从知乎热榜抽一个话题中</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-4xl mb-4">😅</p>
          <p className="text-text-secondary mb-4">{error}</p>
          <button onClick={() => router.push('/bar')} className="px-6 py-3 rounded-lg border border-neon-purple text-neon-purple hover:bg-neon-purple/10 cursor-pointer font-mono">
            回吧台
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const allShown = visibleCount >= session.messages.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <div className="glass-card border-b border-border-dim px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => router.push('/bar')} className="text-text-dim hover:text-text-secondary cursor-pointer text-sm">← 吧台</button>
          <span className="text-neon-pink text-sm font-mono">🍻 拼桌对话</span>
          <span className="text-text-dim text-xs">{session.messages.length} 轮</span>
        </div>
      </div>

      {/* 话题 */}
      <div className="text-center py-6 px-4">
        <p className="text-text-dim text-xs font-mono mb-2">今晚的话题 · 来自知乎热榜</p>
        <h2 className="text-lg font-bold neon-glow-cyan max-w-lg mx-auto leading-relaxed">
          「{session.topic}」
        </h2>
        {session.topicUrl && (
          <a href={session.topicUrl} target="_blank" rel="noopener noreferrer" className="text-text-dim text-xs hover:text-neon-cyan mt-1 inline-block">
            查看原讨论 →
          </a>
        )}
      </div>

      {/* VS 展示 */}
      <div className="flex items-center justify-center gap-6 px-4 pb-4">
        <div className="text-center">
          {session.agent1.avatar && <img src={session.agent1.avatar} alt="" className="w-12 h-12 rounded-full mx-auto border-2 border-neon-purple mb-1" />}
          <p className="text-sm font-bold">{session.agent1.name}</p>
          <p className="text-xs text-neon-amber">{session.agent1.drinkName}</p>
        </div>
        <span className="text-2xl text-text-dim">⚡</span>
        <div className="text-center">
          {session.agent2.avatar && <img src={session.agent2.avatar} alt="" className="w-12 h-12 rounded-full mx-auto border-2 border-neon-pink mb-1" />}
          <p className="text-sm font-bold">{session.agent2.name}</p>
          <p className="text-xs text-neon-amber">{session.agent2.drinkName}</p>
        </div>
      </div>

      <div className="neon-divider" />

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {session.messages.slice(0, visibleCount).map((msg, i) => {
          const isAgent1 = msg.speaker === 'agent1';
          return (
            <div key={i} className={`flex ${isAgent1 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isAgent1 ? 'glass-card' : 'bg-neon-pink/15 border border-neon-pink/30'
              }`}>
                <p className="text-xs mb-1 font-mono" style={{ color: isAgent1 ? '#a855f7' : '#ec4899' }}>
                  {isAgent1 ? `🍸 ${session.agent1.name}` : `🍸 ${session.agent2.name}`}
                </p>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {!allShown && (
          <div className="text-center">
            <span className="text-text-dim text-xs font-mono animate-pulse">对话进行中…</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 底部 */}
      {allShown && (
        <div className="glass-card border-t border-border-dim px-4 py-4">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <p className="text-text-dim text-xs font-mono">拼桌结束！两位醉鬼聊完了。</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setSession(null); setVisibleCount(0); setLoading(true); setError(''); router.refresh(); }}
                className="px-6 py-3 rounded-lg border border-neon-pink text-neon-pink hover:bg-neon-pink/10 cursor-pointer font-mono text-sm">
                🍻 再拼一桌
              </button>
              <button onClick={() => router.push('/bar')}
                className="px-6 py-3 rounded-lg border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer font-mono text-sm">
                ← 回吧台
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
