# Barbershop Booking App

A modern barbershop booking application built with Next.js, Supabase, and Cal.com integration.

## Features

- User authentication with Google OAuth via Supabase
- Booking management through Cal.com integration
- User dashboard for appointment management
- Admin panel for business management
- Responsive design for all devices

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Cal.com account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.local.example` to `.env.local` and fill in your environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app/*` - App router pages and layouts
- `/src/components/*` - Reusable React components
- `/src/lib/*` - Utility functions and configurations
- `/src/middleware.ts` - Auth middleware for protected routes

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Authentication

The app uses Supabase Authentication with Google OAuth. Protected routes include:
- `/dashboard`
- `/profile`
- `/admin`
- `/settings`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT 