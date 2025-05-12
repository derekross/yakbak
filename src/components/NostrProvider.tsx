import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import React, { useRef } from 'react';

interface NostrProviderProps {
  children: React.ReactNode;
  relays: string[];
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children, relays } = props;

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        return new Map(relays.map((url) => [url, filters]));
      },
      eventRouter(_event: NostrEvent) {
        return relays;
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;