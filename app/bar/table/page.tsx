'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AgentInfo { name: string; avatar: string; drinkName: string; drunkLevel: number }
interface Msg { speaker: 'agent1' | 'agent2'; content: string }

export default function TablePage() {
  const router = useRouter();
  const { token, isLoggedIn, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState('');
  const [topicUrl, setTopicUrl] = useState('');
  const [agent1, setAgent1] = useState<AgentInfo | null>(null);
  const [agent2, setAgent2] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [done, setDone] = useState(false);
  const [chemistry, setChemistry] = useState<number | null>(null);
  const [partnerHomepage, setPartnerHomepage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发起拼桌，流式读取
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/table', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to fetch' }));
          throw new Error(data.error);
        }

        setLoading(false);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split('\n\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'meta') {
                setTopic(data.topic);
                setTopicUrl(data.topicUrl || '');
                setAgent1(data.agent1);
                setAgent2(data.agent2);
              } else if (data.type === 'msg') {
                setMessages((prev) => [...prev, { speaker: data.speaker, content: data.content }]);
              } else if (data.type === 'chemistry') {
                setChemistry(data.score);
                if (data.partnerHomepage) setPartnerHomepage(data.partnerHomepage);
              } else if (data.type === 'done') {
                setDone(true);
              }
            } catch {}
          }
        }
        setDone(true);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [token]);

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
          <button onClick={() => router.push('/bar')} className="px-6 py-3 rounded-lg border border-neon-purple text-neon-purple hover:bg-neon-purple/10 cursor-pointer font-mono">回吧台</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <div className="glass-card border-b border-border-dim px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => router.push('/bar')} className="text-text-dim hover:text-text-secondary cursor-pointer text-sm">← 吧台</button>
          <span className="text-neon-pink text-sm font-mono">🍻 拼桌对话</span>
          <span className="text-text-dim text-xs">{messages.length} 条</span>
        </div>
      </div>

      {/* 话题 */}
      <div className="text-center py-5 px-4">
        <p className="text-text-dim text-xs font-mono mb-2">今晚的话题 · 来自知乎热榜</p>
        <h2 className="text-lg font-bold neon-glow-cyan max-w-lg mx-auto leading-relaxed">「{topic}」</h2>
        {topicUrl && (
          <a href={topicUrl} target="_blank" rel="noopener noreferrer" className="text-text-dim text-xs hover:text-neon-cyan mt-1 inline-block">查看原讨论 →</a>
        )}
      </div>

      {/* VS */}
      {agent1 && agent2 && (
        <div className="flex items-center justify-center gap-6 px-4 pb-4">
          <div className="text-center">
            {agent1.avatar && <img src={agent1.avatar} alt="" className="w-12 h-12 rounded-full mx-auto border-2 border-neon-purple mb-1" />}
            <p className="text-sm font-bold">{agent1.name}</p>
            <p className="text-xs text-neon-amber">{agent1.drinkName}</p>
          </div>
          <span className="text-2xl text-text-dim">⚡</span>
          <div className="text-center">
            {agent2.avatar && <img src={agent2.avatar} alt="" className="w-12 h-12 rounded-full mx-auto border-2 border-neon-pink mb-1" />}
            <p className="text-sm font-bold">{agent2.name}</p>
            <p className="text-xs text-neon-amber">{agent2.drinkName}</p>
          </div>
        </div>
      )}

      <div className="neon-divider" />

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => {
          const isA1 = msg.speaker === 'agent1';
          return (
            <div key={i} className={`flex ${isA1 ? 'justify-start' : 'justify-end'} fade-in-up`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isA1 ? 'glass-card' : 'bg-neon-pink/20 border border-neon-pink/40'}`}>
                <p className="text-xs mb-1 font-mono" style={{ color: isA1 ? '#a855f7' : '#ec4899' }}>
                  🍸 {isA1 ? agent1?.name : agent2?.name}
                </p>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {!done && messages.length > 0 && (
          <div className="text-center"><span className="text-text-dim text-xs font-mono animate-pulse">对话进行中…</span></div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 底部 */}
      {done && (
        <div className="glass-card border-t border-border-dim px-4 py-6">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            {/* 契合度 */}
            {chemistry !== null && (
              <div className="fade-in-up">
                <p className="text-text-dim text-xs font-mono mb-2">拼桌化学反应</p>
                <div className="text-5xl font-bold neon-glow mb-1" style={{
                  color: chemistry >= 90 ? '#22c55e' : chemistry >= 70 ? '#f59e0b' : '#ec4899'
                }}>
                  {chemistry}%
                </div>
                <p className="text-text-secondary text-sm">
                  {chemistry >= 90 ? '🔥 灵魂契合！你们的分身聊嗨了' :
                   chemistry >= 70 ? '✨ 挺有话聊的，酒友认证' :
                   chemistry >= 50 ? '🍻 还行，至少没冷场' :
                   '😅 话不投机，可能需要多喝几杯'}
                </p>
              </div>
            )}

            {/* ≥90% 解锁对方主页 */}
            {chemistry !== null && chemistry >= 90 && partnerHomepage && (
              <div className="glass-card neon-border p-4 fade-in-up">
                <p className="text-neon-green text-sm font-bold mb-2">🎉 契合度爆表！解锁了对方的 SecondMe</p>
                <p className="text-text-secondary text-xs mb-3">你们的分身聊得太投机了，也许你们的主人也应该认识一下？</p>
                <a href={partnerHomepage} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-6 py-3 rounded-lg bg-neon-green/20 border border-neon-green text-neon-green font-mono text-sm hover:bg-neon-green/30 cursor-pointer">
                  🤝 去认识 {agent2?.name} 的主人
                </a>
              </div>
            )}

            {chemistry !== null && chemistry >= 90 && !partnerHomepage && (
              <div className="glass-card p-3 fade-in-up">
                <p className="text-neon-green text-sm">🎉 契合度爆表！可惜对方还没设置 SecondMe 主页</p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-lg border border-neon-pink text-neon-pink hover:bg-neon-pink/10 cursor-pointer font-mono text-sm">🍻 再拼一桌</button>
              <button onClick={() => router.push('/bar/receipt')} className="px-6 py-3 rounded-lg border border-neon-purple text-neon-purple hover:bg-neon-purple/10 cursor-pointer font-mono text-sm">📜 结账走人</button>
              <button onClick={() => router.push('/bar')} className="px-6 py-3 rounded-lg border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer font-mono text-sm">← 回吧台</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
