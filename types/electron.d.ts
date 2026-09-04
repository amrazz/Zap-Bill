export {};

declare global {
  interface Window {
    electronAPI?: {
      saveBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
      restoreBackup: () => Promise<{ success: boolean; error?: string }>;
      printReceipt: (html: string, widthMm?: number) => Promise<{ success: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
    };
  }
}
