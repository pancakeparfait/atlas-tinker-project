# Recipe Organizer Docker Environment

## Quick Start

Start the PostgreSQL database for local development:

```bash
# Start just the database
docker-compose up -d postgres

# Or start all services (database + pgAdmin)
docker-compose up -d

# View logs
docker-compose logs -f postgres

# Stop services
docker-compose down
```

## Services

### PostgreSQL Database
- **Container**: `recipe-organizer-postgres`
- **Port**: `5432`
- **Database**: `recipe_organizer`
- **Username**: `postgres`
- **Password**: `password`
- **Data**: Persisted in Docker volume `postgres_data`

### pgAdmin (Optional)
- **Container**: `recipe-organizer-pgadmin`
- **Port**: `8080`
- **URL**: http://localhost:8080
- **Login**: `admin@recipe-organizer.com` / `admin`

## Database Connection

The default `.env.local` is configured to work with this Docker setup:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/recipe_organizer"
```

## Troubleshooting

### Port Conflicts
If port 5432 is already in use:
```bash
# Check what's using the port
lsof -i :5432

# Stop existing PostgreSQL service
brew services stop postgresql
# or
sudo systemctl stop postgresql
```

### Reset Database
To start fresh:
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

### Access Database Directly
```bash
# Connect to database container
docker exec -it recipe-organizer-postgres psql -U postgres -d recipe_organizer

# Or use psql from host (if installed)
psql -h localhost -U postgres -d recipe_organizer
```