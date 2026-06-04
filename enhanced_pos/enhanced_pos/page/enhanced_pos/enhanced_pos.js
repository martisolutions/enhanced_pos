frappe.pages["enhanced-pos"].on_page_load = function (wrapper) {
	// Redirect to the standalone POS Vue SPA route
	window.location.href = "/pos";
};
