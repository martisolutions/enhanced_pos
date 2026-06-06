<template>
	<div class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 w-full h-full">
		<!-- Premium Checkout Card -->
		<div class="w-full max-w-xl p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl text-center flex flex-col gap-6">
			<div>
				<span class="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full inline-block">
					{{ __("PAGO CON TARJETA") }}
				</span>
				<h2 class="text-4xl lg:text-5xl font-black mt-4 tracking-tight text-slate-800 font-mono">
					{{ fmtMoney(total) }}
				</h2>
				<p class="text-slate-400 mt-2 text-sm">
					{{ __("Método de pago:") }} <span class="font-semibold text-slate-700">{{ __("Tarjeta") }}</span>
				</p>
			</div>

			<!-- Dataphone Instructions -->
			<div class="my-4 py-6 border-y border-slate-200/80 flex flex-col items-center justify-center w-full">
				<div class="text-slate-500 text-sm max-w-md mx-auto w-full">
					<div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600 animate-pulse">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<p class="font-bold text-slate-700 text-center text-sm leading-normal">
						{{ __("Por favor, siga las instrucciones del terminal de cobro.") }}
					</p>
				</div>
			</div>

			<!-- Prompt -->
			<p class="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
				{{ __("Aproxime o inserte su tarjeta en el datáfono cuando se lo indique el cajero.") }}
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'CardCustomerDisplay',
	props: {
		total: {
			type: Number,
			default: 0,
		},
		currency: {
			type: String,
			default: 'EUR',
		},
	},
	setup(props) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		return {
			__,
			fmtMoney,
		};
	},
});
</script>
