import './index.css';
import { __ } from './utils/i18n';
(window as any).__ = __;
import { createApp, reactive } from "vue";
import App from "./App.vue";

import router from './router';
import resourceManager from "../../../doppio/libs/resourceManager";
import call from "../../../doppio/libs/controllers/call";
import socket from "../../../doppio/libs/controllers/socket";
import Auth from "../../../doppio/libs/controllers/auth";
import './plugins';

const app = createApp(App);
const auth = reactive(new Auth());

// Plugins
app.use(router);
app.use(resourceManager);

// Global Properties,
// components can inject this
app.provide("$auth", auth);
app.provide("$call", call);
app.provide("$socket", socket);


// Configure route gaurds
router.beforeEach(async (to, from, next) => {
	if (to.matched.some((record) => !record.meta.isLoginPage)) {
		// this route requires auth, check if logged in
		// if not, redirect to login page.
		if (!auth.isLoggedIn) {
			next({ name: 'Login', query: { route: to.path } });
		} else {
			next();
		}
	} else {
		if (auth.isLoggedIn) {
			next({ name: 'Home' });
		} else {
			next();
		}
	}
});

async function loadPlugins() {
	try {
		// Call get_session_state using call controller
		const session = await (call as any)("enhanced_pos.api.pos.get_session_state");
		const jsPlugins = session?.plugins_js || [];
		const cssPlugins = session?.plugins_css || [];

		// Load stylesheets
		for (const href of cssPlugins) {
			if (!document.querySelector(`link[href="${href}"]`)) {
				const link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = href;
				document.head.appendChild(link);
			}
		}

		// Load scripts sequentially to maintain dependency order
		for (const src of jsPlugins) {
			if (!document.querySelector(`script[src="${src}"]`)) {
				await new Promise<void>((resolve) => {
					const script = document.createElement("script");
					script.src = src;
					script.onload = () => resolve();
					script.onerror = () => {
						console.error(`Failed to load plugin script: ${src}`);
						resolve(); // Resolve anyway so we don't break the whole app
					};
					document.head.appendChild(script);
				});
			}
		}
	} catch (e) {
		console.error("Error loading POS plugins:", e);
	}
}

loadPlugins().then(() => {
	app.mount("#app");
});
