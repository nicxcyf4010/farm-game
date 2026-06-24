// 应用入口:挂载 App.vue 并按需注册 Element Plus
// 注意:在 GitHub Pages 子路径下必须确保 base 已正确配置(vite.config.js -> base: '/farm-game/')

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')
