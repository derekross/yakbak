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
      <Card className="p-4">
        <VoiceMessagePost message={message as ThreadedNostrEvent} />
      </Card>
    </div>
  );
}
