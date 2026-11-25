/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_YONGJIN_1: string
  readonly VITE_API_YONGJIN_2: string
  readonly VITE_API_YONGJIN_3: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

declare const __APP_BUILD_ID__: string;