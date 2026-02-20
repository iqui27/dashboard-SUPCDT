/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_SHEETS_API_KEY?: string;
    readonly VITE_GOOGLE_SHEET_ID?: string;
    readonly VITE_GOOGLE_SHEETS_RANGE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
