<script lang="ts">
	import { createAttachmentKey } from 'svelte/attachments';
	import type { Schema } from '@opensanctions/followthemoney';
	import CustomCombobox from './CustomCombobox.svelte';
	import SchemaIcon from './SchemaIcon.svelte';

	let {
		selectedSchema,
		schemata,
		onSchemaChange,
		autofocus = false,
	}: {
		selectedSchema: string | undefined;
		schemata: Schema[];
		onSchemaChange: (name: string) => void;
		autofocus?: boolean;
	} = $props();

	const inputProps = {
		placeholder: 'What kind of entity is this?',
		[createAttachmentKey()]: (node: HTMLInputElement) => {
			if (selectedSchema) return;
			if (autofocus) node.focus();
		},
	};

	const schemaItems = $derived(
		schemata.map((s) => ({ schema: s, value: s.name, label: s.label })),
	);
	function schemaForValue(value: string): Schema {
		const schema = schemata.find((s) => s.name === value);
		if (schema === undefined) {
			throw new Error(`Parameter ${value} is not a proper schema`);
		}
		return schema;
	}
</script>

<CustomCombobox
	items={schemaItems}
	onValueChange={onSchemaChange}
	value={selectedSchema}
	{inputProps}
>
	{#snippet valueIcon(value)}
		{#if value}
			<SchemaIcon schema={schemaForValue(value)} size={20} />
		{:else}
			<span class="schema-icon placeholder" aria-hidden="true"></span>
		{/if}
	{/snippet}
	{#snippet itemRow(item)}
		<SchemaIcon schema={item.schema} size={20} />{item.label}
	{/snippet}
</CustomCombobox>

<style>
	.schema-icon.placeholder {
		display: inline-flex;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		flex-shrink: 0;
		border: 1px dashed rgba(127, 127, 127, 0.4);
	}
</style>
