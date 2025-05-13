import { NostrEvent, NostrFilter } from "@nostrify/nostrify";
import { nip19 } from "nostr-tools";

interface BlossomServer {
  url: string;
  pubkey: string;
}

interface BlobDescriptor {
  url: string;
  sha256: string;
  size: number;
  type?: string;
  uploaded: number;
}

// Default blossom server - you can replace this with your preferred server
const DEFAULT_BLOSSOM_SERVER: BlossomServer = {
  url: "https://blossom.band",
  pubkey: "npub1blossomserver",
};

function isValidUrl(url: string): boolean {
  try {
    // Fix common URL issues
    let fixedUrl = url;
    if (url.includes("/net/")) {
      fixedUrl = url.replace("/net/", ".net/");
    }

    new URL(fixedUrl);
    return true;
  } catch {
    return false;
  }
}

function fixUrl(url: string): string {
  if (url.includes("/net/")) {
    return url.replace("/net/", ".net/");
  }
  return url;
}

async function calculateSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createAuthorizationEvent(
  verb: "get" | "upload" | "list" | "delete",
  content: string,
  pubkey: string,
  signer: { signEvent: (event: Partial<NostrEvent>) => Promise<NostrEvent> },
  sha256?: string,
  expirationHours: number = 24
): Promise<NostrEvent> {
  const now = Math.floor(Date.now() / 1000);
  const tags = [
    ["t", verb],
    ["expiration", (now + expirationHours * 3600).toString()],
  ];

  // Add SHA256 tag for upload and delete operations
  if (sha256 && (verb === "upload" || verb === "delete")) {
    tags.push(["x", sha256]);
  }

  const event = await signer.signEvent({
    kind: 24242,
    content,
    tags,
    created_at: now,
    pubkey,
  });

  // Debug log the event
  console.log("Authorization event:", JSON.stringify(event, null, 2));
  return event;
}

export async function uploadToBlossom(
  blob: Blob,
  servers: BlossomServer[] = [DEFAULT_BLOSSOM_SERVER],
  userPubkey?: string,
  signer?: { signEvent: (event: Partial<NostrEvent>) => Promise<NostrEvent> }
): Promise<string> {
  // Filter out invalid URLs and ensure we have at least one valid server
  const validServers = servers
    .map((server) => ({
      ...server,
      url: fixUrl(server.url),
    }))
    .filter((server) => isValidUrl(server.url));

  if (validServers.length === 0) {
    throw new Error("No valid blossom servers available");
  }

  if (!userPubkey) {
    throw new Error("User pubkey is required for upload authorization");
  }

  if (!signer) {
    throw new Error("Signer is required for upload authorization");
  }

  // Calculate SHA256 hash of the blob
  const sha256 = await calculateSHA256(blob);
  console.log("Blob SHA256:", sha256);

  // Create and sign the authorization event
  const authEvent = await createAuthorizationEvent(
    "upload",
    `Upload voice-message.webm`,
    userPubkey,
    signer,
    sha256
  );

  // Base64 encode the authorization event
  const authHeader = `Nostr ${btoa(JSON.stringify(authEvent))}`;
  console.log("Authorization header:", authHeader);

  // Try each server in sequence until one succeeds
  for (const server of validServers) {
    try {
      const uploadUrl = new URL("/upload", server.url).toString();
      console.log("Attempting upload to:", uploadUrl);

      // Upload the blob
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": blob.type,
          "Content-Length": blob.size.toString(),
          Accept: "application/json",
          Authorization: authHeader,
          Origin: window.location.origin,
        },
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        const reason = response.headers.get("X-Reason");
        console.log(
          `Upload failed with status ${response.status}${
            reason ? ` - ${reason}` : ""
          } for ${uploadUrl}`
        );
        // Try to get more error details
        try {
          const errorData = await response.text();
          console.log("Error response:", errorData);
        } catch (e) {
          console.log("Could not read error response");
        }
        continue; // Try next server
      }

      const data: BlobDescriptor = await response.json();

      if (!data.url) {
        console.log("No URL returned from server for", uploadUrl);
        continue; // Try next server
      }

      // Verify the SHA256 matches
      if (data.sha256 !== sha256) {
        console.log("Server returned different SHA256 hash:", data.sha256);
        continue; // Try next server
      }

      return data.url;
    } catch (error) {
      console.error(`Failed to upload to ${server.url}:`, error);
      continue; // Try next server
    }
  }

  throw new Error("All blossom servers failed");
}

export async function getBlossomServers(
  nostr: { query: (filters: NostrFilter[]) => Promise<NostrEvent[]> },
  pubkey?: string
): Promise<BlossomServer[]> {
  try {
    if (!pubkey) {
      console.log(
        "No pubkey provided, using default server:",
        DEFAULT_BLOSSOM_SERVER.url
      );
      return [DEFAULT_BLOSSOM_SERVER];
    }

    // Query for blossom server events (kind 10063)
    const blossomEvents = await nostr.query([
      {
        kinds: [10063],
        authors: [pubkey],
        limit: 10,
      },
    ]);

    console.log("Found blossom events:", blossomEvents); // Debug log

    // If no blossom servers are found, return the default server
    if (!blossomEvents.length) {
      console.log(
        "No blossom servers found, using default server:",
        DEFAULT_BLOSSOM_SERVER.url
      );
      return [DEFAULT_BLOSSOM_SERVER];
    }

    // Extract server URLs from the 'server' tags and fix any malformed URLs
    const servers = blossomEvents
      .flatMap((event: NostrEvent) =>
        event.tags
          .filter((tag) => tag[0] === "server")
          .map((tag) => ({
            url: fixUrl(tag[1]),
            pubkey: event.pubkey,
          }))
      )
      .filter((server) => isValidUrl(server.url));

    // If no valid servers were found, use the default
    if (servers.length === 0) {
      console.log(
        "No valid blossom servers found in events, using default server:",
        DEFAULT_BLOSSOM_SERVER.url
      );
      return [DEFAULT_BLOSSOM_SERVER];
    }

    console.log(
      "Found blossom servers:",
      servers.map((s) => s.url)
    );
    return servers;
  } catch (error) {
    console.error("Error fetching blossom servers:", error);
    // Return default server if query fails
    return [DEFAULT_BLOSSOM_SERVER];
  }
}
