// Simple in-memory store for electron auth sessions
// In production, this would be stored in a database or Redis

interface ElectronSession {
  electronAppId: string;
  userId?: string;
  tokenIdentifier?: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

class ElectronAuthStore {
  private sessions: Map<string, ElectronSession> = new Map();

  create(electronAppId: string): ElectronSession {
    const session: ElectronSession = {
      electronAppId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      isActive: true,
    };
    this.sessions.set(electronAppId, session);
    return session;
  }

  get(electronAppId: string): ElectronSession | undefined {
    const session = this.sessions.get(electronAppId);
    if (session && session.expiresAt < Date.now()) {
      this.sessions.delete(electronAppId);
      return undefined;
    }
    return session;
  }

  update(electronAppId: string, updates: Partial<ElectronSession>): boolean {
    const session = this.get(electronAppId);
    if (!session) return false;
    
    Object.assign(session, updates);
    this.sessions.set(electronAppId, session);
    return true;
  }

  delete(electronAppId: string): boolean {
    return this.sessions.delete(electronAppId);
  }

  getAll(): ElectronSession[] {
    // Clean up expired sessions
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
    return Array.from(this.sessions.values());
  }

  clear(): void {
    this.sessions.clear();
  }
}

// Create a singleton instance
export const electronAuthStore = new ElectronAuthStore();
