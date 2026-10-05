import {
  defineRailway,
  github,
  group,
  image,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac";

const repo = "MentesReprogramadas/divulgadorlink";

function source(rootDirectory: string) {
  return github(repo, {
    branch: "main",
    rootDirectory,
    checkSuites: true,
  });
}

const dockerfile = {
  builder: "DOCKERFILE" as const,
  dockerfilePath: "Dockerfile",
};

export default defineRailway(() => {
  const pgdata = volume("pgdata", { sizeMB: 5120 });
  const postgres = service("postgres", {
    source: image("pgvector/pgvector:pg16", { autoUpdates: { type: "disabled" } }),
    start: '/bin/sh -c "unset PGPORT; docker-entrypoint.sh postgres --port=5432"',
    volumeMounts: {
      "/var/lib/postgresql/data": pgdata,
    },
    env: {
      POSTGRES_USER: "divulgador",
      POSTGRES_DB: "divulgador",
      POSTGRES_PASSWORD: preserve(),
      // O volume nasce com lost+found. initdb recusa um PGDATA não vazio.
      PGDATA: "/var/lib/postgresql/data/pgdata",
    },
  });
  const cache = redis("redis");

  const runtime = {
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    DATABASE_URL:
      "postgresql://divulgador:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/divulgador",
    REDIS_URL: cache.env.REDIS_URL,
    JWT_SECRET: preserve(),
    HDX_API_KEY: preserve(),
    HDX_SERVICE_NAME: "divulgador-links-api",
    STRIPE_SECRET_KEY: preserve(),
    STRIPE_WEBHOOK_SECRET: preserve(),
    WOOVI_APP_ID: preserve(),
    WOOVI_WEBHOOK_PUBLIC_KEY: preserve(),
    OPENAI_API_KEY: preserve(),
    RESEND_API_KEY: preserve(),
    EMAIL_FROM: preserve(),
    APP_PUBLIC_URL: preserve(),
    EMAIL_BRAND_NAME: "Tem Link Aqui",
  };

  const api = service("api", {
    source: source("backend"),
    build: { ...dockerfile, watchPatterns: ["/backend/**"] },
    start: "node build/server.js",
    preDeploy: "npx prisma migrate deploy",
    healthcheck: "/api/v1/actuator/ready",
    healthcheckTimeout: 120,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 5 },
    env: runtime,
  });

  const worker = service("worker", {
    source: source("backend"),
    build: { ...dockerfile, watchPatterns: ["/backend/**"] },
    start: "node build/worker.js",
    preDeploy: "npx prisma migrate deploy",
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 5 },
    env: runtime,
  });

  const web = service("web", {
    source: source("frontend"),
    build: { ...dockerfile, watchPatterns: ["/frontend/**"] },
    start: 'sh -c "HOSTNAME=0.0.0.0 node server.js"',
    healthcheck: "/health",
    healthcheckTimeout: 120,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 5 },
    env: {
      API_ORIGIN: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}",
    },
  });

  return project("divulgadorlink", {
    resources: [group("dados", [postgres, pgdata, cache]), group("app", [api, worker, web])],
  });
});
