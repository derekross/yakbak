import { LN, SATS } from "@getalby/sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "./useCurrentUser";

const STORAGE_KEY = "yakbak-nwc-settings";

interface NWCSettings {
  nwcConnectionString: string;
  defaultZapAmount: number;
}

function isBolt11(str: string) {
  // Bolt11 invoices start with lnbc or lntb or ln... and are long
  return /^ln(bc|tb|bcrt)[0-9a-z]+$/i.test(str);
}

async function fetchInvoiceFromLightningAddress(
  address: string,
  sats: number
): Promise<string> {
  // address: name@domain.com
  const [name, domain] = address.split("@");
  if (!name || !domain) throw new Error("Invalid lightning address");
  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${name}`;
  const lnurlpRes = await fetch(lnurlpUrl);
  if (!lnurlpRes.ok) throw new Error("Failed to fetch LNURL-pay metadata");
  const lnurlp = await lnurlpRes.json();
  if (!lnurlp.callback) throw new Error("No callback in LNURL-pay metadata");
  // Amount in msats
  const amountMsat = sats * 1000;
  const callbackUrl = `${lnurlp.callback}${
    lnurlp.callback.includes("?") ? "&" : "?"
  }amount=${amountMsat}`;
  const invoiceRes = await fetch(callbackUrl);
  if (!invoiceRes.ok) throw new Error("Failed to fetch invoice from callback");
  const invoiceJson = await invoiceRes.json();
  if (!invoiceJson.pr) throw new Error("No invoice in callback response");
  return invoiceJson.pr;
}

export function useNWC() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["nwc-settings", user?.pubkey],
    queryFn: () => {
      if (!user?.pubkey) return null;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as NWCSettings;
    },
  });

  const saveSettings = (newSettings: NWCSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    // Invalidate the query to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ["nwc-settings", user?.pubkey] });
  };

  const sendZap = async (recipient: string, zapAmount: number) => {
    if (!settings?.nwcConnectionString) {
      toast.error("Please set up Nostr Wallet Connect in settings");
      return;
    }

    try {
      const ln = new LN(settings.nwcConnectionString);
      let invoice = recipient;
      // If not a bolt11 invoice, treat as lightning address and fetch invoice
      if (!isBolt11(recipient)) {
        try {
          invoice = await fetchInvoiceFromLightningAddress(
            recipient,
            zapAmount
          );
        } catch (err) {
          toast.error("Failed to fetch invoice from lightning address");
          return;
        }
      }
      await ln.pay(invoice);
      toast.success(`Sent ${zapAmount} sats!`);
    } catch (error) {
      console.error("Error sending zap:", error);
      toast.error("Failed to send zap");
    }
  };

  return {
    settings,
    saveSettings,
    sendZap,
  };
}
