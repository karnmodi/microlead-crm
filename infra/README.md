# Optional local data stores

This folder is **developer convenience only**. microlead-crm is designed to run against **any** PostgreSQL and Redis you choose: managed (Supabase, Neon, Upstash, RDS, …), native local installs, or the compose file here.

## docker-compose.yml

Starts PostgreSQL and Redis on default ports:

- Postgres: `localhost:5432` (user/password/db: see compose file)
- Redis: `localhost:6379`

From this directory:

```bash
docker compose up -d
```

Copy the root `.env.example` to `.env` and align `DATABASE_URL`, `DIRECT_URL`, and `REDIS_URL` with your actual endpoints. For this compose stack, the example values match the default Postgres service.

To tear down (removes containers; add `-v` to drop the Postgres volume):

```bash
docker compose down
```

## When not to use Compose

If you already use Supabase + Upstash (or similar), point `.env` at those URLs and skip Compose entirely. No feature assumes Docker is installed.
