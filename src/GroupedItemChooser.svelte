<script
	lang="ts"
	generics="T extends { name: string; label: string; description: string | null }"
>
	type Props = {
		groupedItems: { [key: string]: T[] };
		groupLabels: { [key: string]: string };
		groupOrder: string[];
		onItemClick: (item: T) => void;
	};
	let { groupedItems, groupLabels, groupOrder, onItemClick }: Props =
		$props();
</script>

{#each groupOrder as group (group)}
	{#if groupedItems[group]?.length}
		<div class="group">{groupLabels[group] || group}</div>
		<ul>
			{#each groupedItems[group] as item (item.name)}
				<li>
					<button onclick={() => onItemClick(item)}>
						<span class="label">{item.label}</span>
						<span class="description">{item.description}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/each}

<style>
	.group {
		border-bottom: 1px solid var(--background-modifier-border);
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		text-transform: uppercase;
	}
	ul {
		display: flex;
		flex-direction: column;
		padding: 0;
		align-items: stretch;
	}
	li {
		list-style: none;
	}
	/* Undo Obsidian's global button styles (fixed height, single line, shadow)
     so long descriptions wrap instead of widening the list. */
	li button {
		display: block;
		width: 100%;
		height: auto;
		padding: var(--size-4-2);
		border: none;
		border-radius: var(--radius-s);
		background: none;
		box-shadow: none;
		text-align: left;
		white-space: normal;
		overflow-wrap: anywhere;
	}
	li button:hover,
	li button:focus-visible {
		background-color: var(--background-modifier-hover);
	}
	.label,
	.description {
		display: block;
	}
	.description {
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}
</style>
