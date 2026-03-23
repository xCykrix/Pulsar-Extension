export interface LoginResponse {
  sessionId: string;
  redirect: string;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface SessionSuccessResponse {
  user: SessionUser;
  sessionToken: string;
}

export interface SessionErrorResponse {
  cause?: string;
}
