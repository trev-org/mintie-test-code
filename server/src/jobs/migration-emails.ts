// MIN-16: send migration prompts at T-30, T-7, T-1 days from password sunset.
// Per-user unsubscribe is NOT allowed (security comms, not marketing).
// Copy reviewed by @support and @legal before send.
import type { OrgId, UserId } from '@shared/types';

const OFFSETS_DAYS = [30, 7, 1] as const;

export async function enqueueMigrationEmails(_org: { id: OrgId; sunsetAt: Date }) {
  for (const days of OFFSETS_DAYS) {
    void days;
    // schedule per-user email at sunsetAt - days
  }
}

export async function sendMigrationEmail(_user: { id: UserId; email: string }, _daysOut: number) {
  // respect transactional email rate limits
}
