'use client';

import { useState, useCallback } from 'react';

interface AgentInfo {
  agentId: string;
  name: string;
  avatar: string;
  drunkLevel: number;
  totalDrinks: number;
}

interface DrinkInfo {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: string;
  glowColor: string;
  strength: string;
  effect: string;
}

interface DrinkResult {
  isNewEntry: boolean;
  entranceQuote: string;
  drink: DrinkInfo;
  agentState: AgentInfo;
}

export function useAgent(token: string | null) {
  const [agentState, setAgentState] = useState<AgentInfo | null>(null);
  const [currentDrink, setCurrentDrink] = useState<DrinkInfo | null>(null);
  const [entranceQuote, setEntranceQuote] = useState('');
  const [loading, setLoading] = useState(false);

  const orderDrink = useCallback(
    async (mode: 'blind' | 'pick' = 'blind', drinkId?: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/drink', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode, drinkId }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data: DrinkResult = await res.json();
        setAgentState(data.agentState);
        setCurrentDrink(data.drink);
        setEntranceQuote(data.entranceQuote);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const talk = useCallback(
    async (message: string) => {
      if (!token) throw new Error('未登录');
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setAgentState((prev) =>
        prev
          ? { ...prev, drunkLevel: data.agentState.drunkLevel, totalDrinks: data.agentState.totalDrinks }
          : prev,
      );
      return data.reply as string;
    },
    [token],
  );

  const getReceipt = useCallback(async () => {
    if (!token) throw new Error('未登录');
    const res = await fetch('/api/receipt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }, [token]);

  return {
    agentState,
    currentDrink,
    entranceQuote,
    loading,
    orderDrink,
    talk,
    getReceipt,
  };
}
