import { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Heart,
  Zap,
  Mic,
  MicOff,
  Play,
  Trash2,
  MoreVertical,
  Copy,
  Share2,
} from "lucide-react";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostr } from "@nostrify/react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadToBlossom, getBlossomServers } from "@/lib/blossom";
import { nip19 } from "nostr-tools";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useNWC } from "@/hooks/useNWC";

interface ThreadedNostrEvent extends NostrEvent {
  replies: ThreadedNostrEvent[];
}

interface QueryData {
  pages: ThreadedNostrEvent[][];
  pageParams: number[];
}

interface VoiceMessagePostProps {
  message: ThreadedNostrEvent;
}

export function VoiceMessagePost({ message }: VoiceMessagePostProps) {
  const author = useAuthor(message.pubkey);
  const metadata = author.data?.metadata;
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasReacted, setHasReacted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const MAX_RECORDING_TIME = 60; // 60 seconds
  const { sendZap, settings } = useNWC();
  const [reactionCount, setReactionCount] = useState(0);
  const [zapAmount, setZapAmount] = useState(0);
  const [hasZapped, setHasZapped] = useState(false);

  const displayName = metadata?.name || message.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;

  const npub = nip19.npubEncode(message.pubkey);

  // Check if the current user has reacted to this message and get reaction count
  useEffect(() => {
    if (!user?.pubkey) return;

    const checkReactions = async () => {
      const reactions = await nostr.query([
        {
          kinds: [7],
          "#e": [message.id],
        },
      ]);

      setReactionCount(reactions.length);
      setHasReacted(reactions.some((r) => r.pubkey === user.pubkey));
    };

    checkReactions();
  }, [user?.pubkey, message.id, nostr]);

  // Check if the current user has zapped this message
  useEffect(() => {
    if (!user?.pubkey) return;

    const checkUserZap = async () => {
      const userZaps = await nostr.query([
        {
          kinds: [9734, 9735], // Check both zap requests and receipts
          authors: [user.pubkey],
          "#e": [message.id],
        },
      ]);

      setHasZapped(userZaps.length > 0);
    };

    checkUserZap();
  }, [user?.pubkey, message.id, nostr]);

  // Get zap amount
  useEffect(() => {
    let isMounted = true;

    const getZapAmount = async () => {
      try {
        const zapEvents = await nostr.query([
          {
            kinds: [9734, 9735],
            "#e": [message.id],
          },
        ]);

        if (!isMounted) return;

        const totalZaps = zapEvents.reduce((sum, event) => {
          // For zap requests (9734), look for amount in the amount tag
          if (event.kind === 9734) {
            const amountTag = event.tags.find(
              (tag) => tag[0] === "amount"
            )?.[1];
            if (amountTag) {
              const amount = parseInt(amountTag) / 1000; // Convert msats to sats
              return sum + amount;
            }
          }

          // For zap receipts (9735), look for amount in the description tag
          if (event.kind === 9735) {
            const zapReceipt = event.tags.find(
              (tag) => tag[0] === "description"
            )?.[1];
            if (!zapReceipt) return sum;

            try {
              const receipt = JSON.parse(zapReceipt);
              const amount = receipt.amount;
              if (amount) {
                return sum + amount / 1000; // Convert msats to sats
              }
            } catch (e) {
              console.error("Error parsing zap receipt:", e);
            }
          }
          return sum;
        }, 0);

        setZapAmount(Math.round(totalZaps));
      } catch (error) {
        console.error("Error fetching zap amount:", error);
      }
    };

    // Initial fetch
    getZapAmount();

    // Set up polling every 5 seconds
    const pollInterval = setInterval(getZapAmount, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [message.id, nostr]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatZapAmount = (amount: number): string => {
    if (amount < 1000) {
      return amount.toString();
    }
    const kAmount = amount / 1000;
    return `${kAmount.toFixed(1)}K`.replace(/\.0K$/, "K");
  };

  const handleReply = () => {
    if (!user) {
      toast.error("Please log in to reply");
      return;
    }
    setIsReplyDialogOpen(true);
  };

  const handleStartRecording = async () => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setPreviewUrl(null); // Clear any existing preview
      setRecordingTime(0);

      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "video/webm" });
        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleDiscardRecording = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRecordingTime(0);
  };

  const handlePublishReply = async () => {
    if (!previewUrl || !user?.pubkey || !user.signer) {
      toast.error("Please record a voice message first");
      return;
    }

    try {
      // Convert the preview URL back to a Blob
      const response = await fetch(previewUrl);
      const audioBlob = await response.blob();

      // Get blossom servers for the user
      const blossomServers = await getBlossomServers(nostr, user.pubkey);
      if (!blossomServers.length) {
        toast.error("No valid blossom servers found");
        return;
      }

      const audioUrl = await uploadToBlossom(
        audioBlob,
        blossomServers,
        user.pubkey,
        user.signer
      );

      // Get the root event ID if this is a reply to a reply
      const rootEventId =
        message.tags.find((tag) => tag[0] === "e" && tag[3] === "root")?.[1] ||
        message.id;

      const tempId = "temp-" + Date.now();
      const tempReply: ThreadedNostrEvent = {
        kind: 1222,
        content: audioUrl,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
        id: tempId,
        sig: "",
        tags: [
          ["e", rootEventId, "", "root"],
          ["e", message.id, "", "reply"],
          ["p", message.pubkey],
        ],
        replies: [],
      };

      // Immediately add the temporary reply to the feed
      queryClient.setQueryData<QueryData>(
        ["voiceMessages", "global"],
        (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) => {
            return page.map((msg) => {
              if (msg.id === rootEventId) {
                return {
                  ...msg,
                  replies: [...(msg.replies || []), tempReply],
                } as ThreadedNostrEvent;
              }
              return msg;
            });
          });
          return { ...oldData, pages: updatedPages };
        }
      );

      // Also update the following feed if user is logged in
      queryClient.setQueryData<QueryData>(
        ["voiceMessages", "following"],
        (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) => {
            return page.map((msg) => {
              if (msg.id === rootEventId) {
                return {
                  ...msg,
                  replies: [...(msg.replies || []), tempReply],
                } as ThreadedNostrEvent;
              }
              return msg;
            });
          });
          return { ...oldData, pages: updatedPages };
        }
      );

      publishEvent(
        {
          kind: 1222,
          content: audioUrl,
          tags: [
            ["e", rootEventId, "", "root"],
            ["e", message.id, "", "reply"],
            ["p", message.pubkey],
          ],
        },
        {
          onSuccess: async () => {
            // Wait a bit before refreshing to ensure the message is propagated
            setTimeout(async () => {
              try {
                // Get the latest messages
                const events = await nostr.query(
                  [
                    {
                      kinds: [1222],
                      authors: [user.pubkey],
                      since: Math.floor(Date.now() / 1000) - 30, // Last 30 seconds
                    },
                  ],
                  { signal: AbortSignal.timeout(2000) }
                );

                if (events.length > 0) {
                  const realEvent = {
                    ...events[0],
                    replies: [],
                  } as ThreadedNostrEvent;
                  // Update the feed with the real message
                  queryClient.setQueryData<QueryData>(
                    ["voiceMessages", "global"],
                    (oldData) => {
                      if (!oldData) return oldData;
                      const updatedPages = oldData.pages.map((page) => {
                        return page.map((msg) => {
                          if (msg.id === rootEventId) {
                            return {
                              ...msg,
                              replies: (msg.replies || []).map((reply) =>
                                reply.id === tempId ? realEvent : reply
                              ),
                            } as ThreadedNostrEvent;
                          }
                          return msg;
                        });
                      });
                      return { ...oldData, pages: updatedPages };
                    }
                  );

                  queryClient.setQueryData<QueryData>(
                    ["voiceMessages", "following"],
                    (oldData) => {
                      if (!oldData) return oldData;
                      const updatedPages = oldData.pages.map((page) => {
                        return page.map((msg) => {
                          if (msg.id === rootEventId) {
                            return {
                              ...msg,
                              replies: (msg.replies || []).map((reply) =>
                                reply.id === tempId ? realEvent : reply
                              ),
                            } as ThreadedNostrEvent;
                          }
                          return msg;
                        });
                      });
                      return { ...oldData, pages: updatedPages };
                    }
                  );
                }
              } catch (error) {
                console.error("Error updating reply:", error);
              }
            }, 3000);

            handleDiscardRecording();
            setIsReplyDialogOpen(false);
            toast.success("Voice reply published");
          },
        }
      );
    } catch (error) {
      console.error("Error publishing voice reply:", error);
      toast.error("Failed to publish voice reply");
    }
  };

  const handleReaction = async () => {
    if (!user) {
      toast.error("Please log in to react");
      return;
    }

    try {
      if (hasReacted) {
        // Find the user's reaction event
        const userReactions = await nostr.query([
          {
            kinds: [7],
            authors: [user.pubkey],
            "#e": [message.id],
          },
        ]);

        if (userReactions.length > 0) {
          // Delete the reaction
          publishEvent(
            {
              kind: 5,
              content: "",
              tags: [["e", userReactions[0].id]],
            },
            {
              onSuccess: () => {
                setHasReacted(false);
                setReactionCount((prev) => Math.max(0, prev - 1));
                toast.success("Reaction removed");
              },
            }
          );
        }
      } else {
        // Add new reaction
        publishEvent(
          {
            kind: 7,
            content: "+",
            tags: [
              ["e", message.id],
              ["p", message.pubkey],
            ],
          },
          {
            onSuccess: () => {
              setHasReacted(true);
              setReactionCount((prev) => prev + 1);
              toast.success("Reaction sent");
            },
          }
        );
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error("Failed to toggle reaction");
    }
  };

  const handleZap = async () => {
    if (!user) {
      toast.error("Please log in to zap");
      return;
    }

    if (!settings?.nwcConnectionString) {
      toast.error("Please set up Nostr Wallet Connect in settings");
      return;
    }

    try {
      // Get the author's metadata to find their lightning address
      const authorMetadata = await nostr.query([
        {
          kinds: [0],
          authors: [message.pubkey],
        },
      ]);

      const metadata = authorMetadata[0]?.content
        ? JSON.parse(authorMetadata[0].content)
        : null;
      const lightningAddress = metadata?.lud16;

      if (!lightningAddress) {
        toast.error("Author has not set up a lightning address");
        return;
      }

      // Create a zap request event
      const zapRequest = {
        kind: 9734,
        content: "",
        tags: [
          ["p", message.pubkey],
          ["e", message.id],
          ["amount", (settings.defaultZapAmount * 1000).toString()], // Convert to msats
          ["relays", ...Array.from(nostr.relays.keys())],
        ],
      };

      // Publish the zap request
      await publishEvent(zapRequest);

      // Send the actual zap
      await sendZap(lightningAddress, settings.defaultZapAmount);
      setHasZapped(true);

      // Wait a bit for the zap receipt to be published
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query for zap events with a longer timeout
      const zapEvents = await nostr.query(
        [
          {
            kinds: [9734, 9735],
            "#e": [message.id],
          },
        ],
        { signal: AbortSignal.timeout(5000) }
      );

      const totalZaps = zapEvents.reduce((sum, event) => {
        // For zap requests (9734), look for amount in the amount tag
        if (event.kind === 9734) {
          const amountTag = event.tags.find((tag) => tag[0] === "amount")?.[1];
          if (amountTag) {
            const amount = parseInt(amountTag) / 1000; // Convert msats to sats
            return sum + amount;
          }
        }

        // For zap receipts (9735), look for amount in the description tag
        if (event.kind === 9735) {
          const zapReceipt = event.tags.find(
            (tag) => tag[0] === "description"
          )?.[1];
          if (!zapReceipt) return sum;

          try {
            const receipt = JSON.parse(zapReceipt);
            const amount = receipt.amount;
            if (amount) {
              return sum + amount / 1000;
            }
          } catch (e) {
            console.error("Error parsing zap receipt:", e);
          }
        }
        return sum;
      }, 0);

      setZapAmount(Math.round(totalZaps));
    } catch (error) {
      console.error("Error sending zap:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send zap"
      );
    }
  };

  const handleCopyNEVENT = async () => {
    try {
      const nevent = nip19.neventEncode({
        id: message.id,
        author: message.pubkey,
        relays: [],
      });
      await navigator.clipboard.writeText(nevent);
      toast.success("NEVENT copied to clipboard");
    } catch (error) {
      console.error("Error copying NEVENT:", error);
      toast.error("Failed to copy NEVENT");
    }
  };

  const handleShareURL = async () => {
    try {
      const nevent = nip19.neventEncode({
        id: message.id,
        author: message.pubkey,
        relays: [],
      });
      const url = `https://njump.me/${nevent}`;
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch (error) {
      console.error("Error sharing URL:", error);
      toast.error("Failed to share URL");
    }
  };

  const handleDelete = () => {
    if (!user) {
      toast.error("Please log in to delete messages");
      return;
    }

    if (user.pubkey !== message.pubkey) {
      toast.error("You can only delete your own messages");
      return;
    }

    publishEvent(
      {
        kind: 5,
        content: "",
        tags: [["e", message.id]],
      },
      {
        onSuccess: () => {
          // Remove the message from the feed
          queryClient.setQueryData<QueryData>(
            ["voiceMessages", "global"],
            (oldData) => {
              if (!oldData) return oldData;
              const updatedPages = oldData.pages.map((page) =>
                page.filter((msg) => msg.id !== message.id)
              );
              return { ...oldData, pages: updatedPages };
            }
          );

          queryClient.setQueryData<QueryData>(
            ["voiceMessages", "following"],
            (oldData) => {
              if (!oldData) return oldData;
              const updatedPages = oldData.pages.map((page) =>
                page.filter((msg) => msg.id !== message.id)
              );
              return { ...oldData, pages: updatedPages };
            }
          );

          setIsDeleteDialogOpen(false);
          toast.success("Message deleted");
        },
      }
    );
  };

  return (
    <Card className="p-4">
      <div className="flex items-start space-x-4">
        <Link to={`/profile/${npub}`} className="flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link
                to={`/profile/${npub}`}
                className="font-medium hover:underline"
              >
                {displayName}
              </Link>
              <span className="text-sm text-muted-foreground">
                {new Date(message.created_at * 1000).toLocaleString()}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyNEVENT}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy NEVENT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareURL}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share URL
                </DropdownMenuItem>
                {user?.pubkey === message.pubkey && (
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Request
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-2">
            <audio controls className="w-full">
              <source src={message.content} type="video/webm" />
              Your browser does not support the audio element.
            </audio>
          </div>
          <div className="mt-4 flex items-center flex-wrap gap-6">
            <Dialog
              open={isReplyDialogOpen}
              onOpenChange={setIsReplyDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleReply}>
                  <Mic className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Voice Reply to {displayName}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  {!previewUrl ? (
                    <Button
                      onClick={
                        isRecording ? handleStopRecording : handleStartRecording
                      }
                      variant={isRecording ? "destructive" : "default"}
                      className="w-full"
                    >
                      {isRecording ? (
                        <div className="flex flex-col items-center">
                          <MicOff className="mr-2 h-4 w-4" />
                          <span className="text-xs mt-1">
                            {formatTime(recordingTime)}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Record Voice Reply
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <audio controls className="w-full">
                          <source src={previewUrl} type="audio/webm" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handlePublishReply} className="flex-1">
                          <Play className="mr-2 h-4 w-4" />
                          Publish Reply
                        </Button>
                        <Button
                          onClick={handleDiscardRecording}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReaction}
              className={hasReacted ? "text-red-500 hover:text-red-600" : ""}
            >
              <Heart
                className={`h-5 w-5 ${hasReacted ? "fill-current" : ""}`}
              />
              {reactionCount > 0 && (
                <span className="ml-1 text-sm">{reactionCount}</span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZap}>
              <Zap
                className={`h-5 w-5 ${
                  hasZapped ? "text-yellow-500 fill-current" : ""
                }`}
              />
              {zapAmount > 0 && (
                <span className="ml-1 text-sm">
                  {formatZapAmount(Math.round(zapAmount))}
                </span>
              )}
            </Button>
          </div>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Request</DialogTitle>
                <DialogDescription>
                  Are you sure you want to request deletion of this message?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Request Deletion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
