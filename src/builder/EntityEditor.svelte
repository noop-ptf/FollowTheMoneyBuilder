<script lang="ts">
	import type { Entity } from '@opensanctions/followthemoney';
	import type { NetworkState } from '../networkState.svelte';
	import type { CardState } from './cardState.svelte';
	import PropertyField from './PropertyField.svelte';
	import PropertyChooserDialog from './PropertyChooserDialog.svelte';

	type Props = {
		card: CardState;
		entity: Entity;
		network: NetworkState;
		onDelete?: () => void;
	};
	let { card, entity, network, onDelete }: Props = $props();

	const availableProperties = $derived(card.getAddableCardProperties(entity));
	const requiredNames = $derived(new Set(entity.schema.required ?? []));
</script>

{#each card.visibleProperties(entity) as property (property.name)}
	<PropertyField
		{property}
		{entity}
		{network}
		required={requiredNames.has(property.name)}
		onRemove={() => {
			card.hideProperty(property);
			network.setValues(entity.id, property, []);
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
