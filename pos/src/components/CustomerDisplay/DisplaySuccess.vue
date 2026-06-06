<template>
	<div class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 w-full h-full">
		<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center animate-fade-in">
			<div class="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
				</svg>
			</div>
			
			<h1 class="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
				{{ activeScreen === 'paymentSuccessful' ? __("¡Pago Confirmado!") : __("¡Pago Completado!") }}
			</h1>
			<p class="text-slate-500 mt-2 text-sm">
				{{ activeScreen === 'paymentSuccessful' ? __("Su transacción se ha completado con éxito.") : __("Su transacción se ha procesado con éxito.") }}
			</p>
			
			<div class="my-6 py-4 border-y border-slate-100 text-left text-sm space-y-2 max-w-xs mx-auto">
				<div v-if="successInvoice" class="flex justify-between">
					<span class="text-slate-400">{{ __("Factura:") }}</span>
					<span class="font-mono font-semibold text-slate-700">{{ successInvoice }}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __("Total Pagado:") }}</span>
					<span class="font-mono font-bold text-slate-800">{{ successTotal }}</span>
				</div>
			</div>

			<p class="text-xs text-slate-400">
				{{ __("¡Gracias por su compra! Vuelva pronto.") }}
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'DisplaySuccess',
	props: {
		activeScreen: {
			type: String,
			required: true,
		},
		successInvoice: {
			type: String,
			default: '',
		},
		successTotal: {
			type: String,
			default: '',
		},
	},
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		return {
			__,
		};
	},
});
</script>

<style scoped>
.animate-fade-in {
	animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
