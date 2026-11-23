<script lang="ts">
	import { IconRegistry, type Schema } from '@opensanctions/followthemoney';

	let { schema, size = 28 }: { schema: Schema; size?: number } = $props();

	const paths = $derived(IconRegistry.getSchemaIcon(schema));
</script>

<span class="schema-icon" style="width: {size}px; height: {size}px">
	<svg
		viewBox="0 0 24 24"
		width={Math.round(size * 0.57)}
		height={Math.round(size * 0.57)}
		fill="currentColor"
	>
		{#each paths as d, i (i)}
			<path {d}></path>
		{/each}
	</svg>
</span>

<style>
	.schema-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		flex-shrink: 0;
	}
</style>
