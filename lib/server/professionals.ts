import "server-only";
import { audit } from "@/lib/server/audit";
import { actorOf, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type { Institution, Professional, Role, RoleDefinition } from "@/lib/types";

export async function listProfessionals(): Promise<Professional[]> {
  const rows = await sql`
    select v.id, v.user_id, u.email, v.name, v.cmp, v.institution, v.role, v.status
    from professionals_view v
    join users u on u.id = v.user_id
    order by v.status = 'Habilitado', v.name`;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    cmp: row.cmp,
    institution: row.institution,
    role: row.role,
    status: row.status,
  }));
}

export async function listInstitutions(): Promise<Institution[]> {
  const rows = await sql`select id, name from institutions order by name`;
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export async function listRoles(): Promise<RoleDefinition[]> {
  const rows = await sql`
    select r.code, r.label, r.description,
           coalesce(array_agg(rp.permission) filter (where rp.permission is not null), '{}') as permissions
    from roles r
    left join role_permissions rp on rp.role = r.code
    group by r.code
    order by r.code`;
  return rows.map((row) => {
    const granted = new Set<string>(row.permissions);
    return {
      role: row.code,
      label: row.label,
      description: row.description,
      permissions: {
        reviewClinical: granted.has("reviewClinical"),
        approveClinical: granted.has("approveClinical"),
        digitize: granted.has("digitize"),
        viewAudit: granted.has("viewAudit"),
        manageUsers: granted.has("manageUsers"),
      },
    };
  });
}

// "Carlos Mendoza Salazar" → "Carlos Mendoza"; con cuatro palabras toma nombre y primer apellido.
export function shortNameOf(fullName: string) {
  const words = fullName.trim().split(/\s+/);
  if (words.length >= 4) return `${words[0]} ${words[2]}`;
  return words.slice(0, 2).join(" ");
}

export type NewProfessional = {
  fullName: string;
  email: string;
  cmp?: string;
  institutionId: string;
  role: Role;
};

export async function createProfessional(session: ServerSession, input: NewProfessional) {
  const email = input.email.trim().toLowerCase();
  const [institution] = await sql`select name, email_domain from institutions where id = ${input.institutionId}`;
  if (!institution) throw new ApiError(422, "La institución no existe.");
  if (institution.email_domain && !email.endsWith(`@${institution.email_domain}`)) {
    throw new ApiError(422, `El correo debe pertenecer al dominio @${institution.email_domain}.`);
  }

  return transaction(async (tx) => {
    const [user] = await tx`
      insert into users (full_name, short_name, email)
      values (${input.fullName.trim()}, ${shortNameOf(input.fullName)}, ${email})
      returning id`;
    if (input.cmp) {
      await tx`insert into professional_profiles (user_id, cmp) values (${user!.id}, ${input.cmp})`;
    }
    const [membership] = await tx`
      insert into memberships (user_id, institution_id, role)
      values (${user!.id}, ${input.institutionId}, ${input.role})
      returning id`;
    await audit(tx, actorOf(session), {
      action: "PROFESSIONAL_CREATE",
      resourceType: "membership",
      resourceRef: email,
      result: "ALLOW",
      metadata: { membershipId: membership!.id, role: input.role, institution: institution.name },
    });
    return { id: membership!.id as string };
  });
}

export async function updateProfessional(
  session: ServerSession,
  membershipId: string,
  patch: { role?: Role; status?: "Habilitado" | "Suspendido" },
) {
  const [membership] = await sql`
    select m.user_id, m.role, m.status, u.email
    from memberships m join users u on u.id = m.user_id
    where m.id = ${membershipId}`;
  if (!membership) throw new ApiError(404, "Profesional no encontrado.");
  if (membership.user_id === session.userId) {
    throw new ApiError(403, "No puedes modificar tu propio rol ni tu estado.");
  }

  await transaction(async (tx) => {
    const actor = actorOf(session);
    if (patch.role && patch.role !== membership.role) {
      await tx`update memberships set role = ${patch.role} where id = ${membershipId}`;
      await audit(tx, actor, {
        action: "ROLE_CHANGE",
        resourceType: "membership",
        resourceRef: membership.email,
        result: "ALLOW",
        metadata: { from: membership.role, to: patch.role },
      });
    }
    if (patch.status && patch.status !== membership.status) {
      if (patch.status === "Habilitado") {
        await tx`
          update memberships set status = 'Habilitado', approved_by = ${session.userId}, approved_at = now()
          where id = ${membershipId}`;
      } else {
        await tx`update memberships set status = 'Suspendido' where id = ${membershipId}`;
        await tx`update sessions set revoked_at = now() where membership_id = ${membershipId} and revoked_at is null`;
      }
      await audit(tx, actor, {
        action: patch.status === "Habilitado" ? "MEMBERSHIP_APPROVE" : "MEMBERSHIP_SUSPEND",
        resourceType: "membership",
        resourceRef: membership.email,
        result: "ALLOW",
        metadata: { from: membership.status, to: patch.status },
      });
    }
  });
}
