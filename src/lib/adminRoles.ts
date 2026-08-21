export function mapAdminRoleError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("forbidden")) {
    return "No tenés permiso para gestionar administradores";
  }
  if (m.includes("last_admin")) {
    return "Tiene que quedar al menos un administrador";
  }
  if (m.includes("cannot_revoke_self")) {
    return "No podés quitarte el rol de administrador a vos mismo";
  }
  if (m.includes("profile_not_found") || m.includes("invalid_user")) {
    return "No encontramos ese usuario";
  }
  return "No se pudo actualizar el rol de administrador";
}
