import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { NostrEvent } from "@nostrify/nostrify";

interface ThreadedNostrEvent extends NostrEvent {
  replies: ThreadedNostrEvent[];
}

export function useUserVoiceMessages(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["userVoiceMessages", pubkey],
    queryFn: async () => {
      if (!pubkey) return [];

      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [
          {
            kinds: [1222],
            authors: [pubkey],
            limit: 50,
          },
        ],
        { signal }
      );

      // Convert to threaded events
      const rootEvents = events.filter(
        (event) =>
          !event.tags.some((tag) => tag[0] === "e" && tag[3] === "reply")
      ) as ThreadedNostrEvent[];

      // Add replies to their root events
      rootEvents.forEach((root) => {
        root.replies = events.filter((event) =>
          event.tags.some(
            (tag) => tag[0] === "e" && tag[1] === root.id && tag[3] === "reply"
          )
        ) as ThreadedNostrEvent[];
      });

      return rootEvents;
    },
    enabled: !!pubkey,
  });
}
