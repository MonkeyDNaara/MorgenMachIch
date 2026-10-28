import { describe, expect, it } from "vitest";
import { clientIp, isTrusted, parseIp } from "@/server/auth/clientIp";

describe("parseIp (#309)", () => {
  it("parses IPv4 and IPv6, also in brackets", () => {
    expect(parseIp("1.2.3.4")).toEqual({ family: 4, value: BigInt(0x01020304) });
    expect(parseIp("2001:db8::1")?.family).toBe(6);
    expect(parseIp("[2001:db8::1]")?.family).toBe(6);
    expect(parseIp("::1")).toEqual({ family: 6, value: BigInt(1) });
  });

  it("treats IPv4-mapped IPv6 as IPv4", () => {
    expect(parseIp("::ffff:1.2.3.4")).toEqual({ family: 4, value: BigInt(0x01020304) });
  });

  it("rejects garbage", () => {
    for (const bad of [
      "",
      "1.2.3",
      "256.1.1.1",
      "1::2::3",
      "hello",
      "1:2:3:4:5:6:7:8:9",
      "unknown",
    ]) {
      expect(parseIp(bad)).toBeNull();
    }
  });
});

describe("isTrusted", () => {
  it("knows private and Cloudflare ranges", () => {
    const trusted = [
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "127.0.0.1",
      "162.158.1.1",
      "104.23.255.1",
      "2606:4700::6810:1",
      "fd00::1",
    ];
    for (const ip of trusted) expect(isTrusted(parseIp(ip)!), ip).toBe(true);
    const outside = ["1.2.3.4", "172.32.0.1", "104.32.0.1", "2001:db8::1", "84.150.12.7"];
    for (const ip of outside) expect(isTrusted(parseIp(ip)!), ip).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the rightmost untrusted entry of the Render chain", () => {
    // client → Cloudflare edge → Render's internal load balancer
    expect(clientIp("84.150.12.7, 162.158.90.12, 10.201.3.4")).toBe("84.150.12.7");
  });

  it("ignores a forged leftmost entry", () => {
    expect(clientIp("6.6.6.6, 84.150.12.7, 172.70.1.1, 10.0.0.5")).toBe("84.150.12.7");
  });

  it("works with IPv6 clients", () => {
    expect(clientIp("2001:db8::42, 2606:4700::1, 10.0.0.5")).toBe("2001:db8::42");
  });

  it("falls back to the leftmost entry when every hop is trusted, else 'unknown'", () => {
    expect(clientIp("127.0.0.1, 10.0.0.5")).toBe("127.0.0.1");
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp("garbage, nonsense")).toBe("unknown");
  });
});
