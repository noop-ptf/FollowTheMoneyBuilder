<script lang="ts">
	import Dialog from './Dialog.svelte';
	import GroupedItemChooser from './GroupedItemChooser.svelte';
	import { getGroupedProperties, FIELD_GROUPS } from './ftm';
	import { fuzzyFilter } from './fuzzy';
	import type { Property, Schema } from '@opensanctions/followthemoney';

	let {
		schema,
		addedProperties,
		onSelectProperty,
	}: {
		schema: Schema;
		addedProperties: Set<Property>;
		onSelectProperty: (prop: Property) => void;
	} = $props();

	const groupedProperties = $derived(
		getGroupedProperties(schema, addedProperties),
	);
	let open = $state(false);
	let filterInput = $state<HTMLInputElement>();
	let searchValue = $state('');
	const filteredGroups = $derived(
		Object.fromEntries(
			Object.entries(groupedProperties)
				.map(
					([g, props]) =>
						[g, fuzzyFilter(props, searchValue)] as const,
				)
				.filter(([, props]) => props.length > 0),
		),
	);
	// Replace the "Type-specific details" by their name, if we have one for it
	const groupLabels = $derived.by(() => {
		const specificLabel =
			FIELD_GROUPS.specificLabel[
				schema.name as keyof typeof FIELD_GROUPS.specificLabel
			];
		if (specificLabel !== undefined) {
			return { ...FIELD_GROUPS.labels, specific: specificLabel };
		} else {
			return FIELD_GROUPS.labels;
		}
	});
</script>

<Dialog
	buttonText="Add property"
	bind:open
	contentProps={{
		onOpenAutoFocus: (e) => {
			e.preventDefault();
			filterInput?.focus();
		},
		style: 'height: 80%',
	}}
>
	{#snippet title()}
		Property selection
	{/snippet}
	{#snippet description()}
		Choose a property to add to the entity.
	{/snippet}
	<input type="text" bind:this={filterInput} bind:value={searchValue} />
	<div class="scroll">
		<GroupedItemChooser
			groupedItems={filteredGroups}
			{groupLabels}
			groupOrder={FIELD_GROUPS.order}
			onItemClick={(p) => {
				onSelectProperty(p);
				open = false;
			}}
		></GroupedItemChooser>
	</div>
</Dialog>

<style>
	.scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
