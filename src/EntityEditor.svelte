<script lang="ts">
	import type { Property, Schema } from '@opensanctions/followthemoney';
	import { model } from './ftm';
	import { getCardProperties, type CardState } from './entityCard';
	import AddedPropertyField from './AddedPropertyField.svelte';
	import SchemaCombobox from './SchemaCombobox.svelte';
	import PropertyChooserDialog from './PropertyChooserDialog.svelte';

	let {
		card = $bindable(),
		schemata,
		onDelete,
	}: {
		card: CardState;
		schemata: Schema[];
		onDelete?: () => void;
	} = $props();

	// Schema → entity lifecycle. Guarded by a token so a rapid type-switch
	// can't let a stale createEntity() resolution clobber a newer one.
	let creationToken = 0;
	async function handleSchemaChange(name: string) {
		const schema = schemata.find((s) => s.name === name);
		if (!schema || schema === card.entity?.schema) return;
		const token = ++creationToken;
		const entity = await model.createEntity(schema);
		if (token !== creationToken) return;
		card.entity = entity;
		const { featured } = getCardProperties(schema);
		card.addedProps = featured.map((p) => ({ property: p, values: [] }));
	}

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
	const requiredNames = $derived(new Set(card.entity?.schema.required ?? []));

	function toggleProp(prop: Property) {
		const existing = card.addedProps.find((ap) => ap.property === prop);
		if (existing) {
			card.addedProps = card.addedProps.filter((ap) => ap !== existing);
			card.entity?.properties.delete(existing.property);
		} else {
			card.addedProps.push({ property: prop, values: [] });
		}
	}
</script>

<SchemaCombobox
	selectedSchema={card.entity?.schema.name}
	{schemata}
	{handleSchemaChange}
	autofocus={card.autofocus}
/>

{#if card.entity}
	{#each card.addedProps as ap, apIndex (ap.property.name)}
		<AddedPropertyField
			entity={card.entity}
			bind:ap={() => ap, (v) => (card.addedProps[apIndex] = v)}
			required={requiredNames.has(ap.property.name)}
			onremove={() => toggleProp(ap.property)}
		/>
	{/each}
	{#if availableOthers.length > 0}
		<PropertyChooserDialog
			schema={card.entity.schema}
			addedProperties={new Set(card.addedProps.map((ap) => ap.property))}
			onSelectProperty={toggleProp}
		/>
	{/if}
	{#if onDelete}
		<button onclick={onDelete}>Delete entity</button>
	{/if}
{/if}
