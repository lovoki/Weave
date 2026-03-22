export interface IBlobStore {
  store(content: unknown): Promise<{ content: unknown; blobRef?: string }>;
  get(blobRef: string): Promise<unknown>;
}
