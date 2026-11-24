<script lang="ts">
	import type { Entity, Property } from '@opensanctions/followthemoney';
	import { untrack } from 'svelte';
	import { createAttachmentKey } from 'svelte/attachments';
	import { obsidianIcon, focusOnMount } from '../lib/attachments';
	import CustomCombobox from '../ui/CustomCombobox.svelte';
	import { valueToString } from '../ftm/util';
	import type { NetworkState } from '../networkState.svelte';
	import PropertyInput from './PropertyInput.svelte';

	let {
		property,
		entity,
		network,
		required = false,
		onRemove,
	}: {
		property: Property;
		entity: Entity;
		// TODO: we don't need the full NetworkState here, just the list of entities (to determine link candidates)
		// and a way to set property values to the current entity
		network: NetworkState;
		required?: boolean;
		onRemove: () => void;
	} = $props();

	const range = $derived(property.getRange());
	const candidates = $derived(
		network.entities.filter(
			(e) => e.id !== entity.id && e.schema.isA(range),
		),
	);

	// Temporary "copy" of the entity property values, they have to be played back after each change.
	let draftValues = $derived(entity.getProperty(property).map(valueToString));
	function commitValues() {
		network.setValues(entity.id, property, draftValues);
	}

	const enumValues = $derived.by(() => {
		if (property.type.name === 'entity') {
			return candidates?.map((entity) => ({
				value: entity.id,
				label: entity.getCaption(),
			}));
		}
		return Array.from(property.type.values).map(([k, v]) => ({
			value: k,
			label: v,
		}));
	});

	function addValue() {
		draftValues = [...draftValues, ''];
	}

	function removeValue(index: number) {
		draftValues = [
			...draftValues.slice(0, index),
			...draftValues.slice(index + 1),
		];
		commitValues();
	}

	function writeValue(index: number, value?: string) {
		if (value === undefined) return;
		draftValues = [
			...draftValues.slice(0, index),
			value,
			...draftValues.slice(index + 1),
		];
	}
</script>

<div class="added-field">
	<fieldset>
		<legend
			class="property-label {property.description
				? 'with-description'
				: ''}"
			aria-label={property.description ?? undefined}
		>
			{property.label}{#if required}<span
					class="required"
					aria-hidden="true"
				>
					*</span
				>{/if}
		</legend>
		<div class="values">
			{#each draftValues, i (i)}
				<!-- FtM has 20 property types; only country/gender/language/topic (enum,
           via .values) and date/number/url/email/phone/text/json/html get a
           dedicated widget here. Everything else (address, checksum,
           identifier, ip, mimetype, name, string) falls through to plain text
           below. -->
				<div
					class="value"
					onfocusout={(e) => {
						if (
							!e.currentTarget.contains(
								e.relatedTarget as Node | null,
							)
						) {
							if (!draftValues[i]) {
								removeValue(i);
							} else {
								commitValues();
							}
						}
					}}
				>
					{#if property.type.name === 'entity' || (enumValues?.length || 0) > 0}
						<CustomCombobox
							items={enumValues}
							bind:value={
								() => draftValues[i], (v) => writeValue(i, v)
							}
							inputProps={{
								[createAttachmentKey()]: focusOnMount(
									untrack(() => draftValues[i]),
								),
							}}
						>
							{#snippet itemRow(item)}
								{item.label}
							{/snippet}
						</CustomCombobox>
					{:else if property.type.name === 'text' || property.type.name === 'json' || property.type.name === 'html'}
						<textarea
							bind:value={
								() => draftValues[i], (v) => writeValue(i, v)
							}
							{@attach focusOnMount(
								untrack(() => draftValues[i]),
							)}></textarea>
					{:else}
						<PropertyInput
							name={property.name}
							type={property.type.name}
							bind:value={
								() => draftValues[i], (v) => writeValue(i, v)
							}
						/>
					{/if}
					<button
						type="button"
						class="remove"
						onclick={() => removeValue(i)}>×</button
					>
				</div>
			{/each}
			<button type="button" class="add" onclick={addValue}>+ Add</button>
		</div>
	</fieldset>
	<button
		type="button"
		class="clickable-icon field-remove"
		aria-label="Remove property"
		onclick={onRemove}
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
	.property-label.with-description {
		cursor: help;
	}
	.required {
		color: crimson;
	}
	.values {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.value {
		display: inline-flex;
		gap: 4px;
		border: 1px solid var(--color-base-40);
		border-radius: 8px;
		padding: 4px 4px 4px 8px;
	}
	.value .remove {
		all: unset;
	}
	.values .add {
		all: unset;
		color: var(--icon-color);
		padding: 4px;
		cursor: pointer;
		text-decoration: underline dotted;
		text-underline-offset: 4px;
	}
	.values .add:hover {
		color: var(--color-accent-2);
		text-decoration: underline solid;
	}
</style>
