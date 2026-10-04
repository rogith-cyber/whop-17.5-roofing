import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { whop } from '@whop/cli/vite'
import { whopApi } from './server/whopApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    environments: {
      ssr: {
        build: { outDir: 'dist/server' },
      },
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      react(),
      ...whop(),
      whopApi(),
    ],
  }
})
