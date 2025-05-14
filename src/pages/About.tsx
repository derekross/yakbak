import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { VERSION } from "@/lib/version";

export function About() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-center">
            About YakBak
          </CardTitle>
          <CardDescription className="text-xl text-center">
            A voice messaging app built on Nostr
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            YakBak is a simple voice messaging app built on the Nostr protocol.
            It allows users to record and share voice messages with their
            friends and followers on the Nostr network.
          </p>

          <h2 className="text-2xl font-semibold mt-6">Features</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Record voice messages up to 60 seconds</li>
            <li>Reply to messages with voice replies</li>
            <li>Follow other users to see their messages</li>
            <li>React to messages with hearts</li>
            <li>Share messages with others</li>
            <li>Zap messages that you like</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">Technology Stack</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>React 18.x</li>
            <li>TailwindCSS 3.x</li>
            <li>Vite</li>
            <li>shadcn/ui</li>
            <li>Nostrify</li>
            <li>React Router</li>
            <li>TanStack Query</li>
            <li>TypeScript</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">Privacy</h2>
          <p className="text-muted-foreground">
            All messages are stored on your preferred Nostr relays and blossom
            servers. Your data is not stored on our servers.
          </p>

          <div className="border-t pt-6 mt-6">
            <h2 className="text-2xl font-semibold">Source Code</h2>
            <p className="text-muted-foreground mt-2">
              YakBak is open source and available on GitHub. Feel free to
              contribute or report issues!
            </p>
            <a
              href="https://github.com/derekross/yakbak"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline mt-2"
            >
              View on GitHub <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              Version: {VERSION}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
