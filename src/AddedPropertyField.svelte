<script lang="ts">
	import type { Entity } from '@opensanctions/followthemoney';
	import type { AddedProperty } from './entityCard';
	import { syncProperty } from './entityCard';
	import PropertyField from './PropertyField.svelte';
	import { obsidianIcon } from './attachments';

	let {
		entity,
		ap = $bindable(),
		required = false,
		onremove,
	}: {
		entity: Entity;
		ap: AddedProperty;
		required?: boolean;
		onremove: () => void;
	} = $props();

	$effect(() => {
		ap.values;
		syncProperty(entity, ap);
	});
</script>

<div class="added-field">
	<PropertyField property={ap.property} {required} bind:values={ap.values} />
	<button
		type="button"
		class="clickable-icon field-remove"
		aria-label="Remove field"
		onclick={onremove}
		{@attach obsidianIcon('circle-minus')}
	></button>
</div>

<style>
	.added-field {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.added-field :global(fieldset) {
		border: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.added-field:hover {
		background-color: var(--background-secondary);
		border-radius: 8px;
	}

	.added-field :global(input),
	.added-field :global(select),
	.added-field :global(textarea) {
		width: 100%;
		box-sizing: border-box;
	}

	/* Sits on the legend's line, which only uses the left side. */
	.added-field .field-remove {
		position: absolute;
		top: 0;
		right: 0;
		padding: var(--size-2-1);
		opacity: 0;
	}
	.added-field:hover .field-remove {
		opacity: 1;
	}
</style>
