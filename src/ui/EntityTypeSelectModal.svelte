<script lang="ts">
	import { listEntitySchemata } from '../ftm/model';
	import SchemaCombobox from './SchemaCombobox.svelte';

	let {
		onConfirm,
		onCancel,
	}: { onConfirm: (entityType: string) => void; onCancel: () => void } =
		$props();

	let selectedSchema = $state<string | undefined>();
	const schemata = listEntitySchemata();
</script>

<h2>Choose entity type</h2>
<div class="modal-button-container">
	<SchemaCombobox
		{selectedSchema}
		{schemata}
		onSchemaChange={(name) => (selectedSchema = name)}
		autofocus={true}
	/>
	<button
		class="mod-cta"
		disabled={selectedSchema === undefined}
		onclick={() => selectedSchema && onConfirm(selectedSchema)}
		>Confirm</button
	>
	<button onclick={onCancel}>Cancel</button>
</div>
