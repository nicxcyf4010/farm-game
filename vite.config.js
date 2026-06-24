import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 部署在子路径 /farm-game/ 下,
// 所有静态资源(js / css / 静态图片)的引用会基于此 base 自动调整。
// 同时通过 publicDir 把 public/ 目录原样拷贝(其中 /bgm.mp3 用绝对路径引用,与 base 无关)。
export default defineConfig({
  // 部署到 https://<user>.github.io/farm-game/ 时必须设为 '/farm-game/'
  base: '/farm-game/',
  plugins: [vue()],
  server: {
    port: 5173,
    open: true
  },
  // 资源打包目录(GitHub Pages 默认即可)
  // 备注:vite v8 默认打包器 rolldown 要求 manualChunks 必须是函数,本项目体量小,
  //      不强制拆 chunk,若需拆分请改写为函数式 manualChunks(id) {...}
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
