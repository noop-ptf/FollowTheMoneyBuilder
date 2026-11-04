import { App, Notice, requestUrl } from 'obsidian';
import type {
	FTMBuilderPluginSettings,
	OpenAlephCollection,
	OpenAlephCollectionApiResult,
	OpenAlephEntityApiResult,
} from './types';
import type { Entity } from '@opensanctions/followthemoney';
import { model, valueToString } from './ftm';

async function getInstanceCollections(
	instanceUrl: string,
	instanceId: string,
	apiKey: string | null,
): Promise<OpenAlephCollection[]> {
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instanceUrl} is empty.`);
	}

	const url = new URL('/api/2/collections', instanceUrl);
	url.searchParams.set('filter:writeable', 'true');
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	let result;
	try {
		const firstAttempt = await requestUrl({
			url: url.toString(),
			method: 'GET',
			contentType: 'application/json',
			headers,
		});
		result = firstAttempt;
	} catch {
		// We might have ran into issue no #137, which is only fixed
		// for OpenAleph version 5.4.0 and later.
		// https://github.com/openaleph/openaleph/issues/137
		url.searchParams.delete('filter:writeable');
		// We have to fetch *all* collections and filter locally. But
		// in order to get all collections, we first need to know
		// how many are there.
		url.searchParams.set('limit', '1');

		const resultWithTotal = await requestUrl({
			url: url.toString(),
			method: 'GET',
			contentType: 'application/json',
			headers,
		});

		const jsonResultWithTotal =
			resultWithTotal.json as unknown as OpenAlephCollectionApiResult;

		// Now fetch all of them
		url.searchParams.set('limit', String(jsonResultWithTotal.total));
		result = await requestUrl({
			url: url.toString(),
			method: 'GET',
			contentType: 'application/json',
			headers,
		});
	}
	const jsonRes = result.json as unknown as OpenAlephCollectionApiResult;
	const writeableCollections = jsonRes.results.filter((c) => c.writeable);

	return writeableCollections.map((c) => {
		return { ...c, instanceId };
	});
}

export async function getCollections(
	settings: FTMBuilderPluginSettings,
	app: App,
): Promise<OpenAlephCollection[]> {
	const enabledInstances = settings.instances.filter(
		(instance) => instance.enabled,
	);
	let result: OpenAlephCollection[] = [];
	for (const enabledInstance of enabledInstances) {
		const apiKey = app.secretStorage.getSecret(enabledInstance.apiKeyName);
		try {
			const collections = await getInstanceCollections(
				enabledInstance.instanceUrl,
				enabledInstance.id,
				apiKey,
			);
			result = result.concat(collections);
		} catch (err) {
			// Just print a notice, if fetching the collection fails for one instance,
			// in order to allow fetching the collections of the other instances.
			//
			// TODO: Somehow ripple the error up and display the different results independently?
			new Notice(
				`Failed to fetch collection from ${enabledInstance.name}: ${err}`,
			);
		}
	}
	return result;
}

export async function bulkEntityUpload(
	instanceUrl: string,
	apiKey: string,
	entities: Entity[],
	collectionId: OpenAlephCollection['id'],
) {
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	const url = new URL(`/api/2/collections/${collectionId}/bulk`, instanceUrl);
	const res = await requestUrl({
		url: url.toString(),
		method: 'POST',
		contentType: 'application/json',
		headers,
		body: JSON.stringify(entities),
	});
	if (res.status !== 204) {
		throw new Error(
			`Something went wrong while uploading the entities. Status: ${res.status}`,
		);
	}
}

interface PropertyDiff {
	property: string;
	missing: string[]; // local values not found online
	added: string[]; // values online, not found locally
}

interface EntityDiff {
	id: string;
	caption: string | null;
	properties: PropertyDiff[];
}

function diffEntity(local: Entity, remote: Entity): PropertyDiff[] {
	const diffs: PropertyDiff[] = [];
	for (const prop of local.getProperties()) {
		const remoteValues = new Set(
			remote.getProperty(prop.name).map(valueToString),
		);
		const localValues = new Set(
			local.getProperty(prop.name).map(valueToString),
		);
		const missing = local
			.getProperty(prop.name)
			.map(valueToString)
			.filter((v) => !remoteValues.has(v));
		const added = remote
			.getProperty(prop.name)
			.map(valueToString)
			.filter((v) => !localValues.has(v));
		if (missing.length > 0 || added.length > 0) {
			diffs.push({ property: prop.name, missing, added });
		}
	}
	return diffs;
}

export async function validateEntityUpload(
	instanceUrl: string,
	apiKey: string,
	entities: Entity[],
	collectionName: string,
): Promise<string> {
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};
	const url = new URL('/api/2/entities', instanceUrl);
	url.searchParams.set('filter:dataset', collectionName);
	// fetch "all at once" (for now)
	url.searchParams.set('limit', '100000');

	const res = await requestUrl({
		url: url.toString(),
		method: 'GET',
		contentType: 'application/json',
		headers,
	});
	const jsonRes = res.json as unknown as OpenAlephEntityApiResult;

	const entityById = new Map(entities.map((e) => [e.id, e]));
	const seen = new Set<string>();
	const results: EntityDiff[] = [];

	for (const raw of jsonRes.results) {
		const remote = model.getEntity(raw);
		const [unsignedId] = remote.id.split('.');
		if (unsignedId === undefined) continue;

		const local = entityById.get(unsignedId);
		if (local === undefined) continue;

		seen.add(unsignedId);
		const properties = diffEntity(local, remote);
		if (properties.length > 0) {
			results.push({
				id: unsignedId,
				caption: remote.caption,
				properties,
			});
		}
	}

	let report = '';
	// Local entities the server didn't return at all
	const notFoundOnline = [...entityById.keys()].filter((id) => !seen.has(id));
	if (notFoundOnline.length > 0) {
		report += 'Entities not found on OpenAleph:\n';
		notFoundOnline.forEach(
			(key) => (report += `- ${key}:${entityById.get(key)?.caption}\n`),
		);
	}

	for (const d of results) {
		report += `${d.caption}:\n`;
		for (const p of d.properties) {
			if (p.missing.length > 0) {
				report += `  ${p.property}: missing ${JSON.stringify(p.missing)}\n`;
			}
			if (p.added.length > 0) {
				report += `  ${p.property}: added ${JSON.stringify(p.added)}\n`;
			}
		}
	}

	if (report === '') {
		report = 'No issues found, everything was uploaded as expected.';
	}

	return report;
}
