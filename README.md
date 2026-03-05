# Recipe Organizer

A comprehensive recipe organizer and meal planner built with Next.js and React.

## Features

- 📚 **Recipe Management**: Organize and manage your favorite recipes
- 📅 **Meal Planning**: Plan your weekly meals efficiently  
- 🛒 **Shopping Lists**: Generate shopping lists from your meal plans
- 🔍 **Smart Search**: Find recipes by ingredients, cuisine, or dietary preferences
- 📱 **Responsive Design**: Works great on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand + React Query
- **UI Components**: Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Docker for local development)
- pnpm (recommended) or npm
- Docker and Docker Compose (optional, for local database)

### Quick Start with Docker (Recommended for Local Development)

1. Clone the repository:
```bash
git clone <repository-url>
cd recipe-organizer
```

2. Start the database with Docker:
```bash
docker-compose up -d postgres
```

3. Install dependencies:
```bash
pnpm install
```

4. Set up environment variables:
```bash
cp .env.example .env.local
cp .env.example .env
```
The default configuration is already set up for the Docker database.

5. Set up the database:
```bash
pnpm db:migrate
pnpm db:seed
```

6. Start the development server:
```bash
pnpm dev
```

### Manual Installation (without Docker)

If you prefer to set up PostgreSQL manually:

1. Install and configure PostgreSQL locally
2. Create a database named `recipe_organizer`
3. Follow steps 1, 3-6 from the Docker setup above
4. Update the `DATABASE_URL` in `.env.local` with your local PostgreSQL connection string

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

### Database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed the database with sample data
- `pnpm db:studio` - Open Prisma Studio

### Docker
- `docker-compose up -d postgres` - Start PostgreSQL database
- `docker-compose up -d` - Start all services (PostgreSQL + pgAdmin)
- `docker-compose down` - Stop all services
- `docker-compose logs postgres` - View PostgreSQL logs

## Docker Services

The `docker-compose.yml` includes the following services:

### PostgreSQL Database
- **Port**: 5432
- **Database**: recipe_organizer
- **User**: postgres
- **Password**: password
- **Persistent data**: Stored in Docker volume

### pgAdmin (Database Management)
- **Port**: 8080
- **URL**: http://localhost:8080
- **Email**: admin@recipe-organizer.com
- **Password**: admin
- **Purpose**: Web-based PostgreSQL administration tool

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Basic UI components
│   ├── layout/         # Layout components
│   └── features/       # Feature-specific components
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
└── styles/             # Global styles
```

## Development

This project follows the single-user development approach for Phase 1. Authentication and multi-user features will be added in Phase 2.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.