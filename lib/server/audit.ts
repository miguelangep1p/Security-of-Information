import "server-only";
import { sql, type Sql } from "@/lib/server/db";
import type { AuditEvent, AuditResult } from "@/lib/types";

export type AuthMethod = "WebAuthn" | "EmailOTP" | "Sistema";

export type Actor = {
  userId: string | null;
  cmp: string | null;
  sessionId: string | null;
  authMethod: AuthMethod;
  ip: string | null;
  riskScore: number;
};

export type AuditEntry = {
  action: string;
  resourceType: string;
  resourceRef: string;
  result: AuditResult;
  riskScore?: number;
  metadata?: Record<string, unknown>;
};

// Acepta `sql` o el `tx` de una transacción, para que el evento se confirme junto con la operación.
export function audit(db: Sql, actor: Actor, entry: AuditEntry) {
  return db`
    insert into audit_events (actor_id, actor_cmp, session_id, action, resource_type, resource_ref,
                              result, risk_score, auth_method, ip, metadata)
    values (${actor.userId}, ${actor.cmp}, ${actor.sessionId}, ${entry.action}, ${entry.resourceType},
            ${entry.resourceRef}, ${entry.result}, ${entry.riskScore ?? actor.riskScore},
            ${actor.authMethod}, ${actor.ip}, ${JSON.stringify(entry.metadata ?? {})})
    returning id::text`;
}

export type AuditFilters = { user?: string; action?: string; result?: AuditResult };

export async function listAuditEvents(filters: AuditFilters) {
  const user = filters.user ?? null;
  const action = filters.action ?? null;
  const result = filters.result ?? null;
  const [events, [options]] = await Promise.all([
    sql`
      select id::text, occurred_at, "user", action, resource, result, cmp, risk_score, auth, host(ip) as ip
      from audit_events_view
      where (${user}::text is null or "user" = ${user}::text)
        and (${action}::text is null or action = ${action}::text)
        and (${result}::audit_result is null or result = ${result}::audit_result)
      order by occurred_at desc, id desc
      limit 200`,
    sql`
      select array(select distinct "user" from audit_events_view order by 1) as users,
             array(select distinct action from audit_events_view order by 1) as actions`,
  ]);

  return {
    events: events.map(
      (row): AuditEvent => ({
        id: row.id,
        time: row.occurred_at,
        user: row.user,
        action: row.action,
        resource: row.resource,
        result: row.result,
        cmp: row.cmp ?? undefined,
        riskScore: row.risk_score,
        auth: row.auth,
        ip: row.ip ?? "—",
      }),
    ),
    filters: { users: options.users as string[], actions: options.actions as string[] },
  };
}
