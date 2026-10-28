export function isBackendId(id: string) {
  return /^\d+$/.test(id);
}