import { useParams } from "react-router-dom";
import { useAuthor } from "@/hooks/useAuthor";
import { useUserVoiceMessages } from "@/hooks/useUserVoiceMessages";
import { VoiceMessagePost } from "@/components/VoiceMessagePost";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { nip19 } from "nostr-tools";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNWC } from "@/hooks/useNWC";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";

function isValidNip05(nip05: string, pubkey: string): boolean {
  return !!nip05 && nip05.includes("@");
}

export function Profile() {
  const { npub } = useParams<{ npub: string }>();
  const decoded = npub ? nip19.decode(npub) : null;
  const pubkey = decoded?.type === "npub" ? decoded.data : null;

  const author = useAuthor(pubkey || "");
  const metadata = author.data?.metadata;
  const { data: messages, isLoading } = useUserVoiceMessages(pubkey || "");
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { mutate: publish } = useNostrPublish();
  const [isFollowing, setIsFollowing] = useState(false);
  const { sendZap, settings } = useNWC();
  const [isZapDialogOpen, setIsZapDialogOpen] = useState(false);
  const [zapAmount, setZapAmount] = useState(1000); // default 1000 sats
  const [isZapping, setIsZapping] = useState(false);

  // Query the current user's contact list
  const { data: contactList } = useQuery({
    queryKey: ["contacts", user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return null;
      const events = await nostr.query([
        { kinds: [3], authors: [user.pubkey] },
      ]);
      return events[0]; // Get the most recent contact list
    },
    enabled: !!user?.pubkey,
  });

  // Update isFollowing state when contact list changes
  useEffect(() => {
    if (contactList && pubkey) {
      const tags = contactList.tags || [];
      setIsFollowing(tags.some((tag) => tag[0] === "p" && tag[1] === pubkey));
    }
  }, [contactList, pubkey]);

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
  const nip05 = metadata?.nip05;
  const lightning = metadata?.lud16 || metadata?.lud06;

  const npubStr = nip19.npubEncode(pubkey);

  const handleCopyPubkey = async () => {
    await navigator.clipboard.writeText(npubStr);
    toast.success("npub copied to clipboard");
  };

  const handleFollow = async () => {
    if (!user?.pubkey || !pubkey) return;

    // Get current contact list tags
    const currentTags = contactList?.tags || [];

    // Add new pubkey to tags if not already present
    if (!currentTags.some((tag) => tag[0] === "p" && tag[1] === pubkey)) {
      const newTags = [...currentTags, ["p", pubkey]];

      // Publish new contact list
      publish(
        {
          kind: 3,
          content: contactList?.content || "",
          tags: newTags,
        },
        {
          onSuccess: () => {
            setIsFollowing(true);
            toast.success("Followed user");
          },
          onError: () => {
            toast.error("Failed to follow user");
          },
        }
      );
    }
  };

  const handleUnfollow = async () => {
    if (!user?.pubkey || !pubkey) return;

    // Get current contact list tags
    const currentTags = contactList?.tags || [];

    // Remove pubkey from tags
    const newTags = currentTags.filter(
      (tag) => !(tag[0] === "p" && tag[1] === pubkey)
    );

    // Publish new contact list
    publish(
      {
        kind: 3,
        content: contactList?.content || "",
        tags: newTags,
      },
      {
        onSuccess: () => {
          setIsFollowing(false);
          toast.success("Unfollowed user");
        },
        onError: () => {
          toast.error("Failed to unfollow user");
        },
      }
    );
  };

  const handleZap = async () => {
    if (!lightning) return;
    if (!settings?.nwcConnectionString) {
      toast.error("Please set up Nostr Wallet Connect in settings");
      return;
    }
    setIsZapping(true);
    try {
      await sendZap(lightning, zapAmount);
      toast.success(`Zapped ${zapAmount} sats!`);
      setIsZapDialogOpen(false);
    } catch (e) {
      toast.error("Failed to zap");
    } finally {
      setIsZapping(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {displayName}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyPubkey}
                    title="Copy npub"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  </Button>
                </h1>
                {user?.pubkey !== pubkey && (
                  <div className="flex items-center">
                    {isFollowing ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnfollow}
                      >
                        Unfollow
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleFollow}>
                        Follow
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {about && <p className="text-muted-foreground mt-1">{about}</p>}
              {isValidNip05(nip05 || "", pubkey) && (
                <div className="text-sm text-primary mt-1 flex items-center gap-1">
                  <span className="inline text-green-600">✅</span> {nip05}
                </div>
              )}
              {lightning && (
                <div
                  className="text-sm text-primary mt-1 cursor-pointer hover:underline flex items-center gap-1"
                  onClick={() => setIsZapDialogOpen(true)}
                  title="Zap this user"
                >
                  ⚡ {lightning}
                </div>
              )}
            </div>
          </div>
        </div>
        <Dialog open={isZapDialogOpen} onOpenChange={setIsZapDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zap {displayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                min={1}
                step={1}
                value={zapAmount}
                onChange={(e) => setZapAmount(Number(e.target.value))}
                placeholder="Amount in sats"
                className="w-full"
              />
              <Button
                onClick={handleZap}
                disabled={isZapping || !zapAmount || zapAmount < 1}
                className="w-full"
              >
                {isZapping ? "Zapping..." : `Zap ${zapAmount} sats`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
