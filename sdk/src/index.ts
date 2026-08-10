/**
 * Official TypeScript SDK for the Mintie SSO API.
 *
 * @example
 * ```ts
 * import { MintieClient } from "@mintie/sso";
 *
 * const mintie = new MintieClient({ apiKey: process.env.MINTIE_API_KEY! });
 * const { data } = await mintie.connections.list({ status: "active" });
 * ```
 *
 * @packageDocumentation
 */

/** Lifecycle status of an SSO connection. */
export type ConnectionStatus = "active" | "pending" | "disabled";

/** Identity provider type backing a connection. */
export type IdentityProvider = "okta" | "google-workspace" | "generic-saml";

/** Configuration options for {@link MintieClient}. */
export interface MintieClientOptions {
  /** API key created in the Mintie dashboard. */
  apiKey: string;
  /**
   * Base URL of the Mintie SSO API.
   *
   * @defaultValue `"https://api.mintie.example/v1"`
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds.
   *
   * @defaultValue `10000`
   */
  timeoutMs?: number;
}

/** An SSO connection linking an identity provider to your organization. */
export interface Connection {
  /** Unique identifier of the connection. */
  id: string;
  /** Human-readable name shown on the sign-in page. */
  name: string;
  /** Identity provider type backing the connection. */
  provider: IdentityProvider;
  /** Lifecycle status of the connection. */
  status: ConnectionStatus;
  /** Email domains routed to this connection during sign-in. */
  domains: string[];
  /** ISO 8601 timestamp when the connection was created. */
  createdAt: string;
}

/** Fields for creating a new SSO connection. */
export interface CreateConnectionParams {
  /** Human-readable name shown on the sign-in page. */
  name: string;
  /** Identity provider type backing the connection. */
  provider: IdentityProvider;
  /** Email domains routed to this connection during sign-in. */
  domains: string[];
  /**
   * URL of the identity provider's SAML metadata document.
   * Required for `generic-saml` connections.
   */
  metadataUrl?: string;
}

/** Filters for listing SSO connections. */
export interface ListConnectionsParams {
  /** Only return connections with this lifecycle status. */
  status?: ConnectionStatus;
  /**
   * Maximum number of connections to return.
   *
   * @defaultValue `20`
   */
  limit?: number;
}

/** A page of results returned by list endpoints. */
export interface Page<T> {
  /** Items in this page. */
  data: T[];
  /** Whether more items exist beyond this page. */
  hasMore: boolean;
}

/** Error thrown when the Mintie SSO API returns a non-2xx response. */
export class MintieError extends Error {
  /** Machine-readable error code, such as `not_found`. */
  readonly code: string;
  /** HTTP status code of the response. */
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "MintieError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Access to the `/connections` endpoints.
 *
 * Available as {@link MintieClient.connections}.
 */
export class ConnectionsResource {
  private readonly client: MintieClient;

  constructor(client: MintieClient) {
    this.client = client;
  }

  /**
   * List SSO connections in your organization, ordered by creation date.
   *
   * @param params - Optional status filter and page size.
   * @returns A page of connections.
   */
  async list(params?: ListConnectionsParams): Promise<Page<Connection>> {
    return this.client.request("GET", "/connections", { query: { ...params } });
  }

  /**
   * Fetch a single SSO connection by ID.
   *
   * @param connectionId - Unique identifier of the connection.
   * @throws {@link MintieError} with code `not_found` if the connection does not exist.
   */
  async get(connectionId: string): Promise<Connection> {
    return this.client.request("GET", `/connections/${connectionId}`);
  }

  /**
   * Create a new SSO connection.
   *
   * The connection starts in `pending` status until the identity provider
   * metadata is verified.
   *
   * @param params - Fields for the new connection.
   * @returns The created connection.
   */
  async create(params: CreateConnectionParams): Promise<Connection> {
    return this.client.request("POST", "/connections", { body: params });
  }

  /**
   * Permanently delete an SSO connection.
   *
   * Users who signed in through this connection keep their accounts but must
   * use another sign-in method.
   *
   * @param connectionId - Unique identifier of the connection.
   */
  async delete(connectionId: string): Promise<void> {
    await this.client.request("DELETE", `/connections/${connectionId}`);
  }
}

/**
 * Access to the `/sessions` endpoints.
 *
 * Available as {@link MintieClient.sessions}.
 */
export class SessionsResource {
  private readonly client: MintieClient;

  constructor(client: MintieClient) {
    this.client = client;
  }

  /**
   * Revoke an active user session. The user is signed out on their next request.
   *
   * @param sessionId - Unique identifier of the session.
   * @throws {@link MintieError} with code `not_found` if the session does not exist.
   */
  async revoke(sessionId: string): Promise<void> {
    await this.client.request("DELETE", `/sessions/${sessionId}`);
  }
}

/**
 * Client for the Mintie SSO API.
 *
 * @example
 * ```ts
 * const mintie = new MintieClient({ apiKey: "mintie_sk_..." });
 *
 * const connection = await mintie.connections.create({
 *   name: "Acme Okta",
 *   provider: "okta",
 *   domains: ["acme.com"],
 * });
 * ```
 */
export class MintieClient {
  /** Access to the `/connections` endpoints. */
  readonly connections: ConnectionsResource;
  /** Access to the `/sessions` endpoints. */
  readonly sessions: SessionsResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: MintieClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.mintie.example/v1";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.connections = new ConnectionsResource(this);
    this.sessions = new SessionsResource(this);
  }

  /**
   * Send an authenticated request to the Mintie SSO API.
   *
   * Resource classes call this internally; use it directly only for endpoints
   * not yet covered by the SDK.
   *
   * @param method - HTTP method.
   * @param path - Path relative to the base URL, such as `/connections`.
   * @param options - Optional query parameters and JSON body.
   * @throws {@link MintieError} when the API returns a non-2xx response.
   */
  async request<T>(
    method: string,
    path: string,
    options?: { query?: Record<string, unknown>; body?: unknown },
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(options?.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;
      throw new MintieError(
        error?.code ?? "unknown_error",
        response.status,
        error?.message ?? `Request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
