// 标准 Vue Router Hash 模式配置(供未来接入路由时使用)
// 当前项目是纯单页结构,未在 main.js 引入 vue-router,此文件作为标准模板兜底。
// 若日后引入路由,只需:
//   1) npm install vue-router@4
//   2) 在 main.js 中 import router from './router' 并 app.use(router)
// 即可使用 hash 模式,刷新不会出现 404。
//
// 本项目 github pages 部署在 https://nicxcyf4010.github.io/farm-game/ 子路径,
// 强制使用 createWebHashHistory() 而非 createWebHistory(),避免刷新 404。

import { createRouter, createWebHashHistory } from 'vue-router'

// 路由表(示例,后续可按需扩展)
const routes = [
  {
    path: '/',
    name: 'home',
    // 当前单页项目,直接指向 App.vue
    component: () => import('../App.vue')
  }
  // 后续可在此追加:
  // { path: '/farm', name: 'farm', component: () => import('../views/Farm.vue') },
  // { path: '/tech', name: 'tech', component: () => import('../views/Tech.vue') }
]

const router = createRouter({
  // 强制 Hash 模式 —— 关键!子路径部署必须用 hash,否则刷新即 404
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  // 路由切换时滚动到顶部
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
