'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

  // OAuth2 标准 redirect 登录
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SECONDME_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
    const state = crypto.randomUUID(); // CSRF protection

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });

    // 保存 state 用于验证
    sessionStorage.setItem('oauth_state', state);

    window.location.href = `https://go.second.me/oauth/?${params.toString()}`;
  };

  return (
    <div className="glass-card neon-border p-8 w-full max-w-md fade-in-up">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔐</div>
        <h1 className="text-2xl font-bold neon-glow-cyan mb-2">身份验证</h1>
        <p className="text-text-secondary text-sm">
          连接你的 SecondMe，让 Agent 今晚来喝一杯
        </p>
      </div>

      <button
        onClick={handleLogin}
        className="w-full py-4 px-4 rounded-lg font-mono text-lg tracking-wider
          bg-neon-purple/20 border border-neon-purple text-neon-purple
          hover:bg-neon-purple/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]
          transition-all cursor-pointer pulse-glow mb-6"
      >
        ⚡ 使用 SecondMe 登录
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          ⚠️ {error}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => router.push('/')}
          className="text-text-dim text-sm hover:text-text-secondary transition-colors cursor-pointer"
        >
          ← 返回酒吧门口
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-text-dim">加载中...</div>}>
        <AuthContent />
      </Suspense>
    </div>
  );
}
