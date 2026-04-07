import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/analysis/new',
      name: 'analysis-new',
      component: () => import('@/views/NewAnalysisView.vue')
    },
    {
      path: '/analysis/review',
      name: 'analysis-review',
      component: () => import('@/views/ReviewView.vue')
    },
    {
      path: '/analysis/recommendation',
      name: 'analysis-recommendation',
      component: () => import('@/views/RecommendationView.vue')
    },
    {
      path: '/analysis/export',
      name: 'analysis-export',
      component: () => import('@/views/ExportView.vue')
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
