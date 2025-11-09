import session from "express-session";
import createMemoryStore from "memorystore";

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function createSessionMiddleware(isDevelopment: boolean) {
  let sessionStore;

  if (isDevelopment || !process.env.DATABASE_URL) {
    // Use in-memory store for development
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: SESSION_MAX_AGE
    });
    console.log('Using MemoryStore for sessions (development mode)');
  } else {
    // Use PostgreSQL store for production
    // To enable: npm install connect-pg-simple
    // Uncomment the following code when connect-pg-simple is installed:
    /*
    import connectPgSimple from 'connect-pg-simple';
    const PgStore = connectPgSimple(session);
    sessionStore = new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
      ttl: SESSION_MAX_AGE / 1000, // in seconds
    });
    console.log('Using PostgreSQL store for sessions (production mode)');
    */

    // Fallback to MemoryStore if PostgreSQL store is not configured
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: SESSION_MAX_AGE
    });
    console.warn('WARNING: Using MemoryStore in production. Install connect-pg-simple for persistent sessions.');
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: 'client-portal.sid',
    cookie: {
      secure: !isDevelopment,
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: isDevelopment ? 'lax' : 'strict'
    },
    store: sessionStore
  });
}
