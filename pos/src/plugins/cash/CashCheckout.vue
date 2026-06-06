<template>
	<div class="grid grid-cols-1 md:grid-cols-12 gap-8">
		<!-- Left Pane: Details & Totals -->
		<div class="md:col-span-6 flex flex-col gap-6">
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
						<span class="font-bold text-slate-700">{{ __('Efectivo') }}</span>
					</div>

					<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm mt-1">
						<span class="text-slate-400 font-medium pl-1">{{ __('Efectivo Recibido:') }}</span>
						<span class="font-black text-indigo-600 font-mono text-xl">{{ displayInput }}</span>
					</div>

					<div class="flex justify-between mt-1 text-base font-bold">
						<span class="text-slate-500">{{ __('Cambio a devolver:') }}</span>
						<span class="font-mono text-emerald-600 font-black">
							{{ fmtMoney(Math.max(paidAmount - cartTotal, 0)) }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Pane: Numeric Keypad -->
		<div class="md:col-span-6 flex flex-col gap-4">
			<div class="flex gap-2 items-center">
				<div class="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-2xl font-bold text-slate-800 font-mono select-none">
					{{ displayInput }}
				</div>
				<button
					type="button"
					class="w-12 h-12 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center justify-center transition cursor-pointer select-none active:scale-95"
					@click="$emit('backspace')"
				>
					⌫
				</button>
			</div>

			<div class="grid grid-cols-3 gap-2">
				<button
					v-for="key in keypadKeys"
					:key="key"
					class="border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 p-4 rounded-xl font-black text-lg transition cursor-pointer select-none active:scale-95 shadow-sm"
					@click="$emit('pressKey', key)"
				>
					{{ key }}
				</button>
			</div>

			<button
				type="button"
				class="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm transition cursor-pointer select-none active:scale-95 shadow-sm w-full"
				@click="$emit('setExactAmount')"
			>
				{{ __('Importe exacto') }}
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { PosContext } from '../../types';

export default defineComponent({
	name: 'CashCheckout',
	props: {
		displayInput: {
			type: String,
			required: true,
		},
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
	emits: ['pressKey', 'backspace', 'setExactAmount', 'success'],
	setup(props) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const keypadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		return {
			__,
			keypadKeys,
			fmtMoney,
		};
	},
});
</script>
