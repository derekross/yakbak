import { useParams } from "react-router-dom";
import { useNostr } from "@nostrify/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { VoiceMessagePost } from "@/components/VoiceMessagePost";
import { Card } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { NostrEvent } from "@nostrify/nostrify";

interface ThreadedNostrEvent extends NostrEvent {
  replies: ThreadedNostrEvent[];
}

interface QueryData {
  pages: ThreadedNostrEvent[][];
  pageParams: number[];
}

export function HashtagPage() {
  const { hashtag } = useParams<{ hashtag: string }>();
  const { nostr } = useNostr();
  const { ref, inView } = useInView();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery<ThreadedNostrEvent[], Error>({
    queryKey: ["voiceMessages", "hashtag", hashtag],
    initialPageParam: Math.floor(Date.now() / 1000),
    queryFn: async ({ pageParam }) => {
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [
          {
            kinds: [1222],
            "#t": [hashtag || ""],
            until: pageParam as number,
            limit: 20,
          },
        ],
        { signal }
      );

      // Sort events by created_at in descending order
      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);

      // Add empty replies array to each event
      const eventsWithReplies = sortedEvents.map((event) => ({
        ...event,
        replies: [],
      }));

      return eventsWithReplies;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      const lastMessage = lastPage[lastPage.length - 1];
      return lastMessage.created_at;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hashtag) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">Invalid hashtag</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center text-red-500">
          Error: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  // Deduplicate messages by id
  const allMessages: ThreadedNostrEvent[] = (data?.pages.flat() ??
    []) as ThreadedNostrEvent[];
  const uniqueMessages: ThreadedNostrEvent[] = Array.from(
    new Map(allMessages.map((msg) => [msg.id, msg])).values()
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">#{hashtag}</h1>
      {status === "pending" ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="space-y-4">
          {uniqueMessages.map((message) => (
            <VoiceMessagePost key={message.id} message={message} />
          ))}
          <div ref={ref} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
