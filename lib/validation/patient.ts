import { ValidationError } from "@/lib/http/errors";
import { boolValue, digits, required, textValue, validBirthDate } from "./common";

export function validatePatient(input: Record<string, unknown>) {
  const cpf = digits(input.cpf); const phone = digits(input.phone);
  if (cpf.length !== 11) throw new ValidationError("CPF deve conter 11 números.");
  if (phone.length < 10 || phone.length > 11) throw new ValidationError("Telefone deve conter 10 ou 11 números.");
  return { fullName: required(input.fullName, "Nome"), cpf, phone, birthDate: validBirthDate(input.birthDate), sex: textValue(input.sex) || "Não informado", address: textValue(input.address), email: textValue(input.email).toLowerCase(), emergencyContact: textValue(input.emergencyContact), administrativeNotes: textValue(input.administrativeNotes), active: boolValue(input.active) };
}
