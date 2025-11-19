import { Injectable } from '@nestjs/common';

/**
 * Service that maps HTTP method + route patterns to success message keys
 * This makes it easy to add new API endpoints by simply adding entries to the routeMap
 */
@Injectable()
export class SuccessMessageService {
  /**
   * Route-to-message-key mapping
   * Format: 'METHOD:/path' => 'MESSAGE_KEY'
   * Supports exact matches and pattern matching for dynamic routes
   */
  private readonly routeMap: Record<string, string> = {
    // User routes
    'POST:/register': 'USER_REGISTERED',
    'GET:/': 'USERS_RETRIEVED',
    'GET:/users': 'USERS_RETRIEVED',
    'POST:/': 'USER_CREATED',
    'POST:/users': 'USER_CREATED',
    'PATCH:/profile/me': 'PROFILE_UPDATED',
    'POST:/profile/me/change-password': 'PASSWORD_CHANGED',
    'GET:/profile/me': 'PROFILE_RETRIEVED',

    // Password reset routes
    'POST:/reset-password/request': 'PASSWORD_RESET_EMAIL_SENT',
    'POST:/reset-password/confirm': 'PASSWORD_CHANGED',

    // Auth routes
    'POST:/login': 'LOGIN_SUCCESS',
    'POST:/logout': 'LOGOUT_SUCCESS',
    'POST:/refresh': 'TOKEN_REFRESHED',
    'POST:/validate': 'TOKEN_VALIDATED',
    'POST:/assign-city-admin': 'CITY_ADMIN_ASSIGNED',
    'GET:/cities': 'USER_CITIES_RETRIEVED',
    'GET:/sessions': 'SESSIONS_RETRIEVED',
    'POST:/sessions/revoke-all': 'ALL_SESSIONS_REVOKED',
    'POST:/guest': 'GUEST_LOGIN_SUCCESS',
    'POST:/guest/register': 'GUEST_CONVERTED',
    'POST:/auth/guest': 'GUEST_LOGIN_SUCCESS',
    'POST:/auth/guest/register': 'GUEST_CONVERTED',

    // Verification routes
    'POST:/verification/send': 'EMAIL_VERIFICATION_SENT',
    'GET:/verification/verify': 'EMAIL_VERIFIED',
    'POST:/verification/verify': 'EMAIL_VERIFIED',
    'POST:/verification/resend': 'EMAIL_VERIFICATION_RESENT',
    'GET:/verification/cancel': 'VERIFICATION_CANCELLED',
    'POST:/verification/cancel': 'VERIFICATION_CANCELLED',
    
    // Tiles routes
    'GET:/tiles': 'TILES_RETRIEVED',
    'GET:/tiles/slug/:slug': 'TILE_RETRIEVED',
    'GET:/tiles/:id': 'TILE_RETRIEVED',
    'POST:/tiles': 'TILE_CREATED',
    'PATCH:/tiles/:id': 'TILE_UPDATED',
    'DELETE:/tiles/:id': 'TILE_DELETED',
    'POST:/tiles/:id/background-image': 'TILE_BACKGROUND_IMAGE_UPLOADED',
    'POST:/tiles/:id/icon-image': 'TILE_ICON_IMAGE_UPLOADED',
  };

  /**
   * Get success message key for a given HTTP method and route path
   * @param method HTTP method (GET, POST, PATCH, DELETE, etc.)
   * @param path Route path (e.g., '/users', '/users/123', '/profile/me')
   * @param statusCode HTTP status code (used for fallback logic)
   * @returns Success message key
   */
  getMessageKey(method: string, path: string, statusCode: number): string {
    // Remove query parameters from path
    const cleanPath = path.split('?')[0];

    // Try exact match first
    const exactKey = `${method}:${cleanPath}`;
    if (this.routeMap[exactKey]) {
      return this.routeMap[exactKey];
    }

    // Try pattern matching for dynamic routes
    for (const [routePattern, messageKey] of Object.entries(this.routeMap)) {
      // Split only on the first colon to separate method from path
      const colonIndex = routePattern.indexOf(':');
      if (colonIndex === -1) continue;
      
      const routeMethod = routePattern.substring(0, colonIndex);
      const routePath = routePattern.substring(colonIndex + 1);
      
      if (routeMethod === method) {
        if (this.matchesRoutePattern(cleanPath, routePath)) {
          return messageKey;
        }
      }
    }

    // Handle specific patterns for dynamic routes
    // UUID pattern - likely GET /:id, PATCH /:id, DELETE /:id
    const uuidPattern = /^\/[a-f0-9-]{36}$/i;
    if (uuidPattern.test(cleanPath)) {
      if (method === 'GET') {
        return 'USER_RETRIEVED';
      }
      if (method === 'PATCH') {
        return 'USER_UPDATED';
      }
      if (method === 'DELETE') {
        return 'USER_DELETED';
      }
    }

    // Pattern for session revoke: /sessions/:sessionId/revoke
    if (method === 'POST' && /\/sessions\/[a-f0-9-]{36}\/revoke$/i.test(cleanPath)) {
      return 'SESSION_REVOKED';
    }

    // Pattern for user restore: /:id/restore
    if (method === 'PATCH' && /\/[a-f0-9-]{36}\/restore$/i.test(cleanPath)) {
      return 'USER_RESTORED';
    }

    // Fallback based on status code
    if (statusCode === 201) {
      return 'OPERATION_SUCCESS';
    }

    // Default fallback
    return 'OPERATION_SUCCESS';
  }

  /**
   * Simple route pattern matching
   * Matches /users/123e4567-e89b-12d3-a456-426614174000 with /users/:id pattern
   * Currently handles UUID patterns, can be extended for other patterns
   */
  private matchesRoutePattern(path: string, pattern: string): boolean {
    // Convert pattern to regex (simple implementation)
    // Replace :id, :sessionId, etc. with UUID pattern
    const uuidPattern = '[a-f0-9-]{36}';
    const regexPattern = pattern
      .replace(/:[^/]+/g, uuidPattern)
      .replace(/\//g, '\\/')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Add a new route mapping (useful for extending in the future)
   * @param method HTTP method
   * @param path Route path
   * @param messageKey Success message key
   */
  addRouteMapping(method: string, path: string, messageKey: string): void {
    this.routeMap[`${method}:${path}`] = messageKey;
  }
}
