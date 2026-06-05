/**
 * i18n.ts — Centralized translation utility for Enhanced POS.
 *
 * Wraps Frappe's global `__()` function with a type-safe interface.
 * All Vue components and composables should import from here instead
 * of redefining the function locally.
 *
 * Usage:
 *   import { __ } from '../utils/i18n';
 *   const label = __('Carrito');
 *   const msg   = __('Hola, {0}!', ['Juan']);
 */

/**
 * Translates a string using Frappe's translation engine.
 *
 * @param text  - The source string (in the app's base language)
 * @param args  - Optional array of positional arguments for `{0}`, `{1}` placeholders
 * @param lang  - Optional language code override (defaults to current session language)
 * @returns     The translated string, or the original if no translation is found
 */
export function __(text: string, args?: any[], lang?: string): string {
	const translations = (window as any).__translations || {};
	let translated = translations[text];

	if (!translated) {
		const frappe = (window as any).frappe;
		if (frappe?.__) {
			return frappe.__(text, args, lang);
		}
		translated = text;
	}

	if (args?.length) {
		translated = translated.replace(/\{(\d+)\}/g, (_: string, i: string) => String(args[Number(i)] ?? ''));
	}
	return translated;
}

/**
 * Returns the current UI language code (e.g. "es", "en", "de").
 * Useful for conditional locale-specific formatting.
 */
export function getCurrentLang(): string {
	return (window as any).frappe?.boot?.lang || navigator.language.split('-')[0] || 'en';
}
