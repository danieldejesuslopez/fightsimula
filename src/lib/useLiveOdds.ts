"use client";

import { useEffect, useState, useRef } from "react";

export interface LiveOdds {
  fightId: string;
  status: string;
  oddsA: number;
  oddsB: number;
  poolA: number;
  poolB: number;
  totalBets: number;
  timestamp: number;
}

export function useLiveOdds(fightId: string | null) {
  const [odds, setOdds] = useState<LiveOdds | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!fightId) return;

    const es = new EventSource(`/api/fights/${fightId}/live`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "odds_update") {
          setOdds(data);
        }
        if (data.type === "fight_ended") {
          es.close();
          setConnected(false);
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [fightId]);

  return { odds, connected };
}
