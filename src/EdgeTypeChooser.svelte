<script lang="ts">
	import type EdgeType from './EdgeType';
	type Props = { items: EdgeType[]; onSelect: (value: string) => void };
	const { items, onSelect }: Props = $props();
</script>

<div>
	<ul>
		{#each items as item (item.key)}
			<li>
				<button onclick={() => onSelect(item.key)}>{item.label}</button>
			</li>
		{/each}
	</ul>
</div>
