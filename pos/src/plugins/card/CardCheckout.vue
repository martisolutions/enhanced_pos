<template>
	<div class="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
		<div class="md:col-span-8 md:col-start-3 flex flex-col gap-6 w-full">
			<!-- Amount Display Card -->
			<div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col gap-4">
				<div>
					<span class="text-xs font-bold uppercase tracking-wider text-slate-400">
						{{ __('Total a pagar') }}
					</span>
					<h2 class="text-3xl font-black text-slate-800 tracking-tight leading-none mt-1 font-mono">
						{{ fmtMoney(cartTotal) }}
					</h2>
				</div>

				<div class="border-t border-slate-200/60 pt-4 flex flex-col gap-2.5 text-sm">
					<div class="flex justify-between">
						<span class="text-slate-400 font-medium">{{ __('Método de Pago:') }}</span>
						<span class="font-bold text-slate-700">{{ __('Tarjeta de Crédito') }}</span>
					</div>
				</div>
			</div>

			<!-- Card Simulation placeholder -->
			<div class="bg-indigo-50/15 border border-indigo-100/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
				<div class="w-16 h-16 rounded-full bg-indigo-50/30 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<p class="font-bold text-slate-700 text-sm">
					{{ __('Por favor, pulse en confirmar pago cuando se haya completado la transacción.') }}
				</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { PosContext } from '../../types';

export default defineComponent({
	name: 'CardCheckout',
	props: {
		paidAmount: {
			type: Number,
			required: true,
		},
		cartTotal: {
			type: Number,
			required: true,
		},
		paymentDue: {
			type: Number,
			required: true,
		},
		currency: {
			type: String,
			required: true,
		},
		posCtx: {
			type: Object as PropType<PosContext>,
			required: true,
		},
	},
	emits: ['success'],
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
