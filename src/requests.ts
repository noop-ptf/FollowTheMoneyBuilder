import { App, Notice, requestUrl } from 'obsidian';
import type {
	OpenAlephEntity,
	FTMBuilderPluginSettings,
	OpenAlephPercolationApiResult,
	OpenAlephPercolationApiEntity,
	OpenAlephGraph,
	OpenAlephCloselyCorrelatedApiResult,
	OpenAlephCloselyCorrelatedApiTerm,
	OpenAlephCollection,
	OpenAlephCollectionApiResult,
	OpenAlephInstanceSettings,
	OpenAlephEntityApiResult,
} from './types';
import type { Entity } from '@opensanctions/followthemoney';
import { model } from './ftm';

const MAX_CLOSELY_CORRELATED_TERMS = 5;

async function percolate(
	instanceUrl: string,
	apiKey: string | null,
	bodyText: string,
	maxPercolatedEntities: number,
): Promise<OpenAlephPercolationApiResult> {
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instanceUrl} is empty.`);
	}

	const firstUrl = new URL('/api/2/beta/percolate', instanceUrl);
	firstUrl.searchParams.set('dehydrate', 'true');
	if (maxPercolatedEntities > 0) {
		firstUrl.searchParams.set('limit', String(maxPercolatedEntities));
	}

	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	const res = await requestUrl({
		url: firstUrl.toString(),
		method: 'POST',
		contentType: 'application/json',
		headers,
		body: JSON.stringify({ text: bodyText }),
	});

	const firstRes = res.json as unknown as OpenAlephPercolationApiResult;

	if (firstRes.status !== 'ok') {
		return { ...firstRes, complete: true };
	}

	const results = [...firstRes.results];
	let next = firstRes.next;
	let error: unknown;

	while (next) {
		try {
			const nextUrl = new URL(next, instanceUrl);

			const res = await requestUrl({
				url: nextUrl.toString(),
				method: 'POST',
				contentType: 'application/json',
				headers,
				body: JSON.stringify({ text: bodyText }),
			});

			const nextRes =
				res.json as unknown as OpenAlephPercolationApiResult;

			results.push(...nextRes.results);
			next = nextRes.next;
		} catch (e) {
			console.warn(
				`Percolation pagination for ${instanceUrl} stopped early:`,
				e,
			);
			error = e;
			break;
		}
	}

	return {
		...firstRes,
		results,
		complete: error === undefined,
		error,
	};
}

async function getCloselyCorrelated(
	instanceUrl: string,
	apiKey: string | null,
	caption: string,
	maxResults: number | null,
): Promise<OpenAlephCloselyCorrelatedApiResult> {
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instanceUrl} is empty.`);
	}

	if (!maxResults) {
		maxResults = 20;
	}

	const url = new URL('/api/2/entities', instanceUrl);
	url.searchParams.set('facet_significant', 'names');
	url.searchParams.set('limit', String(maxResults));
	url.searchParams.set('q', caption);

	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		// Pragma: 'no-cache',
	};

	const res = await requestUrl({
		url: url.toString(),
		method: 'GET',
		contentType: 'application/json',
		headers,
	});

	const body = res.json as unknown;
	return body as OpenAlephCloselyCorrelatedApiResult;
}

