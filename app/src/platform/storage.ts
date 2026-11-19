export const PROFILE_KEY = 'cat-tower.profile.v1';

/** Small injectable boundary over localStorage so exceptions stay explicit. */
export interface StorageAdapter {
  read(): string | null;
  write(value: string): void;
}

export function browserStorageAdapter(): StorageAdapter {
  return {
    read: () => window.localStorage.getItem(PROFILE_KEY),
    write: (value: string) => window.localStorage.setItem(PROFILE_KEY, value)
  };
}
