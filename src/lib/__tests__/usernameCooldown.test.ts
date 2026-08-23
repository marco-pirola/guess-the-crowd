import { describe, expect, it } from "vitest";
import { USERNAME_COOLDOWN_MS, usernameCooldownStatus } from "@/lib/usernameCooldown";

describe("usernameCooldownStatus", () => {
  it("allows an immediate free change when never manually set before", () => {
    const status = usernameCooldownStatus(null);
    expect(status.canChangeUsername).toBe(true);
    expect(status.usernameAvailableAt).toBeNull();
  });

  it("blocks a change made moments after the last one", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const changedAt = new Date("2026-05-31T23:00:00.000Z").toISOString();
    const status = usernameCooldownStatus(changedAt, now);
    expect(status.canChangeUsername).toBe(false);
    expect(status.usernameAvailableAt).toBe(
      new Date(Date.parse(changedAt) + USERNAME_COOLDOWN_MS).toISOString()
    );
  });

  it("blocks a change 29 days later", () => {
    const changedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date(changedAt.getTime() + 29 * 24 * 60 * 60 * 1000);
    expect(usernameCooldownStatus(changedAt.toISOString(), now).canChangeUsername).toBe(false);
  });

  it("allows a change exactly 30 days later", () => {
    const changedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date(changedAt.getTime() + USERNAME_COOLDOWN_MS);
    expect(usernameCooldownStatus(changedAt.toISOString(), now).canChangeUsername).toBe(true);
  });

  it("allows a change well after 30 days", () => {
    const changedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date(changedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
    expect(usernameCooldownStatus(changedAt.toISOString(), now).canChangeUsername).toBe(true);
  });
});
