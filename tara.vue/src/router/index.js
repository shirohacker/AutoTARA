import { createWebHistory, createRouter } from 'vue-router'

import MainPageView from '@/views/MainPage.vue'
import DiagramView from '@/views/DiagramView.vue'
import TestComponent from '@/components/TestComponents.vue'
import { useThreatModelStore } from "@/stores/threatModelStore.js";

const routes = [
    { path: '/', component: MainPageView, name: 'MainPage' },
    {
        path: '/edit-diagram/:title',
        component: DiagramView,
        name: 'EditDiagram',
        beforeEnter: (to, from, next) => {
            const tmStore = useThreatModelStore()
            const title = tmStore.data.modelInfo.title

            if (title !== to.params.title || title === '') {
                alert('Error: Threat Model not loaded. Please load a Threat Model first.')
                next({ name: 'MainPage' })
                return
            }

            next()
        }
    },
    { path: '/test', component: TestComponent },    // todo: TEST 라우터 제거 필요
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router