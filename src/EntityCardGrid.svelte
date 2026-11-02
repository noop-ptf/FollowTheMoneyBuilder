<script lang="ts">
	import { Notice } from 'obsidian';
	import { lucideIcon } from './lucideIcon';
	import type { Schema } from '@opensanctions/followthemoney';
	import { listEntitySchemata } from './ftm';
	import { createCardState, type CardState } from './entityCard';
	import EntityCard from './EntityCard.svelte';
	import CollectionSelector from './CollectionSelector.svelte';
	import type {
		OpenAlephCollection,
		OpenAlephInstanceSettings,
	} from './types';
	import type { Entity } from '@opensanctions/followthemoney';

	let {
		loadCollections,
		bulkEntityUpload,
		validateEntityUpload,
		confirmSaveEntities,
		getInstanceSettings,
		openPluginSettings,
	}: {
		loadCollections: () => Promise<OpenAlephCollection[]>;
		bulkEntityUpload: (
			entities: Entity[],
			collection: OpenAlephCollection,
		) => void;
		validateEntityUpload: (
			entities: Entity[],
			collection: OpenAlephCollection,
		) => Promise<string | undefined>;
		confirmSaveEntities: (
			entities: Entity[],
			collection: OpenAlephCollection | null,
		) => void;
		getInstanceSettings: (id: string) => OpenAlephInstanceSettings;
		openPluginSettings: () => void;
	} = $props();
	const schemata: Schema[] = listEntitySchemata();

	// The shared store array: only ever mutated in place, never reassigned.
	let cards = $state<CardState[]>([]);

	function addCard() {
		cards.push(createCardState(true));
	}

	function removeCard(index: number) {
		cards.splice(index, 1);
	}

	let selectedCollection: OpenAlephCollection | null = $state(null);

	function postEntitiesToSelectedCollection() {
		let entities = cards
			.map((card) => card.entity)
			.filter((entity) => entity !== undefined);
		if (selectedCollection) {
			new Notice(
				`Posting ${entities.length} entities to ${selectedCollection.label}`,
			);
			bulkEntityUpload(entities, selectedCollection);
		}
		// Reset report, as upload changes validation result
		validationReport = undefined;
	}

	function writeEntitiesToVault() {
		let entities = cards
			.map((card) => card.entity)
			.filter((entity) => entity !== undefined);
		confirmSaveEntities(entities, selectedCollection);
		/*
					writeNote={(entity: OpenAlephEntity) => {
						const instanceHostname = new URL(entity.links.self)
							.hostname;
					}}
	*/
	}

	let validationReport = $state();
	async function validateUploadSelectedCollection() {
		let entities = cards
			.map((card) => card.entity)
			.filter((entity) => entity !== undefined);
		if (selectedCollection) {
			new Notice(`Verifying entities in ${selectedCollection.label}`);
			validationReport = await validateEntityUpload(
				entities,
				selectedCollection,
			);
		}
	}

	let testcard = $state<CardState>();

	// testEntity().then((entity) => {
	// 	testcard = testCard(entity);
	// });
</script>

<h3>Entities</h3>
<div class="entities">
	{#if testcard}
		<EntityCard bind:card={testcard} {schemata} onremove={() => 0} />
	{/if}
	{#each cards as card, index (card.key)}
		<EntityCard
			bind:card={() => card, (c) => (cards[index] = c)}
			{schemata}
			onremove={() => removeCard(index)}
		/>
	{/each}

	<button
		type="button"
		class="card ghost"
		onclick={addCard}
		aria-label="Add entity"
	>
		<span class="plus" aria-hidden="true">+</span>
		<span>Add entity</span>
	</button>
</div>
<h3>
	Investigation<span
		class="info-hover"
		aria-label="Select to which OpenAleph investigation the entities will go"
		{@attach lucideIcon('info')}
	></span>
</h3>
<CollectionSelector
	{loadCollections}
	{getInstanceSettings}
	{openPluginSettings}
	bind:selectedCollection
/>
<h3>
	Save or Upload<span
		class="info-hover"
		aria-label="Save the entities to your vault or upload them to OpenAleph"
		{@attach lucideIcon('info')}
	></span>
</h3>
{#if cards.length === 0}
	<p>Create an entity to upload or save.</p>
{:else}
	<div class="actions">
		<button class="mod-cta" onclick={writeEntitiesToVault}
			>Save {cards.length}
			{cards.length == 1 ? 'entity' : 'entities'} to this vault</button
		>
		{#if !selectedCollection}
			<p>Select an investigation to upload entities.</p>
		{:else}
			<button class="mod-cta" onclick={postEntitiesToSelectedCollection}
				>Upload {cards.length}
				{cards.length == 1 ? 'entity' : 'entities'} to OpenAleph</button
			>
			<button onclick={validateUploadSelectedCollection}
				>Verify upload</button
			>
			{#if validationReport}
				<pre class="report">{validationReport}</pre>
			{/if}
		{/if}
	</div>
{/if}

<style>
	h3:not(:first-child) {
		margin-top: 48px;
	}
	.entities {
		display: flex;
		flex-direction: column;
		justify-items: stretch;
		gap: 12px;
		margin-block: 12px;
	}

	.card.ghost {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		gap: 0.3em;
		border-radius: 8px;
		border: 2px dashed rgba(127, 127, 127, 0.4);
		background: transparent;
		box-shadow: none;
		opacity: 0.6;
		margin-inline: 0;
	}

	.card.ghost:hover,
	.card.ghost:focus-visible {
		opacity: 1;
		border-color: var(--schema-default-fg);
	}

	.card.ghost .plus {
		font-size: 1.8em;
		line-height: 1;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.report {
		white-space: pre-wrap; /* keep newlines and indentation, but wrap long lines */
		overflow-wrap: anywhere; /* break very long tokens like IDs or URLs */
		max-width: 100%;
		margin: 16px;
	}
	.info-hover {
		padding-left: 8px;
		color: var(--icon-color);
	}
</style>
