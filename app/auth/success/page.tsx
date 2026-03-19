'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TOKEN_KEY = 'schrodingers_bar_token';
const REFRESH_KEY = 'schrodingers_bar_refresh';

function SuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
      }
      router.replace('/bar');
    } else {
      router.replace('/auth?error=登录失败，未获取到 token');
    }
  }, [searchParams, router]);

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">🍸</div>
      <p className="text-text-secondary font-mono neon-glow-cyan">量子身份验证成功，正在进入酒吧...</p>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <p className="text-text-secondary font-mono">验证中...</p>
          </div>
        }
      >
        <SuccessHandler />
      </Suspense>
    </div>
  );
}
