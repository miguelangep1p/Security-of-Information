import "server-only";
import { audit } from "@/lib/server/audit";
import { actorOf, sessionRef, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import type { ActivityItem, SecurityOverview } from "@/lib/types";

export async function listMyActivity(session: ServerSession, limit = 6): Promise<ActivityItem[]> {
  const rows = await sql`
    select id::text, action, resource_ref, result, occurred_at
    from audit_events
    where actor_id = ${session.userId}
    order by occurred_at desc, id desc
    limit ${limit}`;
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    resource: row.resource_ref,
    result: row.result,
    occurredAt: row.occurred_at,
  }));
}

export async function getSecurityOverview(session: ServerSession): Promise<SecurityOverview> {
  const [sessions, passkeys, activity] = await Promise.all([
    sql`
      select id, auth_method, host(ip) as ip, user_agent, created_at, last_seen_at
      from sessions
      where user_id = ${session.userId} and revoked_at is null and expires_at > now()
      order by last_seen_at desc`,
    sql`
      select id, device_label, created_at, last_used_at
      from passkeys where user_id = ${session.userId}
      order by created_at desc`,
    listMyActivity(session, 8),
  ]);

  return {
    sessions: sessions.map((row) => ({
      id: row.id,
      current: row.id === session.sessionId,
      authMethod: row.auth_method,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
    })),
    passkeys: passkeys.map((row) => ({
      id: row.id,
      deviceLabel: row.device_label,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    })),
    activity,
  };
}

export async function revokeOtherSessions(session: ServerSession) {
  return transaction(async (tx) => {
    const revoked = await tx`
      update sessions set revoked_at = now()
      where user_id = ${session.userId} and id <> ${session.sessionId} and revoked_at is null
      returning id`;
    await audit(tx, actorOf(session), {
      action: "SESSIONS_REVOKE",
      resourceType: "session",
      resourceRef: sessionRef(session.sessionId),
      result: "ALLOW",
      metadata: { revoked: revoked.length },
    });
    return { revoked: revoked.length };
  });
}
