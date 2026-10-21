import { describe, expect, it } from "vitest";
import { backupDue } from "./backup";

const DAY = 86_400_000;
const at = (days: number) => new Date(days * DAY).toISOString();

describe("backup reminder", () => {
  it("waits a day before nagging about a world never saved to a file", () => {
    const record = { firstSeen: at(0) };
    expect(backupDue(at(0.5), record, 0.9 * DAY)).toBe(false);
    expect(backupDue(at(0.5), record, 1.1 * DAY)).toBe(true);
  });

  it("stays quiet when nothing changed since the last file copy", () => {
    const record = { firstSeen: at(0), lastBackup: at(5) };
    expect(backupDue(at(4), record, 30 * DAY)).toBe(false);
    expect(backupDue(at(5), record, 30 * DAY)).toBe(false);
  });

  it("asks again three days after the last file copy if the world changed", () => {
    const record = { firstSeen: at(0), lastBackup: at(5) };
    expect(backupDue(at(6), record, 7 * DAY)).toBe(false);
    expect(backupDue(at(6), record, 8.1 * DAY)).toBe(true);
  });

  it("stays quiet when a date cannot be read", () => {
    expect(backupDue("nonsense", { firstSeen: at(0) }, 10 * DAY)).toBe(false);
    expect(backupDue(at(1), { firstSeen: "nonsense" }, 10 * DAY)).toBe(false);
  });
});
