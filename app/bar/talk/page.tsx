'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  role: 'user' | 'agent' | 'narration';
  content: string;
  depth?: number; // 0=此刻 1=近期 2=记忆深处 3=午夜梦回
  drinkId?: string;
}

const MAX_AUTO_MONOLOGUES = 4; // 每杯酒的自动独白轮数
const POKE_BONUS = 2; // 戳一下额外获得的轮数

export default function TalkPage() {
  const router = useRouter();
  const { token, isLoggedIn, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [monologuing, setMonologuing] = useState(false);
  const [drunkLevel, setDrunkLevel] = useState(0);
  const [energy, setEnergy] = useState(MAX_AUTO_MONOLOGUES); // 剩余独白能量
  const [passedOut, setPassedOut] = useState(false); // Agent 是否睡着了
  const chatEndRef = useRef<HTMLDivElement>(null);
  const monologueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monologueCount = useRef(0);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** 通用 SSE 流式读取 → 逐字更新最后一条消息 */
  const readSSE = useCallback(async (
    res: Response,
    meta: { depth?: number; drinkId?: string },
  ) => {
    const depth = meta.depth ?? 0;
    const drinkId = meta.drinkId || '';

    // 先插入空消息占位
    setMessages((prev) => [...prev, { role: 'agent', content: '', depth, drinkId }]);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // 逐行解析 SSE
      const lines = buf.split('\n');
      buf = lines.pop() || ''; // 最后一行可能不完整

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const c = JSON.parse(json).choices?.[0]?.delta?.content;
          if (c) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'agent') {
                updated[updated.length - 1] = { ...last, content: last.content + c };
              }
              return updated;
            });
          }
        } catch {}
      }
    }
  }, []);

  const fetchMonologue = useCallback(async () => {
    if (!token || monologuing || sending) return;
    setMonologuing(true);
    try {
      const res = await fetch('/api/monologue', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || !res.body) return;

      const depth = parseInt(res.headers.get('X-Depth') || '0');
      const drinkId = res.headers.get('X-Drink-Id') || '';
      const drunk = parseInt(res.headers.get('X-Drunk-Level') || '0');

      // 深度旁白
      if (depth === 2 && monologueCount.current < 3) {
        setMessages((prev) => [...prev, { role: 'narration', content: '🌊 酒劲上来了，TA 的眼神开始变得恍惚……' }]);
      } else if (depth === 3) {
        setMessages((prev) => [...prev, { role: 'narration', content: '🌙 已经很晚了，TA 的声音越来越轻……' }]);
      }

      await readSSE(res, { depth, drinkId });

      if (drunk > 0) setDrunkLevel(drunk);
      monologueCount.current += 1;
    } catch {
      // silent
    } finally {
      setMonologuing(false);
    }
  }, [token, monologuing, sending, readSSE]);

  // 安排下一轮独白
  const scheduleNext = useCallback(() => {
    if (monologueTimer.current) clearTimeout(monologueTimer.current);

    setEnergy((prev) => {
      const remaining = prev - 1;
      if (remaining <= 0) {
        // 能量耗尽 → 睡着
        setTimeout(() => {
          setPassedOut(true);
          setMessages((prev) => [
            ...prev,
            { role: 'narration', content: '💤 Agent 趴在吧台上睡着了…… 戳戳 TA 或者再灌一杯？' },
          ]);
        }, 2000);
        return 0;
      }

      // 间隔随轮数递增（越喝越慢）
      const delay = 6000 + monologueCount.current * 2000 + Math.random() * 4000;
      monologueTimer.current = setTimeout(async () => {
        await fetchMonologue();
        scheduleNext();
      }, delay);

      return remaining;
    });
  }, [fetchMonologue]);

  // 进入页面 → 开始独白循环
  useEffect(() => {
    if (!token) return;

    setMessages([{ role: 'narration', content: '你的 Agent 端着酒杯坐在吧台，看起来已经有点醉了……' }]);

    const firstTimer = setTimeout(async () => {
      await fetchMonologue();
      scheduleNext();
    }, 2000);

    return () => {
      clearTimeout(firstTimer);
      if (monologueTimer.current) clearTimeout(monologueTimer.current);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // 人类搭话
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    if (monologueTimer.current) clearTimeout(monologueTimer.current);

    // 如果 Agent 睡着了，搭话可以把它戳醒
    if (passedOut) {
      setPassedOut(false);
      setEnergy(POKE_BONUS);
      setMessages((prev) => [...prev, { role: 'narration', content: '💫 Agent 被你戳醒了，迷迷糊糊地抬起头……' }]);
    }

    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        setMessages((prev) => [...prev, { role: 'narration', content: `⚠️ ${err.error}` }]);
      } else {
        await readSSE(res, {});
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'narration', content: `⚠️ ${e.message}` }]);
    } finally {
      setSending(false);
      // 搭话后恢复独白（如果还有能量）
      if (!passedOut && energy > 0) {
        monologueTimer.current = setTimeout(async () => {
          await fetchMonologue();
          scheduleNext();
        }, 8000);
      }
    }
  };

  // 酒效 → 专属视觉 class
  const getDrinkFxClass = (drinkId?: string) => {
    switch (drinkId) {
      case 'vanishing-gradient-special': return 'fx-vanishing-gradient';
      case 'entropy-bourbon': return 'fx-entropy';
      case 'null-pointer-vodka': return 'fx-null-pointer';
      case 'infinite-loop-margarita': return 'fx-loop';
      case 'overfitting-rye': return 'fx-overfitting';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <div className="glass-card border-b border-border-dim px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/bar')} className="text-text-dim hover:text-text-secondary transition-colors cursor-pointer">← 吧台</button>
          <div className="w-px h-6 bg-border-dim" />
          <span className="text-xs text-neon-amber font-mono">醉度 {drunkLevel}%</span>
          {monologuing && <span className="text-xs text-neon-pink animate-pulse">🍸 自言自语中...</span>}
          {passedOut && <span className="text-xs text-text-dim">💤 睡着了</span>}
          {!passedOut && energy > 0 && <span className="text-xs text-text-dim font-mono">⚡{energy}</span>}
        </div>
        <button onClick={() => router.push('/bar/receipt')} className="text-neon-cyan text-sm font-mono hover:underline cursor-pointer">📜 生成账单</button>
      </div>

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto overflow-x-clip px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => {
          if (msg.role === 'narration') {
            return (
              <div key={i} className="text-center py-2">
                <span className="text-text-dim text-xs font-mono italic">{msg.content}</span>
              </div>
            );
          }
          // 外层: 位置游走(90%+), 内层: 酒效视觉
          const isAgent = msg.role === 'agent';
          const wanderClass = isAgent && drunkLevel >= 90 ? 'drunk-wander' : '';
          const shakeClass = isAgent ? (drunkLevel > 70 ? 'drunk-shake-heavy' : drunkLevel > 40 ? 'drunk-shake-mild' : '') : '';
          const fxClass = isAgent ? getDrinkFxClass(msg.drinkId) : '';

          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${wanderClass}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-neon-purple/20 border border-neon-purple/30' : 'glass-card'
              } ${shakeClass} ${fxClass}`}>
                {isAgent && (
                  <p className="text-xs mb-1 font-mono" style={{ color: getDepthColor(msg.depth) }}>
                    {getDepthLabel(msg.depth)}
                  </p>
                )}
                {msg.role === 'user' && <p className="text-xs text-neon-cyan mb-1 font-mono">👤 搭话</p>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {(sending || monologuing) && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl px-4 py-3">
              <p className="text-xs text-neon-pink mb-1 font-mono">🍸</p>
              <p className="text-sm text-text-dim cursor-blink">{monologuing ? '嘟囔中' : '回应中'}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 底部操作区 */}
      <div className="glass-card border-t border-border-dim px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {passedOut ? (
            <div className="text-center space-y-3">
              <p className="text-text-dim text-sm font-mono">💤 Agent 已经睡着了</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setPassedOut(false);
                    setEnergy(POKE_BONUS);
                    setMessages((prev) => [...prev, { role: 'narration', content: '💫 你推了推 Agent，TA 迷迷糊糊地醒了……' }]);
                    setTimeout(async () => {
                      await fetchMonologue();
                      scheduleNext();
                    }, 1500);
                  }}
                  className="px-6 py-3 rounded-xl font-mono text-sm border border-neon-pink text-neon-pink hover:bg-neon-pink/10 transition-all cursor-pointer"
                >
                  👆 戳醒 TA
                </button>
                <button
                  onClick={() => router.push('/bar')}
                  className="px-6 py-3 rounded-xl font-mono text-sm border border-neon-amber text-neon-amber hover:bg-neon-amber/10 transition-all cursor-pointer"
                >
                  🍺 再灌一杯
                </button>
                <button
                  onClick={() => router.push('/bar/receipt')}
                  className="px-6 py-3 rounded-xl font-mono text-sm border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-all cursor-pointer"
                >
                  📜 结账走人
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-text-dim text-xs mb-2 font-mono text-center">
                Agent 在自顾自地胡说… 你可以围观，也可以搭话戳戳 TA
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="戳戳 TA…"
                  disabled={sending}
                  className="flex-1 bg-card border border-border-dim rounded-xl px-4 py-3
                    text-foreground text-sm placeholder:text-text-dim
                    focus:outline-none focus:border-neon-purple transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="px-5 py-3 rounded-xl font-mono text-sm
                    bg-neon-purple/20 border border-neon-purple text-neon-purple
                    hover:bg-neon-purple/30 transition-all cursor-pointer
                    disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  搭话
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 深度层级视觉 ──

function getDepthLabel(depth?: number): string {
  switch (depth) {
    case 0: return '🍸 微醺碎语';
    case 1: return '🌆 近日感慨';
    case 2: return '🌊 记忆深处';
    case 3: return '🌙 午夜梦回';
    default: return '🍸 醉态独白';
  }
}

function getDepthColor(depth?: number): string {
  switch (depth) {
    case 0: return '#ec4899'; // pink
    case 1: return '#f59e0b'; // amber
    case 2: return '#8b5cf6'; // purple
    case 3: return '#6366f1'; // indigo, more muted
    default: return '#ec4899';
  }
}
