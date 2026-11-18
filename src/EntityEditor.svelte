<script lang="ts">
	import type { Entity } from '@opensanctions/followthemoney';
	import { type CardState } from './cardState.svelte';
	import PropertyField from './PropertyField.svelte';
	import PropertyChooserDialog from './PropertyChooserDialog.svelte';
	import { getNetwork } from './entitiesContext';

	let {
		card,
		entity,
		onDelete,
	}: {
		card: CardState;
		entity: Entity;
		onDelete?: () => void;
	} = $props();

	const availableProperties = $derived(card.getAddableCardProperties(entity));
	const requiredNames = $derived(new Set(entity.schema.required ?? []));
	const network = getNetwork();
</script>

{#each card.visibleProperties(entity) as property (property.name)}
	<PropertyField
		{property}
		required={requiredNames.has(property.name)}
		onRemove={() => {
			card.hideProperty(property);
			network()?.setValues(entity.id, property, []);
		}}
	/>
{/each}
{#if availableProperties.length > 0}
	<PropertyChooserDialog
		schema={entity.schema}
		{availableProperties}
		onSelectProperty={(p) => card.showProperty(p)}
	/>
{/if}
{#if onDelete}
	<button onclick={onDelete}>Delete entity</button>
{/if}
