import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import authRoutes from './auth';

const routes = [
  {
	path: "/",
	name: "Home",
	component: Home,
  },
  {
	path: "/desk",
	redirect: "/",
  },
  {
	path: "/desk/:pathMatch(.*)*",
	redirect: "/",
  },
  ...authRoutes,
  {
	path: "/:pathMatch(.*)*",
	redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory("/pos"),
  routes,
});

export default router;
