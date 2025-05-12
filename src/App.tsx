// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import NostrProvider from '@/components/NostrProvider'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NostrLoginProvider } from '@nostrify/react/login';
import AppRouter from './AppRouter';

// TIP: Using just one relay currently offers the best performance.
const defaultRelays = [
  'wss://relay.nostr.band',
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

export function App() {
  return (
    <NostrLoginProvider storageKey='nostr:login'>
      <NostrProvider relays={defaultRelays}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRouter />
          </TooltipProvider>
        </QueryClientProvider>
      </NostrProvider>
    </NostrLoginProvider>
  );
}

export default App;
