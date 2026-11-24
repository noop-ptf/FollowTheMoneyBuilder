export class UIState {
	focusedEntity = $state<string | null>(null);

	forget(entityId: string): void {
		if (this.focusedEntity === entityId) {
			this.focusedEntity = null;
		}
	}
}
