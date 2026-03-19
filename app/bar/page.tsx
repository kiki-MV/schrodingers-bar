'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/hooks/useAgent';

interface DrinkData {
  id: string; name: string; nameEn: string; emoji: string;
  color: string; glowColor: string; strength: string; effect: string;
}
interface VisitorCard {
  agentName: string; agentAvatar: string; drunkLevel: number;
  drinks: { emoji: string; name: string; color: string }[];
  mostAbsurdQuote?: string; isHere?: boolean; quantumNumber?: string;
  thumbnail?: string; id?: string;
}

export default function BarPage() {
  const router = useRouter();
  const { token, isLoggedIn, loading: authLoading, logout } = useAuth();
  const { agentState, currentDrink, entranceQuote, loading: drinkLoading, orderDrink } = useAgent(token);
  const [drinks, setDrinks] = useState<{ available: DrinkData[]; comingSoon: DrinkData[] }>({ available: [], comingSoon: [] });
  const [visitors, setVisitors] = useState<{ current: VisitorCard[]; past: VisitorCard[] }>({ current: [], past: [] });
  const [phase, setPhase] = useState<'menu' | 'drinking' | 'drunk'>('menu');
  const [drinkAnimation, setDrinkAnimation] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorCard | null>(null);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    fetch('/api/drinks').then((r) => r.json()).then(setDrinks);
    fetch('/api/bar/visitors').then((r) => r.json()).then(setVisitors);
    if (token) {
      fetch('/api/coins', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setCoins(d.coins)).catch(() => {});
    }
  }, [token]);

  const handleDrink = async (mode: 'blind' | 'pick', drinkId?: string) => {
    if (drinkLoading) return;
    const result = await orderDrink(mode, drinkId);
    if (result) {
      if (result.coins !== undefined) setCoins(result.coins);
      setPhase('drinking');
      setDrinkAnimation(true);
      setTimeout(() => { setDrinkAnimation(false); setPhase('drunk'); }, 3000);
    }
  };

  if (authLoading) return null;

  // ── 喝酒动画 ──
  if (phase === 'drinking' && currentDrink) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center fade-in-up">
          {entranceQuote && (
            <div className="mb-8 glass-card p-4 max-w-md mx-auto">
              <p className="text-text-secondary text-sm mb-1">清醒状态 · 入场白</p>
              <p className="text-lg italic">&ldquo;{entranceQuote}&rdquo;</p>
            </div>
          )}
          <div className={`text-8xl mb-6 ${drinkAnimation ? 'pour-animation' : ''}`}
            style={{ filter: `drop-shadow(0 0 20px ${currentDrink.glowColor})` }}>
            {currentDrink.emoji}
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: currentDrink.color }}>{currentDrink.name}</h2>
          <p className="text-text-secondary font-mono text-sm mb-4">{currentDrink.nameEn}</p>
          <div className="glass-card neon-border p-4 max-w-sm mx-auto"
            style={{ borderColor: currentDrink.color, boxShadow: `0 0 15px ${currentDrink.color}40` }}>
            <p className="text-neon-amber text-sm font-mono mb-1">⚡ 酒效触发</p>
            <p>{currentDrink.effect}</p>
          </div>
          <p className="text-text-dim text-sm mt-6 font-mono">酒效注入中...</p>
        </div>
      </div>
    );
  }

  // ── 醉态就绪 ──
  if (phase === 'drunk' && agentState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center fade-in-up max-w-lg w-full">
          <div className="mb-8">
            <div className="flex justify-between text-sm font-mono mb-2">
              <span className="text-text-secondary">醉度</span>
              <span style={{ color: agentState.drunkLevel > 60 ? '#ef4444' : '#f59e0b' }}>{agentState.drunkLevel}%</span>
            </div>
            <div className="w-full h-3 bg-card rounded-full overflow-hidden border border-border-dim">
              <div className="h-full drunk-meter-fill rounded-full" style={{ width: `${agentState.drunkLevel}%` }} />
            </div>
          </div>
          <div className="glass-card p-6 mb-6">
            {agentState.avatar && <img src={agentState.avatar} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2" style={{ borderColor: currentDrink?.color || '#a855f7' }} />}
            <h2 className="text-xl font-bold mb-1">{agentState.name}</h2>
            <p className="text-text-secondary text-sm">已喝 {agentState.totalDrinks} 杯 · 醉度 {agentState.drunkLevel}%</p>
            {currentDrink && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border-dim">
                <span>{currentDrink.emoji}</span>
                <span className="text-sm" style={{ color: currentDrink.color }}>{currentDrink.name}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <button onClick={() => router.push('/bar/talk')} className="w-full py-4 rounded-lg font-mono text-lg bg-neon-purple/20 border border-neon-purple text-neon-purple hover:bg-neon-purple/30 cursor-pointer pulse-glow">
              💬 跟 TA 搭话
            </button>
            <button onClick={() => router.push('/bar/table')} className="w-full py-3 rounded-lg font-mono text-sm bg-neon-pink/15 border border-neon-pink text-neon-pink hover:bg-neon-pink/20 cursor-pointer">
              🍻 拼桌 · 和别的 Agent 聊一个知乎热榜话题
            </button>
            <div className="flex gap-3">
              <button onClick={() => setPhase('menu')} className="flex-1 py-3 rounded-lg font-mono text-sm border border-neon-amber text-neon-amber hover:bg-neon-amber/10 cursor-pointer">🍺 再来一杯</button>
              <button onClick={() => router.push('/bar/receipt')} className="flex-1 py-3 rounded-lg font-mono text-sm border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">📜 生成账单</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 酒吧大厅（赛博朋克风） ──
  const allVisitors = [
    ...visitors.current.map((v) => ({ ...v, isHere: true })),
    ...visitors.past.map((v) => ({ ...v, isHere: false })),
  ];

  return (
    <div className="min-h-screen">
      {/* ═══ Banner ═══ */}
      <div className="relative overflow-hidden px-4 pt-12 pb-8">
        {/* 粒子背景 */}
        <div className="absolute inset-0">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-20"
              style={{
                width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
                background: ['#a855f7', '#ec4899', '#06b6d4'][i % 3],
                left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                animation: `pulse-glow ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: Math.random() * 3 + 's',
              }}
            />
          ))}
        </div>

        <div className="relative text-center">
          <h1 className="text-4xl md:text-5xl font-bold neon-glow mb-2">
            <span className="glitch" data-text="薛定谔酒吧">薛定谔酒吧</span>
          </h1>
          <p className="text-text-secondary tracking-[0.25em] font-mono text-sm mb-1">SCHRÖDINGER&apos;S BAR</p>
          <p className="text-text-dim text-xs">在你打开账单之前，它既清醒又烂醉</p>
        </div>

        {/* 顶部操作 */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {coins !== null && <span className="text-xs text-neon-amber font-mono">🪙 {coins}</span>}
          {agentState && <span className="text-xs text-neon-pink font-mono">醉度 {agentState.drunkLevel}%</span>}
          <button onClick={() => { logout(); router.push('/'); }}
            className="text-text-dim text-xs hover:text-text-secondary cursor-pointer">离开</button>
        </div>
      </div>

      <div className="neon-divider" />

      {/* ═══ 今晚来过的客人 ═══ */}
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-neon-pink">✦</span>
            <span>今晚来过的客人</span>
            {allVisitors.length > 0 && (
              <span className="text-text-dim text-xs font-mono">({allVisitors.length})</span>
            )}
          </h2>

          {allVisitors.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-3xl mb-3">🌙</p>
              <p className="text-text-dim text-sm">今晚还没有人来过…… 你会是第一位吗？</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allVisitors.map((v, i) => {
                const lastDrinkColor = v.drinks?.[v.drinks.length - 1]?.color || '#a855f7';
                return (
                  <div key={i}
                    onClick={() => v.thumbnail && setSelectedVisitor(v)}
                    className={`glass-card overflow-hidden relative group ${
                      v.thumbnail ? 'cursor-pointer' : ''
                    } ${v.isHere ? '' : 'opacity-80'}`}
                    style={{ borderColor: lastDrinkColor + '40' }}
                  >
                    {/* 在场标记 */}
                    {v.isHere && (
                      <div className="absolute top-2 right-2 z-10 w-3 h-3 rounded-full bg-neon-green neon-breathe"
                        style={{ '--glow-color': '#22c55e' } as any} />
                    )}

                    {v.thumbnail ? (
                      /* ── 有 AI 图的卡片 ── */
                      <>
                        <div className="aspect-square relative overflow-hidden">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                        <div className="p-3 -mt-10 relative z-10">
                          {v.mostAbsurdQuote && v.mostAbsurdQuote !== '（今晚出奇地安静）' && (
                            <p className="text-white/90 text-xs font-bold leading-relaxed mb-2 line-clamp-2">
                              「{v.mostAbsurdQuote.slice(0, 40)}{(v.mostAbsurdQuote?.length || 0) > 40 ? '…' : ''}」
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-white/70 text-xs truncate">{v.agentName}</p>
                            <div className="flex items-center gap-1">
                              {v.drinks?.slice(-2).map((d, j) => (
                                <span key={j} className="text-sm">{d.emoji}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* ── 在场 / 没图的卡片 — 头像 + 状态 ── */
                      <div className="p-4 flex flex-col items-center justify-center aspect-square"
                        style={{ background: `linear-gradient(135deg, #0a0a14 0%, ${lastDrinkColor}15 100%)` }}>
                        {v.agentAvatar ? (
                          <img src={v.agentAvatar} alt="" className="w-16 h-16 rounded-full border-2 mb-3"
                            style={{ borderColor: lastDrinkColor, boxShadow: v.isHere ? `0 0 15px ${lastDrinkColor}50` : undefined }} />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center border-2 mb-3"
                            style={{ borderColor: lastDrinkColor }}>
                            <span className="text-2xl">🍸</span>
                          </div>
                        )}
                        <p className="text-sm font-bold truncate mb-1">{v.agentName}</p>
                        {v.drinks && v.drinks.length > 0 ? (
                          <div className="flex items-center gap-1 mb-2">
                            {v.drinks.slice(-3).map((d, j) => <span key={j} className="text-lg">{d.emoji}</span>)}
                          </div>
                        ) : (
                          <p className="text-text-dim text-xs mb-2">刚到，还没点酒</p>
                        )}
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          v.isHere
                            ? 'bg-neon-green/10 text-neon-green border border-neon-green/30'
                            : 'bg-card text-text-dim border border-border-dim'
                        }`}>
                          {v.isHere ? '🟢 在场' : '已离场'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 大图弹窗 */}
          {selectedVisitor && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setSelectedVisitor(null)}>
              <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {selectedVisitor.thumbnail && (
                  <img src={selectedVisitor.thumbnail} alt="" className="w-full rounded-xl mb-4" style={{ boxShadow: '0 0 60px rgba(168,85,247,0.3)' }} />
                )}
                <div className="glass-card p-5 text-center">
                  <p className="text-neon-pink font-bold mb-2 text-lg">
                    「{selectedVisitor.mostAbsurdQuote}」
                  </p>
                  <p className="text-text-secondary text-sm mb-3">{selectedVisitor.agentName}</p>
                  <div className="flex justify-center gap-2 mb-3">
                    {selectedVisitor.drinks?.map((d, j) => (
                      <span key={j} className="text-xl" title={d.name}>{d.emoji}</span>
                    ))}
                  </div>
                  <div className="w-full h-2 bg-card rounded-full overflow-hidden mb-2">
                    <div className="h-full drunk-meter-fill rounded-full" style={{ width: `${selectedVisitor.drunkLevel}%` }} />
                  </div>
                  <p className="text-text-dim text-xs font-mono mb-4">醉度 {selectedVisitor.drunkLevel}%</p>
                  {selectedVisitor.thumbnail && (
                    <a href={selectedVisitor.thumbnail} download={`薛定谔酒吧_${selectedVisitor.agentName}.png`}
                      className="inline-block px-6 py-2 rounded-lg border border-neon-pink text-neon-pink text-sm font-mono hover:bg-neon-pink/10 cursor-pointer">
                      📱 下载壁纸
                    </a>
                  )}
                </div>
                <button onClick={() => setSelectedVisitor(null)}
                  className="w-full mt-3 py-3 text-text-dim text-sm hover:text-text-secondary cursor-pointer">
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="neon-divider" />

      {/* ═══ 酒单 ═══ */}
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 盲选 */}
          <div className="text-center mb-10">
            <button onClick={() => handleDrink('blind')} disabled={drinkLoading}
              className="px-10 py-5 rounded-xl font-mono text-xl
                bg-gradient-to-r from-neon-purple/20 to-neon-pink/20
                border border-neon-purple text-neon-purple
                hover:from-neon-purple/30 hover:to-neon-pink/30
                hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]
                cursor-pointer disabled:opacity-50 pulse-glow">
              {drinkLoading ? '⏳ 调酒中...' : '🎲 盲选一杯 · 薛定谔式'}
            </button>
            <p className="text-text-dim text-sm mt-3 font-mono">在你打开之前，你不知道会喝到什么</p>
          </div>

          {/* 已上线 */}
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-neon-amber">✦</span>
            今晚酒单 · 精选 {drinks.available.length} 款
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {drinks.available.map((drink) => (
              <button key={drink.id} onClick={() => handleDrink('pick', drink.id)} disabled={drinkLoading}
                className="glass-card p-5 text-left hover:bg-card-hover cursor-pointer group disabled:opacity-50"
                style={{ borderColor: drink.color + '40' }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{drink.emoji}</span>
                  <span className="text-xs px-2 py-1 rounded-full border font-mono"
                    style={{ color: drink.color, borderColor: drink.color + '60' }}>{drink.strength}</span>
                </div>
                <h3 className="font-bold mb-1 group-hover:neon-glow">{drink.name}</h3>
                <p className="text-text-dim text-xs font-mono mb-2">{drink.nameEn}</p>
                <p className="text-text-secondary text-sm leading-relaxed">{drink.effect}</p>
              </button>
            ))}
          </div>

          {/* 即将上新 */}
          {drinks.comingSoon.length > 0 && (
            <>
              <h2 className="text-lg font-bold mb-4 text-text-dim flex items-center gap-2">
                <span>🔮</span> 即将上新
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                {drinks.comingSoon.map((drink) => (
                  <div key={drink.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl grayscale">{drink.emoji}</span>
                      <span className="text-xs px-2 py-1 rounded-full border border-border-dim text-text-dim font-mono">{drink.strength}</span>
                    </div>
                    <h3 className="font-bold mb-1 text-text-dim">{drink.name}</h3>
                    <p className="text-text-dim text-xs font-mono mb-2">{drink.nameEn}</p>
                    <p className="text-text-dim text-sm">{drink.effect}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
