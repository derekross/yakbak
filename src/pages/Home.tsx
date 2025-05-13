import { VoiceMessageFeed } from "@/components/VoiceMessageFeed";
import { VoiceMessageFab } from "@/components/VoiceMessageFab";

export function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <VoiceMessageFeed />
      <VoiceMessageFab />
    </div>
  );
}
