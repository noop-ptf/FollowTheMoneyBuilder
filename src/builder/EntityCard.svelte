<script lang="ts">
	import type { CardState } from './cardState.svelte';
	import EntityEditor from './EntityEditor.svelte';
	import EntitySummary from './EntitySummary.svelte';
	import { obsidianIcon } from '../lib/attachments';
	import type { Entity } from '@opensanctions/followthemoney';
	import type { NetworkState } from '../networkState.svelte';
	import type { UIState } from '../uiState.svelte';

	let {
		card,
		entity,
		network,
		ui,
		onRemove,
	}: {
		card: CardState;
		entity: Entity;
		network: NetworkState;
		ui: UIState;
		onRemove: () => void;
	} = $props();

	let articleRef: HTMLElement;

	const editing = $derived(ui.focusedEntity === card.entityId);

	$effect(() => {
		if (editing && articleRef) {
			articleRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	});
</script>

<article bind:this={articleRef} class="card">
	<div class="entity-header">
		<button
			class="entity-toggle"
			onclick={() => {
				if (editing) {
					ui.focusedEntity = null;
				} else {
					ui.focusedEntity = card.entityId;
				}
			}}
		>
			<div
				class="collapse-icon {editing ? '' : 'is-collapsed'}"
				{@attach obsidianIcon('right-triangle')}
			></div>
			<div class="caption">
				{entity.getCaption()}
			</div>
		</button>
		<button
			type="button"
			class="clickable-icon {editing ? '' : 'invisible'}"
			aria-label="Remove entity"
			onclick={onRemove}
			{@attach obsidianIcon('trash')}
		></button>
	</div>
	{#if editing}
		<EntityEditor {card} {entity} {network} />
	{:else}
		<EntitySummary {card} {entity} {network} />
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
