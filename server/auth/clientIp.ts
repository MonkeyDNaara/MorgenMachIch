import "server-only";

/**
 * The visitor's IP behind Render (#309), for rate limiting. Render's edge
 * (Cloudflare) and its internal load balancer each append the address they
 * saw to `X-Forwarded-For`, but keep whatever the client sent at the start —
 * so the leftmost entry can be forged. Walk the list from the right and skip
 * addresses of trusted networks (private ranges and Cloudflare); the first
 * other one is the client. Lesson from the portfolio project, where counting
 * hops was wrong twice. Pure.
 */

/** Cloudflare's published ranges (cloudflare.com/ips), plus private and loopback ranges. */
export const TRUSTED_NETWORKS = [
  // private, loopback, link-local, carrier-grade NAT
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "100.64.0.0/10",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
  // Cloudflare IPv4
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  // Cloudflare IPv6
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;

type Parsed = { family: 4 | 6; value: bigint };

function parseIpv4(text: string): bigint | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  let value = BigInt(0);
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    value = (value << BigInt(8)) | BigInt(part);
  }
  return value;
}

function parseIpv6(text: string): bigint | null {
  if (!/^[0-9a-f:.]+$/i.test(text) || text.split("::").length > 2) return null;
  let tail = text;
  let ipv4Tail: bigint | null = null;
  // An embedded IPv4 address at the end ("::ffff:1.2.3.4") counts as two groups.
  const lastColon = text.lastIndexOf(":");
  if (text.slice(lastColon + 1).includes(".")) {
    ipv4Tail = parseIpv4(text.slice(lastColon + 1));
    if (ipv4Tail === null) return null;
    tail = `${text.slice(0, lastColon + 1)}0:0`;
  }
  const [head, rest] = tail.split("::");
  const headGroups = head ? head.split(":") : [];
  const restGroups = rest === undefined ? [] : rest ? rest.split(":") : [];
  const missing = 8 - headGroups.length - restGroups.length;
  if (rest === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [
    ...headGroups,
    ...Array<string>(rest === undefined ? 0 : missing).fill("0"),
    ...restGroups,
  ];
  let value = BigInt(0);
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    value = (value << BigInt(16)) | BigInt(`0x${group}`);
  }
  if (ipv4Tail !== null) value = (value & ~BigInt(0xffffffff)) | ipv4Tail;
  return value;
}

/** Parses an IPv4 or IPv6 address; IPv4-mapped IPv6 ("::ffff:1.2.3.4") becomes IPv4. */
export function parseIp(raw: string): Parsed | null {
  const text = raw.trim().replace(/^\[|\]$/g, "");
  const v4 = parseIpv4(text);
  if (v4 !== null) return { family: 4, value: v4 };
  const v6 = parseIpv6(text);
  if (v6 === null) return null;
  if (v6 >> BigInt(32) === BigInt(0xffff)) return { family: 4, value: v6 & BigInt(0xffffffff) };
  return { family: 6, value: v6 };
}

function inNetwork(ip: Parsed, cidr: string): boolean {
  const [base, bitsText] = cidr.split("/");
  const network = parseIp(base);
  if (!network || network.family !== ip.family) return false;
  const width = ip.family === 4 ? BigInt(32) : BigInt(128);
  const shift = width - BigInt(bitsText);
  return ip.value >> shift === network.value >> shift;
}

export function isTrusted(ip: Parsed, networks: readonly string[] = TRUSTED_NETWORKS): boolean {
  return networks.some((cidr) => inNetwork(ip, cidr));
}

/**
 * The client address from `X-Forwarded-For`: the rightmost entry that isn't in
 * a trusted network. When every entry is trusted (a request from inside),
 * the leftmost valid one; "unknown" without a usable header.
 */
export function clientIp(forwardedFor: string | null): string {
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => parseIp(entry) !== null);
  for (let index = entries.length - 1; index >= 0; index--) {
    const parsed = parseIp(entries[index]);
    if (parsed && !isTrusted(parsed)) return entries[index];
  }
  return entries[0] ?? "unknown";
}
