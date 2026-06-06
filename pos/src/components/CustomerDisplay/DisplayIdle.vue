<template>
	<div class="relative flex-grow flex items-center justify-center overflow-hidden bg-slate-950 h-full w-full">
		<!-- Slideshow Media -->
		<div v-if="mediaUrls.length" class="absolute inset-0 w-full h-full">
			<transition-group name="fade" tag="div" class="relative w-full h-full">
				<div
					v-for="(url, idx) in mediaUrls"
					v-show="idx === currentMediaIdx"
					:key="url"
					class="absolute inset-0 w-full h-full flex items-center justify-center"
				>
					<video
						v-if="isVideo(url)"
						ref="videos"
						:src="url"
						autoplay
						muted
						playsinline
						class="w-full h-full object-cover"
						@ended="$emit('ended')"
					></video>
					<img
						v-else
						:src="url"
						:alt="`Promo ${idx}`"
						class="w-full h-full object-cover"
					/>
				</div>
			</transition-group>
		</div>

		<!-- Fallback background when no media is configured -->
		<div v-else class="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950"></div>

		<!-- Elegant Glassmorphic Welcome Overlay -->
		<div class="relative z-10 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-center max-w-lg mx-4">
			<div class="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/20">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
				</svg>
			</div>
			<h1 class="text-3xl font-extrabold text-white tracking-tight leading-tight">
				{{ __("¡Bienvenido!") }}
			</h1>
			<p class="text-slate-300 mt-2 text-sm">
				{{ __("Gracias por comprar con nosotros. En breve iniciaremos su transacción.") }}
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'DisplayIdle',
	props: {
		mediaUrls: {
			type: Array as () => string[],
			default: () => [],
		},
		currentMediaIdx: {
			type: Number,
			default: 0,
		},
	},
	emits: ['ended'],
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const isVideo = (url: string): boolean => {
			if (!url) return false;
			const cleanUrl = url.split('?')[0].toLowerCase();
			return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg');
		};

		return {
			__,
			isVideo,
		};
	},
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
