<template>
	<div class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 w-full h-full">
		<div class="w-full max-w-xl p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl text-center flex flex-col gap-6">
			
			<!-- Screen Title -->
			<div>
				<span class="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full inline-block">
					{{ __("PAGO EN EFECTIVO") }}
				</span>
				<h2 class="text-2xl font-black text-slate-800 mt-3 tracking-tight">
					{{ __("Cálculo de Transacción") }}
				</h2>
			</div>

			<!-- Visual Metrics Grid -->
			<div class="grid grid-cols-1 gap-4 text-left">
				<!-- Total to pay -->
				<div class="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex justify-between items-center shadow-sm">
					<div>
						<span class="text-xs font-bold uppercase tracking-wider text-slate-400">
							{{ __("Total a pagar") }}
						</span>
						<div class="text-xs text-slate-450 font-medium mt-0.5">
							{{ __("Importe total de su compra") }}
						</div>
					</div>
					<span class="text-2xl font-black text-slate-800 font-mono">
						{{ fmtMoney(total) }}
					</span>
				</div>

				<!-- Cash received -->
				<div class="bg-indigo-50/20 border border-indigo-100 p-5 rounded-2xl flex justify-between items-center shadow-sm">
					<div>
						<span class="text-xs font-bold uppercase tracking-wider text-indigo-500">
							{{ __("Efectivo Recibido") }}
						</span>
						<div class="text-xs text-indigo-450 font-medium mt-0.5">
							{{ __("Dinero entregado al cajero") }}
						</div>
					</div>
					<transition name="pop" mode="out-in">
						<span :key="cashReceived" class="text-2xl font-black text-indigo-600 font-mono">
							{{ fmtMoney(cashReceived) }}
						</span>
					</transition>
				</div>

				<!-- Change to return -->
				<div class="bg-emerald-50/20 border border-emerald-100 p-6 rounded-2xl flex justify-between items-center shadow-md">
					<div>
						<span class="text-xs font-bold uppercase tracking-wider text-emerald-600">
							{{ __("Cambio a devolver") }}
						</span>
						<div class="text-xs text-emerald-450 font-medium mt-0.5">
							{{ __("Su vuelto de esta compra") }}
						</div>
					</div>
					<transition name="pop-large" mode="out-in">
						<span :key="changeAmount" class="text-3xl font-black text-emerald-600 font-mono">
							{{ fmtMoney(changeAmount) }}
						</span>
					</transition>
				</div>
			</div>

			<!-- Prompt -->
			<p class="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
				{{ __("Por favor, verifique el cambio en la pantalla y retire su ticket al finalizar.") }}
			</p>

		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'CashCustomerDisplay',
	props: {
		total: {
			type: Number,
			default: 0,
		},
		currency: {
			type: String,
			default: 'EUR',
		},
		cashReceived: {
			type: Number,
			default: 0,
		},
		changeAmount: {
			type: Number,
			default: 0,
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

<style scoped>
/* Pop Transition for cash received */
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

/* Pop Large Transition for Change Amount */
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
</style>
