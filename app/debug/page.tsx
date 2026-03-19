'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('schrodingers_bar_token');
    if (!token) {
      setResult({ error: 'No token in localStorage' });
      setLoading(false);
      return;
    }

    fetch('/api/debug', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setResult)
      .catch((e) => setResult({ error: e.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#000', color: '#0f0', fontFamily: 'monospace', padding: 20, minHeight: '100vh' }}>
      <h1>SecondMe API Debug</h1>
      {loading ? (
        <p>Testing APIs...</p>
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 13 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
