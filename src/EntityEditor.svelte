<script lang="ts">
	import type { Property } from '@opensanctions/followthemoney';
	import { getCardProperties, type CardState } from './entityCard';
	import AddedPropertyField from './AddedPropertyField.svelte';
	import PropertyChooserDialog from './PropertyChooserDialog.svelte';

	let {
		card = $bindable(),
		addToNetwork,
		onDelete,
	}: {
		card: CardState;
		addToNetwork?: (card: CardState) => Promise<void>;
		onDelete?: () => void;
	} = $props();

	const propertyLists = $derived(
		card.entity
			? getCardProperties(card.entity.schema)
			: { featured: [], others: [] },
	);
	const availableOthers = $derived(
		propertyLists.others.filter(
			(p) => !card.addedProps.some((ap) => ap.property === p),
		),
	);
	const requiredNames = $derived(new Set(card.entity.schema.required ?? []));

	function toggleProp(prop: Property) {
		const existing = card.addedProps.find((ap) => ap.property === prop);
		if (existing) {
			card.addedProps = card.addedProps.filter((ap) => ap !== existing);
			card.entity.properties.delete(existing.property);
		} else {
			card.addedProps.push({ property: prop, values: [] });
		}
	}
</script>

{#each card.addedProps as ap, apIndex (ap.property.name)}
	<AddedPropertyField
		entity={card.entity}
		bind:ap={() => ap, (v) => (card.addedProps[apIndex] = v)}
		required={requiredNames.has(ap.property.name)}
		onRemove={() => toggleProp(ap.property)}
	/>
{/each}
{#if availableOthers.length > 0}
	<PropertyChooserDialog
		schema={card.entity.schema}
		addedProperties={new Set(card.addedProps.map((ap) => ap.property))}
		onSelectProperty={toggleProp}
	/>
{/if}
{#if addToNetwork}
	<button onclick={() => addToNetwork(card)}>==&gt;</button>
{/if}
{#if onDelete}
	<button onclick={onDelete}>Delete entity</button>
{/if}
