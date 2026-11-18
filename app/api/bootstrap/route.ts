import { requireActor } from "@/lib/auth/actor";
import { can } from "@/lib/auth/permissions";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { getDashboard } from "@/lib/services/dashboard-service";
import { list as listDoctors } from "@/lib/services/doctor-service";
import { list as listPatients } from "@/lib/services/patient-service";
import { list as listUsers } from "@/lib/services/user-service";
import { list as listAgenda } from "@/lib/services/agenda-service";
import { buildNotifications } from "@/lib/services/notification-service";

export async function GET() {
  try {
    const actor = await requireActor();
    const [dashboard, patients, doctors, appointments, users] = await Promise.all([
      getDashboard(actor), listPatients(actor), listDoctors(actor), listAgenda(actor), can(actor, "users.manage") ? listUsers(actor) : Promise.resolve([]),
    ]);
    return privateJson({ actor, permissions: { clinicalRead: can(actor, "clinical.read"), clinicalWrite: can(actor, "clinical.write"), patientWrite: can(actor, "patients.write"), patientManage: can(actor, "patients.manageStatus"), doctorManage: can(actor, "doctors.manage"), userManage: can(actor, "users.manage"), auditRead: can(actor, "audit.read") }, dashboard, patients, doctors, appointments, notifications: buildNotifications(actor, appointments as never[]), users });
  } catch (error) { return errorResponse(error); }
}
