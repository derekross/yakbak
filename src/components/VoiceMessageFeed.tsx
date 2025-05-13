import { useEffect, useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { VoiceMessagePost } from "./VoiceMessagePost";
import { useInView } from "react-intersection-observer";
import { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Globe, Users } from "lucide-react";

const PAGE_SIZE = 10;

type FeedFilter = "global" | "following";

interface ThreadedMessage extends NostrEvent {
  replies: ThreadedMessage[];
}

export function VoiceMessageFeed() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { ref, inView } = useInView();
  const [filter, setFilter] = useState<FeedFilter>("global");

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["voiceMessages", filter],
    initialPageParam: Math.floor(Date.now() / 1000), // Start from current time
    queryFn: async ({ pageParam = Math.floor(Date.now() / 1000) }) => {
      const signal = AbortSignal.timeout(1500);

      // Base filter for voice messages
      const baseFilter = {
        kinds: [1222],
        limit: PAGE_SIZE,
        until: pageParam as number,
        since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
      };

      // If following filter is selected and user is logged in, add authors filter
      if (filter === "following" && user?.pubkey) {
        const following = await nostr.query(
          [
            {
              kinds: [3],
              authors: [user.pubkey],
            },
          ],
          { signal }
        );

        const followingEvent = following[0];
        if (followingEvent?.tags) {
          const followingList = followingEvent.tags
            .filter((tag) => tag[0] === "p")
            .map((tag) => tag[1]);

          if (followingList.length > 0) {
            return nostr.query(
              [
                {
                  ...baseFilter,
                  authors: followingList,
                },
              ],
              { signal }
            ) as Promise<NostrEvent[]>;
          }
        }
        return [] as NostrEvent[];
      }

      // Global feed
      return nostr.query([baseFilter], { signal }) as Promise<NostrEvent[]>;
    },
    getNextPageParam: (lastPage: NostrEvent[]) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      const lastMessage = lastPage[lastPage.length - 1];
      return lastMessage?.created_at;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Organize messages into threads
  const threadedMessages = useMemo(() => {
    if (!data?.pages) return [];

    const allMessages = data.pages.flat();
    const messageMap = new Map<string, ThreadedMessage>();
    const rootMessages: ThreadedMessage[] = [];

    // First pass: create message objects with empty replies array
    allMessages.forEach((message) => {
      messageMap.set(message.id, { ...message, replies: [] });
    });

    // Second pass: organize into threads
    allMessages.forEach((message) => {
      const rootTag = message.tags.find(
        (tag) => tag[0] === "e" && tag[3] === "root"
      );
      const replyTag = message.tags.find(
        (tag) => tag[0] === "e" && tag[3] === "reply"
      );

      const threadedMessage = messageMap.get(message.id)!;

      if (rootTag) {
        const rootId = rootTag[1];
        const rootMessage = messageMap.get(rootId);
        if (rootMessage) {
          rootMessage.replies.push(threadedMessage);
        }
      } else if (!replyTag) {
        // This is a root message
        rootMessages.push(threadedMessage);
      }
    });

    // Sort root messages by created_at
    return rootMessages.sort((a, b) => b.created_at - a.created_at);
  }, [data?.pages]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Refetch when filter changes
  useEffect(() => {
    refetch();
  }, [filter, refetch]);

  if (status === "error") {
    return <div>Error: {error.message}</div>;
  }

  const hasMessages = data?.pages?.[0]?.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-center -mt-6 mb-2">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => value && setFilter(value as FeedFilter)}
        >
          <ToggleGroupItem value="global" aria-label="Global feed">
            <Globe className="h-4 w-4 mr-2" />
            Global
          </ToggleGroupItem>
          <ToggleGroupItem
            value="following"
            aria-label="Following feed"
            disabled={!user}
          >
            <Users className="h-4 w-4 mr-2" />
            Following
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-4">
        {threadedMessages.map((message) => (
          <div key={message.id} className="space-y-4">
            <VoiceMessagePost message={message} />
            {message.replies.length > 0 && (
              <div className="ml-8 space-y-4 border-l-2 border-muted pl-4">
                {message.replies
                  .sort((a, b) => a.created_at - b.created_at)
                  .map((reply) => (
                    <VoiceMessagePost key={reply.id} message={reply} />
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={ref} className="h-12 w-full flex items-center justify-center">
        {isFetchingNextPage ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
        ) : !hasNextPage && hasMessages ? (
          <div className="text-sm text-muted-foreground">No more messages</div>
        ) : !hasMessages ? (
          <div className="text-sm text-muted-foreground">
            {filter === "following" && !user
              ? "Please log in to see messages from people you follow"
              : "No messages yet. Be the first to record a voice message!"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
