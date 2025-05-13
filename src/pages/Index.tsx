// Update this page (the content is just a fallback if you fail to update the page)

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceMessageFeed } from "@/components/VoiceMessageFeed";
import { VoiceMessageFab } from "@/components/VoiceMessageFab";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Card className="w-full max-w-2xl mx-4 mt-4">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-center">
            Welcome to YakBak!
          </CardTitle>
          <CardDescription className="text-xl text-center">
            YakBak is a simple voice messaging app built on Nostr.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Record and share voice messages with your friends and followers on
            the Nostr network. All messages are stored on your preferred relays
            and preferred blossom servers.
          </p>
          <p className="text-muted-foreground">Features:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Record voice messages up to 60 seconds</li>
            <li>Reply to messages with voice replies</li>
            <li>Follow other users to see their messages</li>
            <li>React to messages with hearts</li>
            <li>Share messages with others</li>
            <li>Zap messages that you like</li>
          </ul>
        </CardContent>
      </Card>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <VoiceMessageFeed />
        <VoiceMessageFab />
      </div>
    </div>
  );
};

export default Index;
