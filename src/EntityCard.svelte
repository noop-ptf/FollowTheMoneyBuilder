<script lang="ts">
	import type { Schema } from '@opensanctions/followthemoney';
	import { type CardState } from './entityCard';
	import EntityEditor from './EntityEditor.svelte';
	import EntitySummary from './EntitySummary.svelte';
	import { obsidianIcon } from './attachments';

	let {
		card = $bindable(),
		schemata,
		onremove,
	}: {
		card: CardState;
		schemata: Schema[];
		onremove: () => void;
	} = $props();
</script>

<article class="card">
	<div class="entity-header">
		<button
			class="entity-toggle"
			onclick={() => {
				card.editing = !card.editing;
			}}
		>
			<div
				class="collapse-icon {card.editing ? '' : 'is-collapsed'}"
				{@attach obsidianIcon('right-triangle')}
			></div>
			<div class="caption">
				{card.entity?.getCaption() ||
					`unknown ${card.entity?.schema.label || 'entity'}`}
			</div>
		</button>
		<button
			type="button"
			class="clickable-icon {card.editing ? '' : 'invisible'}"
			aria-label="Remove entity"
			onclick={onremove}
			{@attach obsidianIcon('trash')}
		></button>
	</div>
	{#if card.editing}
		<EntityEditor bind:card {schemata} />
	{:else}
		<EntitySummary {card} />
	{/if}
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		border-radius: 8px;
		background: var(--background-primary);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
		margin-inline: 0;
		padding: 16px;
		position: relative;
	}
	.entity-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.entity-toggle {
		all: unset;
		display: flex;
		color: var(--text-muted);
		border-radius: var(--radius-m);
		padding: var(--size-4-1) var(--size-4-2) var(--size-4-1) var(--size-4-6);
		flex-grow: 1;
	}
	.entity-toggle:hover {
		color: var(--text-normal);
		background-color: var(--background-modifier-hover);
	}
	.collapse-icon {
		position: absolute;
		margin-inline-start: calc(-1 * var(--size-4-5));
		width: var(--size-4-4);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: var(--icon-opacity);
		color: var(--icon-color);
		flex: 0 0 auto;
	}
	.clickable-icon {
		transition:
			opacity 0.1s,
			visibility 0.1s;
	}
	.invisible {
		opacity: 0;
		visibility: hidden;
	}
	.collapse-icon :global(svg.svg-icon) {
		height: 12px;
		width: 12px;
	}
	.caption {
		text-transform: uppercase;
	}
</style>
