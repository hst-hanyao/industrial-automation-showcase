export function createDraftStorage(getStorage: () => Storage, maintenance: boolean): {
  read(key: string): string | null
  write(key: string, value: string): void
}
