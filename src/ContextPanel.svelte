<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	let { children }: { children: Snippet } = $props();
</script>

<aside class="context-panel" transition:fly={{ x: 40, duration: 200 }}>
	{@render children()}
</aside>

<style>
	.context-panel {
		flex: 0 0 400px;
		min-width: 0;
		border-left: 1px solid rgba(127, 127, 127, 0.25);
		padding: 1rem;
		overflow-y: auto;
	}
</style>
