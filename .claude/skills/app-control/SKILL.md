---
name: app-control
description: Start or stop the Recipe Organizer application and PostgreSQL database
argument-hint: [start|stop]
disable-model-invocation: true
allowed-tools: Bash
---

# Recipe Organizer App Control

Control the Recipe Organizer application and its PostgreSQL database.

## Usage

Start the application and database:
```
/app-control start
```

Stop the application:
```
/app-control stop
```

Stop both the application and database:
```
/app-control stop-all
```

## Implementation

When starting ($ARGUMENTS = "start"):
1. Start the PostgreSQL database: `docker-compose up -d postgres`
2. Wait 2 seconds for database to be ready
3. Start the Next.js dev server: `pnpm dev`
4. Confirm the app is running on http://localhost:3000

When stopping ($ARGUMENTS = "stop"):
1. Find the process on port 3000: `lsof -ti:3000`
2. Kill the Next.js process
3. Confirm the app has stopped

When stopping all ($ARGUMENTS = "stop-all"):
1. Find and kill the process on port 3000
2. Stop all Docker services: `docker-compose down`
3. Confirm both services have stopped

## Notes

- The database runs in Docker and must be started before the app
- The app runs on port 3000 by default
- Database data persists in Docker volumes between restarts
- Use `stop-all` to completely shut down the development environment
