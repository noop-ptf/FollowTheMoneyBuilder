import type { Entity } from '@opensanctions/followthemoney';

export interface OpenAlephCollection {
	id: string;
	name: string;
	label: string;
	writeable: boolean;
	instanceId: string;
	summary?: string;
}

export interface OpenAlephCollectionApiResult {
	status: string;
	total: number;
	results: Omit<OpenAlephCollection, 'instanceId'>[];
}

export interface OpenAlephEntityApiResult {
	status: string;
	total: number;
	results: Entity[];
}

export interface FTMBuilderPluginSettings {
	importFolder: string;
	instances: OpenAlephInstanceSettings[];
}

export interface OpenAlephInstanceSettings {
	id: string;
	name: string;
	instanceUrl: string;
	apiKeyName: string;
	enabled: boolean;
	connectionValid: boolean;
}
