export interface SessionRecord {
  id: string;
  title: string;
  head_execution_id?: string | null;
  created_at?: string;
}

export interface ExecutionRecord {
  id: string;
  session_id: string;
  parent_execution_id?: string | null;
  forked_at_node?: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INTERCEPTED';
  created_at?: string;
}

export interface WalEventRecord {
  id?: number;
  execution_id: string;
  node_id?: string | null;
  event_type: string;
  payload: string; // JSON string
  created_at?: string;
}

export interface IWalDao {
  upsertSession(session: SessionRecord): void;
  getSession(id: string): SessionRecord | undefined;
  updateSessionHead(sessionId: string, headExecutionId: string): void;
  getSessions(cursor?: string, limit?: number): SessionRecord[];
  
  insertExecution(exec: ExecutionRecord): void;
  updateExecutionStatus(id: string, status: ExecutionRecord['status']): void;
  getExecution(id: string): ExecutionRecord | undefined;
  getSessionExecutions(sessionId: string, cursor?: string, limit?: number): ExecutionRecord[];
  
  insertEdge(execId: string, sourceNodeId: string, targetNodeId: string, kind: string): void;
  
  insertBlackboardMessage(id: string, sessionId: string, role: string, content: string): void;
  getBlackboardMessage(id: string): { content: string; role: string } | undefined;
  
  insertWalEvent(event: WalEventRecord): void;
  getAncestorsWalEvents(execId: string, targetNodeId: string): WalEventRecord[];
  getExecutionWalEvents(execId: string): WalEventRecord[];
}
