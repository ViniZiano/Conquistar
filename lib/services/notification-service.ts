import type { Actor } from "@/lib/domain/types";

type Appointment = { id: string; title: string; type: string; scope: string; startsAt: string; allDay: boolean; doctorName?: string | null; reason?: string };
export function buildNotifications(actor: Actor, appointments: Appointment[]) {
  const now = Date.now(); const horizon = now + 30 * 86_400_000;
  return appointments.filter((item) => { const time = new Date(item.startsAt).getTime(); return time >= now && time <= horizon; }).filter((item) => {
    const systemEvent = item.scope === "global" || ["Clínica fechada", "Feriado", "Recesso", "Manutenção"].includes(item.type);
    return systemEvent ? actor.notifySystem : actor.notifyAppointments;
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 8).map((item) => {
    const global = item.scope === "global";
    return { id: item.id, kind: global ? "system" : "appointment", title: item.type === "Clínica fechada" ? "Clínica fechada" : item.title, description: global ? (item.reason || "Evento geral da clínica") : `${item.doctorName || "Agenda médica"} · ${item.type}`, startsAt: item.startsAt, allDay: item.allDay };
  });
}
