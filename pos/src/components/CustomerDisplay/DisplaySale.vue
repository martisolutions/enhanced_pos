<template>
	<div class="flex-grow flex flex-col lg:flex-row bg-slate-50 p-6 gap-6 h-screen overflow-hidden w-full">
		<!-- Left Column: Cart Items List -->
		<div class="flex-grow flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:w-2/3">
			<h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
				</svg>
				{{ __("Detalle de su compra") }}
			</h2>

			<!-- Items Container -->
			<div v-if="items.length" class="flex-grow overflow-y-auto pr-1 flex flex-col gap-3 relative">
				<transition-group name="list" tag="div" class="flex flex-col gap-3 w-full relative">
					<div
						v-for="item in items"
						:key="item.item_code"
						class="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition w-full"
					>
						<div class="flex flex-col gap-0.5">
							<span class="font-semibold text-slate-800 text-sm leading-snug">
								{{ item.item_name || item.item_code }}
							</span>
							<span class="text-xs font-mono text-slate-400">
								{{ item.item_code }}
							</span>
						</div>
						<div class="flex items-center gap-6">
							<transition name="pop" mode="out-in">
								<span :key="item.qty" class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
									x{{ item.qty }}
								</span>
							</transition>
							<transition name="pop" mode="out-in">
								<span :key="item.qty * item.rate" class="font-bold text-slate-800 text-sm w-20 text-right">
									{{ fmtMoney(item.qty * item.rate) }}
								</span>
							</transition>
						</div>
					</div>
				</transition-group>
			</div>
			<div v-else class="flex-grow flex items-center justify-center text-slate-400 text-sm">
				{{ __("Esperando productos...") }}
			</div>
		</div>

		<!-- Right Column: Grand Total Summary Box -->
		<div class="lg:w-1/3 flex flex-col gap-6">
			<!-- Brand Header Card -->
			<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
				<div class="w-12 h-12 bg-primary-tint rounded-xl flex items-center justify-center text-primary mx-auto mb-3">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
					</svg>
				</div>
				<h3 class="font-extrabold text-slate-800 text-lg leading-tight">{{ __("Punto de Venta") }}</h3>
				<p class="text-xs text-slate-400 mt-1">{{ __("Transacción en curso") }}</p>
			</div>

			<!-- Glassmorphic Total Box -->
			<div class="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-xl p-8 text-white flex flex-col justify-between flex-grow">
				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
						{{ __("Total a pagar") }}
					</span>
					<transition name="pop-large" mode="out-in">
						<h1 :key="total" class="text-4xl lg:text-5xl font-black mt-2 tracking-tight text-white">
							{{ fmtMoney(total) }}
						</h1>
					</transition>
				</div>

				<div class="border-t border-slate-800/80 pt-6 mt-8">
					<div class="flex justify-between text-sm text-slate-400 mb-2">
						<span>{{ __("Artículos totales:") }}</span>
						<span class="font-semibold text-white font-mono">{{ itemsCount }}</span>
					</div>
					<div class="text-xs text-slate-500 mt-4 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/40">
						💡 {{ __("Verifique los artículos en pantalla. Si necesita factura, solicítela al cajero.") }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { CartItem } from '../../types';

export default defineComponent({
	name: 'DisplaySale',
	props: {
		items: {
			type: Array as () => CartItem[],
			default: () => [],
		},
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

		const itemsCount = computed(() => {
			return props.items.reduce((sum, item) => sum + (item.qty || 0), 0);
		});

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		return {
			__,
			itemsCount,
			fmtMoney,
		};
	},
});
</script>

<style scoped>
/* Pop Transition for items quantity & price */
.pop-enter-active {
	animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
	animation: pop-out 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes pop-in {
	0% {
		opacity: 0;
		transform: scale(0.85);
	}
	70% {
		transform: scale(1.05);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
@keyframes pop-out {
	0% {
		opacity: 1;
		transform: scale(0.95);
	}
}

/* Pop Large Transition for Grand Total */
.pop-large-enter-active {
	animation: pop-large-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-large-leave-active {
	animation: pop-large-out 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pop-large-in {
	0% {
		opacity: 0;
		transform: translateY(15px) scale(0.98);
	}
	100% {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
@keyframes pop-large-out {
	0% {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
	100% {
		opacity: 0;
		transform: translateY(-10px) scale(0.98);
	}
}

/* Cart list transition animations */
.list-enter-active {
	transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-active {
	transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	position: absolute;
	left: 0;
	right: 0;
}
.list-move {
	transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-enter-from {
	opacity: 0;
	transform: translateY(12px);
}
.list-leave-to {
	opacity: 0;
	transform: scale(0.95);
}
</style>
