'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowTitle(true), 300);
    setTimeout(() => setShowSubtitle(true), 1200);
    setTimeout(() => setShowButton(true), 2000);
  }, []);

  const handleEnter = () => {
    if (isLoggedIn) {
      router.push('/bar');
    } else {
      router.push('/auth');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* 背景粒子 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              background: ['#a855f7', '#ec4899', '#06b6d4'][i % 3],
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `pulse-glow ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      {/* 酒杯 */}
      <div
        className={`text-7xl mb-8 transition-all duration-1000 ${
          showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        🍸
      </div>

      {/* 标题 */}
      <h1
        className={`text-5xl md:text-7xl font-bold mb-4 neon-glow transition-all duration-1000 ${
          showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="glitch" data-text="薛定谔酒吧">
          薛定谔酒吧
        </span>
      </h1>

      <p
        className={`text-lg text-text-secondary tracking-[0.3em] mb-6 font-mono transition-all duration-1000 ${
          showTitle ? 'opacity-100' : 'opacity-0'
        }`}
      >
        SCHRÖDINGER&apos;S BAR
      </p>

      <p
        className={`text-xl text-text-secondary mb-12 transition-all duration-1000 delay-200 ${
          showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        在你打开账单之前，它既清醒又烂醉
      </p>

      <button
        onClick={handleEnter}
        className={`group relative px-10 py-4 font-mono text-lg tracking-wider
          border border-neon-purple rounded-lg
          bg-transparent text-neon-purple
          hover:bg-neon-purple/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]
          transition-all duration-500 cursor-pointer
          ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <span className="relative z-10">推 开 酒 吧 门</span>
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-neon-purple/5 to-neon-pink/5" />
      </button>

      <p
        className={`absolute bottom-8 text-sm text-text-dim font-mono transition-all duration-1000 ${
          showButton ? 'opacity-60' : 'opacity-0'
        }`}
      >
        观测之前，一切皆有可能
      </p>
    </div>
  );
}
