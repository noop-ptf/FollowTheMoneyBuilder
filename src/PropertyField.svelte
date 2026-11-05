<script lang="ts">
	import type { Property } from '@opensanctions/followthemoney';
	import CustomCombobox from './CustomCombobox.svelte';
	import { createAttachmentKey } from 'svelte/attachments';
	import { focusOnMount } from './attachments';
	import PropertyInput from './PropertyInput.svelte';
	import { untrack } from 'svelte';
	import { getCards, getCurrentCard } from './cardsContext';
	import { getCardCaption } from './entityCard';

	let {
		property,
		values = $bindable(),
		required = false,
	}: {
		property: Property;
		values: string[];
		required?: boolean;
	} = $props();

	const cards = getCards();
	const currentCard = getCurrentCard();
	const range = $derived(property.getRange());
	const candidates = $derived(
		cards.filter(
			(c) =>
				c.entity !== undefined &&
				c.entity.id !== currentCard().entity?.id &&
				c.entity.schema.isA(range),
		),
	);

	const enumValues = $derived.by(() => {
		if (property.type.name === 'entity') {
			return candidates.map((card) => ({
				// The filter in candidates guarantees the existence of entity
				value: card.entity!.id,
				label: getCardCaption(card),
			}));
		}
		return Array.from(property.type.values).map(([k, v]) => ({
			value: k,
			label: v,
		}));
	});

	function addValue() {
		values.push('');
	}

	function removeValue(index: number) {
		values.splice(index, 1);
	}
</script>

<fieldset>
	<legend
		class="property-label {property.description ? 'with-description' : ''}"
		aria-label={property.description ?? undefined}
	>
		{property.label}{#if required}<span class="required" aria-hidden="true">
				*</span
			>{/if}
	</legend>
	<div class="values">
		{#each values, i (i)}
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
						if (!values[i]) {
							removeValue(i);
						}
					}
				}}
			>
				{#if property.type.name === 'entity' || enumValues.length > 0}
					<CustomCombobox
						items={enumValues}
						bind:value={values[i]}
						inputProps={{
							[createAttachmentKey()]: focusOnMount(
								untrack(() => values[i]),
							),
						}}
					>
						{#snippet itemRow(item)}
							{item.label}
						{/snippet}
					</CustomCombobox>
				{:else if property.type.name === 'text' || property.type.name === 'json' || property.type.name === 'html'}
					<textarea
						bind:value={values[i]}
						{@attach focusOnMount(untrack(() => values[i]))}
					></textarea>
				{:else}
					<PropertyInput
						name={property.name}
						type={property.type.name}
						bind:value={values[i]}
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

<style>
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
