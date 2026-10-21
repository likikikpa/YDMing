/**
 * Worlds live in the browser, which can clear them without warning. A world
 * that has changed since its last file copy gets a reminder once the copy is
 * old enough; a world never copied gets one after a day.
 */
const DAY = 86_400_000;

export interface BackupRecord {
  /** When this browser first saw the world. */
  firstSeen: string;
  /** When the world was last saved to a file. */
  lastBackup?: string;
}

/** Whether to remind: edits exist that no file copy holds, and the copy (or the world) is old. */
export function backupDue(
  updatedAt: string,
  record: BackupRecord,
  now: number,
): boolean {
  const since = Date.parse(record.lastBackup ?? record.firstSeen);
  // An unreadable date compares false either way, so it never nags.
  return (
    Date.parse(updatedAt) > since &&
    now - since >= (record.lastBackup ? 3 * DAY : DAY)
  );
}

const keyOf = (worldId: string) => `ydming-backup-${worldId}`;

/** The record for a world; it starts when the world is first looked up. */
export function readBackup(worldId: string, now = Date.now()): BackupRecord {
  try {
    const saved = JSON.parse(localStorage.getItem(keyOf(worldId)) || "null");
    if (saved && typeof saved.firstSeen === "string") return saved;
    const fresh: BackupRecord = { firstSeen: new Date(now).toISOString() };
    localStorage.setItem(keyOf(worldId), JSON.stringify(fresh));
    return fresh;
  } catch {
    // Without storage nothing can be remembered, so there is nothing to remind about.
    return { firstSeen: new Date(now).toISOString() };
  }
}

/** Notes that the world was just saved to a file. */
export function markBackup(worldId: string, now = Date.now()) {
  try {
    const record = readBackup(worldId, now);
    localStorage.setItem(
      keyOf(worldId),
      JSON.stringify({ ...record, lastBackup: new Date(now).toISOString() }),
    );
  } catch {
    // The file was still saved.
  }
}
