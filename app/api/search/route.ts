import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { list as listPatients } from "@/lib/services/patient-service";
import { list as listDoctors } from "@/lib/services/doctor-service";
export async function GET(request: Request) { try { const actor = await requireActor(); const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""; if (q.length < 2) return privateJson({ patients: [], doctors: [] }); const [patients, doctors] = await Promise.all([listPatients(actor, q), listDoctors(actor, q)]); return privateJson({ patients: patients.slice(0, 6), doctors: doctors.slice(0, 6) }); } catch (error) { return errorResponse(error); } }
