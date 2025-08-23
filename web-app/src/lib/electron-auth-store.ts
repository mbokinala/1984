// Shared in-memory store for electron auth sessions
// In production, use Redis or a database

class ElectronAuthStore {
  private static instance: ElectronAuthStore;
  private sessions: Map<string, { sessionToken: string; user: any; timestamp: number }>;

  private constructor() {
    this.sessions = new Map();
    
    // Clean up old sessions periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.sessions.entries()) {
        if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
          console.log(`Cleaning up expired session: ${key}`);
          this.sessions.delete(key);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  static getInstance(): ElectronAuthStore {
    if (!ElectronAuthStore.instance) {
      ElectronAuthStore.instance = new ElectronAuthStore();
    }
    return ElectronAuthStore.instance;
  }

  set(electronAppId: string, sessionToken: string, user: any) {
    console.log(`Storing session for electron app: ${electronAppId}`);
    this.sessions.set(electronAppId, {
      sessionToken,
      user,
      timestamp: Date.now(),
    });
  }

  get(electronAppId: string) {
    const session = this.sessions.get(electronAppId);
    console.log(`Retrieving session for electron app: ${electronAppId}, found: ${!!session}`);
    return session;
  }

  delete(electronAppId: string) {
    console.log(`Deleting session for electron app: ${electronAppId}`);
    this.sessions.delete(electronAppId);
  }

  getAll() {
    return Array.from(this.sessions.entries());
  }
}

export const electronAuthStore = ElectronAuthStore.getInstance();
