<template>
	<div class="flex-grow flex flex-col items-center justify-center bg-red-50/30 p-8 text-slate-800 w-full h-full">
		<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-red-100 shadow-xl text-center animate-fade-in">
			<div class="w-20 h-20 mx-auto rounded-full bg-rose-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-500/20 animate-pulse">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</div>
			
			<h1 class="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
				{{ __("Error en el Pago") }}
			</h1>
			<p class="text-slate-500 mt-2 text-sm">
				{{ __("No se ha podido procesar la transacción.") }}
			</p>
			
			<div class="my-6 p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-center text-sm max-w-md mx-auto text-rose-700 font-medium">
				{{ errorMessage }}
			</div>

			<p class="text-xs text-slate-400">
				{{ __("Por favor, intente con otro método o consulte con el cajero.") }}
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'DisplayError',
	props: {
		errorMessage: {
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
