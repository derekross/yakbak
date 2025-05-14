import { useParams } from "react-router-dom";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { nip19 } from "nostr-tools";
import { VoiceMessagePost } from "@/components/VoiceMessagePost";
import { Card } from "@/components/ui/card";
import { NostrEvent } from "@nostrify/nostrify";

interface ThreadedNostrEvent extends NostrEvent {
  replies: ThreadedNostrEvent[];
}

export function VoiceMessagePage() {
  const { nevent } = useParams<{ nevent: string }>();
  const { nostr } = useNostr();
  const decoded = nevent ? nip19.decode(nevent) : null;
  const eventId = decoded?.type === "nevent" ? decoded.data.id : null;

  const { data: message, isLoading } = useQuery({
    queryKey: ["voiceMessage", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [
          {
            kinds: [1222],
            ids: [eventId],
          },
        ],
        { signal }
      );
      return events[0] ? { ...events[0], replies: [] } : null;
    },
    enabled: !!eventId,
  });

  // Fetch replies to this message
  const { data: replies, isLoading: isLoadingReplies } = useQuery({
    queryKey: ["voiceMessageReplies", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [
          {
            kinds: [1222],
            // Find replies where the 'e' tag references this eventId and is a reply
            "#e": [eventId],
            limit: 100,
          },
        ],
        { signal }
      );
      // Only include those with a tag type 'reply'
      const filteredReplies = events
        .filter((ev) =>
          ev.tags.some(
            (tag) => tag[0] === "e" && tag[1] === eventId && tag[3] === "reply"
          )
        )
        .sort((a, b) => a.created_at - b.created_at)
        .map((ev) => ({ ...ev, replies: [] }));
      if (filteredReplies) {
        console.log(
          "VoiceMessagePage: replies.length =",
          filteredReplies.length,
          filteredReplies
        );
      }
      return filteredReplies;
    },
    enabled: !!eventId,
  });

  // Check if the current message is a reply and get the root ID
  const rootTag = message?.tags.find(
    (tag) => tag[0] === "e" && tag[3] === "root"
  );
  const rootId = rootTag ? rootTag[1] : null;

  // Fetch the root message if needed
  const { data: rootMessage } = useQuery({
    queryKey: ["voiceMessageRoot", rootId],
    queryFn: async () => {
      if (!rootId) return null;
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [
          {
            kinds: [1222],
            ids: [rootId],
          },
        ],
        { signal }
      );
      return events[0] ? { ...events[0], replies: [] } : null;
    },
    enabled: !!rootId,
  });

  if (!eventId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">Invalid message</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">Message not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Show root message if this is a reply */}
      {rootMessage && (
        <div className="mb-2">
          <Card className="p-4 border-2 border-primary/40 bg-muted/50">
            <VoiceMessagePost message={rootMessage as ThreadedNostrEvent} />
          </Card>
        </div>
      )}
      {/* If root is shown, nest the current message visually */}
      <div
        className={rootMessage ? "ml-6 border-l-2 border-primary/30 pl-4" : ""}
      >
        {rootMessage && (
          <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
            Reply
          </div>
        )}
        <VoiceMessagePost message={message as ThreadedNostrEvent} />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">
          {rootMessage ? "Replies to this reply" : "Replies"}
        </h2>
        {isLoadingReplies ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : replies && replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                className="ml-6 border-l-2 border-primary/20 pl-4"
                key={reply.id}
              >
                <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                  Reply
                </div>
                <VoiceMessagePost message={reply as ThreadedNostrEvent} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">No replies yet.</div>
        )}
      </div>
    </div>
  );
}
