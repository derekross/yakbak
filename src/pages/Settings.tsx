import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNWC } from "@/hooks/useNWC";

interface NWCSettings {
  nwcConnectionString: string;
  defaultZapAmount: string;
}

export function Settings() {
  const { user } = useCurrentUser();
  const { settings, saveSettings } = useNWC();
  const [nwcConnectionString, setNwcConnectionString] = useState("");
  const [defaultZapAmount, setDefaultZapAmount] = useState("");

  // Load settings when they change
  useEffect(() => {
    if (settings) {
      setNwcConnectionString(settings.nwcConnectionString);
      setDefaultZapAmount(settings.defaultZapAmount);
    }
  }, [settings]);

  const handleSave = () => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }

    const newSettings: NWCSettings = {
      nwcConnectionString,
      defaultZapAmount,
    };

    saveSettings(newSettings);
    toast.success("Settings saved successfully");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">Please log in to access settings</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Nostr Wallet Connect</h2>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to enable zaps. Get your connection string from{" "}
            <a
              href="https://nwc.getalby.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Alby
            </a>
            .
          </p>

          <div className="space-y-2">
            <Label htmlFor="nwc">Connection String</Label>
            <Input
              id="nwc"
              value={nwcConnectionString}
              onChange={(e) => setNwcConnectionString(e.target.value)}
              placeholder="nostr+walletconnect://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zap-amount">Default Zap Amount (sats)</Label>
            <Input
              id="zap-amount"
              type="number"
              value={defaultZapAmount}
              onChange={(e) => setDefaultZapAmount(e.target.value)}
              placeholder="1000"
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
