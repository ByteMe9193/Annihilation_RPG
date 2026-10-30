const gmPassword = process.env.EXPO_PUBLIC_GM_PASSWORD;

export function isGmPasswordValid(input: string): boolean {
  if (!gmPassword || !gmPassword.trim()) {
    console.error("EXPO_PUBLIC_GM_PASSWORD não configurada.");
    return false;
  }

  return input.trim() === gmPassword;
}
