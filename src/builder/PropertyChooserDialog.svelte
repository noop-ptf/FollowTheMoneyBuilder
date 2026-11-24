<script lang="ts">
	import Dialog from '../ui/Dialog.svelte';
	import GroupedItemChooser from '../ui/GroupedItemChooser.svelte';
	import {
		getGroupedProperties,
		FIELD_GROUPS,
	} from '../ftm/propertyGrouping';
	import { fuzzyFilter } from '../lib/fuzzy';
	import type { Property, Schema } from '@opensanctions/followthemoney';

	let {
		schema,
		availableProperties,
		onSelectProperty,
	}: {
		schema: Schema;
		availableProperties: Property[];
		onSelectProperty: (prop: Property) => void;
	} = $props();

	const groupedProperties = $derived(
		getGroupedProperties(availableProperties),
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
