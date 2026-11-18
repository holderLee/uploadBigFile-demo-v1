import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '../views/index/index.vue'
import Demo from '../views/demo/index.vue'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: Index
  },
  {
    path: '/demo',
    name: 'Demo',
    component: Demo
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
