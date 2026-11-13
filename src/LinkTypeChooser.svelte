<script lang="ts">
	import Dialog from './Dialog.svelte';
	import { fuzzyFilter } from './fuzzy';
	import type LinkType from './LinkType';
	import GroupedItemChooser from './GroupedItemChooser.svelte';

	type Props = {
		linkTypes: LinkType[];
		onSelect: (value: string) => void;
		onClose: () => void;
	};
	const { linkTypes, onSelect, onClose }: Props = $props();

	const groupedLinks = $derived({
		interstitial: linkTypes
			.filter((lt) => !lt.isPropertyLinkType())
			.map((lt) => ({
				name: lt.key,
				label: lt.label,
				description: lt.schema?.description || null,
			})),
		property: linkTypes
			.filter((lt) => lt.isPropertyLinkType())
			.map((lt) => ({
				name: lt.key,
				label: lt.label,
				description: lt.property?.description || null,
			})),
	});
	let open = $state(true);
	$effect(() => {
		if (!open) {
			onClose();
		}
	});
	let filterInput = $state<HTMLInputElement>();
	let searchValue = $state('');
	const filteredGroups = $derived(
		Object.fromEntries(
			Object.entries(groupedLinks)
				.map(
					([g, props]) =>
						[g, fuzzyFilter(props, searchValue)] as const,
				)
				.filter(([, props]) => props.length > 0),
		),
	);
	const groupLabels = {
		interstitial: 'Link with additional Information',
		property: 'Direct Link',
	};
	const groupOrder = ['interstitial', 'property'];
</script>

<Dialog
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
		Link type selection
	{/snippet}
	{#snippet description()}
		Choose the type of link to connect the entities.
	{/snippet}
	<input type="text" bind:this={filterInput} bind:value={searchValue} />
	<div class="scroll">
		<GroupedItemChooser
			groupedItems={filteredGroups}
			{groupLabels}
			{groupOrder}
			onItemClick={(p) => {
				onSelect(p.name);
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
