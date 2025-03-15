import session from "express-session";
import createMemoryStore from "memorystore";

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function createSessionMiddleware(isDevelopment: boolean) {
  const MemoryStore = createMemoryStore(session);
  
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
    store: new MemoryStore({
      checkPeriod: SESSION_MAX_AGE // Cleanup expired sessions
    })
  });
}
