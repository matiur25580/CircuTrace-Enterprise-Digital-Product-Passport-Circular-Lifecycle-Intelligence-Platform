export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthContext {
  userId: string;
  sessionId: string;
  user: AuthUser;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}