export async function explore(
	settings: FTMBuilderPluginSettings,
	app: App,
	content: string,
	noteName: string,
	maxPercolatedEntities: number,
): Promise<OpenAlephGraph> {
	const enabledInstances = settings.instances.filter(
		(instance) => instance.enabled,
	);

	const entities: OpenAlephGraph = {
		centralNote: noteName,
		relatedEntities: [],
	};

	for (const enabledInstance of enabledInstances) {
		const apiKey = app.secretStorage.getSecret(enabledInstance.apiKeyName);
		try {
			// get related entities
			const relatedEntities = await percolate(
				enabledInstance.instanceUrl,
				apiKey,
				content,
				maxPercolatedEntities,
			);

			if (relatedEntities.status !== 'ok') {
				continue;
			}

			const newRelatedEntities =
				relatedEntities.results.flatMap<OpenAlephEntity>(
					(entity: unknown) => {
						if (typeof entity !== 'object' || entity === null) {
							console.warn(
								'Skipping malformed entity:',
								entity,
								'(',
								enabledInstance.instanceUrl,
								')',
							);
							return [];
						}
						const e = entity as OpenAlephPercolationApiEntity;
						return {
							schema: e.schema,
							dataset: e.dataset,
							caption: e.caption,
							id: e.id,
							instance: enabledInstance.instanceUrl,
							instanceName: enabledInstance.name,
							instanceUrl: enabledInstance.instanceUrl,
							url: e.links.self,
							closelyCorrelated: [],
						};
					},
				);

			entities.relatedEntities?.push(...newRelatedEntities);

			let failedCorrelations = 0;

			for (const relatedEntity of newRelatedEntities) {
				let closelyCorrelatedTerms: OpenAlephCloselyCorrelatedApiResult;
				try {
					closelyCorrelatedTerms = await getCloselyCorrelated(
						enabledInstance.instanceUrl,
						apiKey,
						relatedEntity.caption,
						MAX_CLOSELY_CORRELATED_TERMS,
					);
				} catch {
					failedCorrelations++;
					continue;
				}

				if (closelyCorrelatedTerms.status !== 'ok') {
					continue;
				}

				relatedEntity.closelyCorrelated.push(
					...(
						closelyCorrelatedTerms.facets?.[
							'names.significant_terms'
						]?.values ?? []
					).flatMap((value: unknown) => {
						if (typeof value !== 'object' || value === null) {
							console.warn(
								'Skipping malformed closely correlated term:',
								value,
								'(',
								enabledInstance.instanceUrl,
								')',
							);
							return [];
						}
						const v = value as OpenAlephCloselyCorrelatedApiTerm;
						const relatedEntityCaptionAsQuery =
							relatedEntity.caption.trim().replace(/\s+/g, '+');
						const relatedTermCaptionAsQuery = v.label
							.trim()
							.replace(/\s+/g, '+');
						return {
							id: v.id,
							label: v.label,
							count: v.count,
							searchQuery: `${enabledInstance.instanceUrl}/search?limit=30&q=${relatedEntityCaptionAsQuery}+"${relatedTermCaptionAsQuery}"`,
						};
					}),
				);
			}

			if (failedCorrelations > 0) {
				new Notice(
					`Could not load related names for ${failedCorrelations} of ${newRelatedEntities.length} entities from ${enabledInstance.name}.`,
				);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			new Notice(message);
		}
	}

	return entities;
}

export async function getEntity(
	id: string,
	instance: OpenAlephInstanceSettings,
	app: App,
): Promise<OpenAlephEntity> {
	const apiKey = app.secretStorage.getSecret(instance.apiKeyName);

	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instance.instanceUrl} is empty.`);
	}

	const url = new URL(
		`/api/2/entities/${encodeURIComponent(id)}`,
		instance.instanceUrl,
	);

	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	const res = await requestUrl({
		url: url.toString(),
		method: 'GET',
		contentType: 'application/json',
		headers,
	});

	const body = res.json as unknown;
	return body as OpenAlephEntity;
}

async function getInstanceCollections(
	instanceUrl: string,
	instanceId: string,
	apiKey: string | null,
): Promise<OpenAlephCollection[]> {
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instanceUrl} is empty.`);
	}

	// As we're interested in all writeable collections, but
	// we can't filter for them until OpenAleph issue #137 is fixed,
	// https://github.com/openaleph/openaleph/issues/137
	// we have to fetch *all* collections and filter locally.
	//
	// TODO: Maybe change the strategy if this turns out to be too slow.
	const url = new URL('/api/2/collections', instanceUrl);
	// first request to determine the total
	url.searchParams.set('limit', '1');

	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	const preRes = await requestUrl({
		url: url.toString(),
		method: 'GET',
		contentType: 'application/json',
		headers,
	});

	const preJsonRes = preRes.json as unknown as OpenAlephCollectionApiResult;

	// Now fetch all of them
	url.searchParams.set('limit', String(preJsonRes.total));
	const res = await requestUrl({
		url: url.toString(),
		method: 'GET',
		contentType: 'application/json',
		headers,
	});
	const jsonRes = res.json as unknown as OpenAlephCollectionApiResult;
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
			// get related entities
			const collections = await getInstanceCollections(
				enabledInstance.instanceUrl,
				enabledInstance.id,
				apiKey,
			);
			// TODO: consolidate collections from more than one instance
			result = result.concat(collections);
		} catch {
			new Notice(
				`Failed to fetch collection from ${enabledInstance.name}`,
			);
		}
	}
	return result;
}

export async function bulkEntityUpload(
	settings: FTMBuilderPluginSettings,
	app: App,
	entities: Entity[],
	collection: OpenAlephCollection,
) {
	const instance = settings.instances.find(
		(instance) => instance.id === collection.instanceId,
	);
	if (!instance) return;
	const apiKey = app.secretStorage.getSecret(instance.apiKeyName);
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instance.instanceUrl} is empty.`);
	}
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};

	const url = new URL(
		`/api/2/collections/${collection.id}/bulk`,
		instance.instanceUrl,
	);
	const res = await requestUrl({
		url: url.toString(),
		method: 'POST',
		contentType: 'application/json',
		headers,
		body: JSON.stringify(entities),
	});
	const status = res.status === 204 ? 'success' : 'failure';
	new Notice(`Entity Upload Status: ${status}`);
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

// Entity-typed properties may hold Entity objects rather than strings,
// so reduce every value to a comparable string key.
function valueKey(value: unknown): string {
	return typeof value === 'string' ? value : (value as Entity).id;
}

function diffEntity(local: Entity, remote: Entity): PropertyDiff[] {
	const diffs: PropertyDiff[] = [];
	for (const prop of local.getProperties()) {
		const remoteValues = new Set(
			remote.getProperty(prop.name).map(valueKey),
		);
		const localValues = new Set(local.getProperty(prop.name).map(valueKey));
		const missing = local
			.getProperty(prop.name)
			.map(valueKey)
			.filter((v) => !remoteValues.has(v));
		const added = remote
			.getProperty(prop.name)
			.map(valueKey)
			.filter((v) => !localValues.has(v));
		if (missing.length > 0 || added.length > 0) {
			diffs.push({ property: prop.name, missing, added });
		}
	}
	return diffs;
}

export async function validateEntityUpload(
	settings: FTMBuilderPluginSettings,
	app: App,
	entities: Entity[],
	collection: OpenAlephCollection,
): Promise<string | undefined> {
	const instance = settings.instances.find(
		(instance) => instance.id === collection.instanceId,
	);
	if (!instance) return;
	const apiKey = app.secretStorage.getSecret(instance.apiKeyName);
	if (!apiKey || apiKey.trim() === '') {
		throw new Error(`API key for ${instance.instanceUrl} is empty.`);
	}
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Authorization: apiKey,
		Pragma: 'no-cache',
	};
	const url = new URL('/api/2/entities', instance.instanceUrl);
	url.searchParams.set('filter:dataset', collection.name);
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

	report += '';
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
