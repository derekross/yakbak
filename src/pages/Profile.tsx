import { useParams } from "react-router-dom";
import { useAuthor } from "@/hooks/useAuthor";
import { useUserVoiceMessages } from "@/hooks/useUserVoiceMessages";
import { VoiceMessagePost } from "@/components/VoiceMessagePost";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { nip19 } from "nostr-tools";

export function Profile() {
  const { npub } = useParams<{ npub: string }>();
  const decoded = npub ? nip19.decode(npub) : null;
  const pubkey = decoded?.type === "npub" ? decoded.data : null;

  const author = useAuthor(pubkey || "");
  const metadata = author.data?.metadata;
  const { data: messages, isLoading } = useUserVoiceMessages(pubkey || "");

  if (!pubkey) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">Invalid profile</div>
      </div>
    );
  }

  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  const about = metadata?.about;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="p-6 mb-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {about && <p className="text-muted-foreground mt-1">{about}</p>}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center">Loading messages...</div>
        ) : messages?.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No voice messages yet
          </div>
        ) : (
          messages?.map((message) => (
            <VoiceMessagePost key={message.id} message={message} />
          ))
        )}
      </div>
    </div>
  );
}
