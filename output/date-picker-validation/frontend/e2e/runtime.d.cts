export const runtime: {
  webPort: number; apiPort: number; stubPort: number; pgPort: number; redisPort: number; externalPort: number;
  pgContainer: string; redisContainer: string; databaseUrl: string; redisUrl: string;
  apiOrigin: string; stubOrigin: string; web(host?: string): string;
}
