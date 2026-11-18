import type { Actor, Permission, Role } from "@/lib/domain/types";

const permissions: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(["dashboard.read", "patients.read", "patients.write", "patients.manageStatus", "doctors.read", "doctors.manage", "agenda.read", "agenda.write", "users.manage", "audit.read"]),
  doctor: new Set(["dashboard.read", "patients.read", "clinical.read", "clinical.write", "doctors.read", "agenda.read", "agenda.write"]),
  reception: new Set(["dashboard.read", "patients.read", "patients.write", "doctors.read", "agenda.read", "agenda.write"]),
};
export function can(actor: Actor, permission: Permission) {
  if (!actor.active || !permissions[actor.role].has(permission)) return false;
  if (actor.role === "doctor" && !actor.doctorId && ["clinical.read", "clinical.write", "agenda.write"].includes(permission)) return false;
  return true;
}
export function assertPermission(actor: Actor, permission: Permission) { if (!can(actor, permission)) throw new AccessError("Você não tem permissão para realizar esta ação."); }
export class AccessError extends Error { status = 403; }
