const common_site_config = require('../../../sites/common_site_config.json');
const { webserver_port } = common_site_config;

function resolveSiteName(req: { headers: Record<string, string | undefined> }) {
	const envSite = process.env.FRAPPE_SITE || process.env.VITE_FRAPPE_SITE_NAME;
	if (envSite) {
		return envSite;
	}

	const hostHeader = req.headers.host || '';
	const host = hostHeader.split(':')[0];
	const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

	if (isLocalHost && common_site_config.default_site) {
		return common_site_config.default_site;
	}

	return host;
}

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://127.0.0.1:${webserver_port}`,
		ws: true,
		changeOrigin: true,
		router: function(req) {
			const site_name = resolveSiteName(req);
			return `http://${site_name}:${webserver_port}`;
		}
	}
};
