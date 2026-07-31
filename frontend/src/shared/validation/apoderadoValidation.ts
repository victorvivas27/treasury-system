export const validateTelefono = (telefono: string): string | null => {
  const normalized = telefono.trim();
  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount > 15) return "El teléfono debe tener máximo 15 dígitos";
  return null;
};
