/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_CARD_URL: string
    readonly VITE_API_VOUCHER_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

