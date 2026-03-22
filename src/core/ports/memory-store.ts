export interface MemorySnapshot {
  agentStyle: string;
  userStyle: string;
  longTermMemory: string;
}

export interface IMemoryStore {
  ensureMemoryFiles(): void;
  loadSnapshot(): MemorySnapshot;
  buildSystemPrompt(basePrompt?: string): string;
}
