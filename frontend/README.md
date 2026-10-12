# Escra Admin Portal Frontend

Next.js + React + TypeScript admin UI for Escra platform.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

- Global super-admin and tenant-admin layouts
- Domain sections: Tenants, Users, Persona, Indexer, Ledger, Contracts, Billing, Security, Ops
- React Query for data fetching
- Tailwind CSS for styling
- TypeScript for type safety

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── admin/        # Admin dashboard pages
│   └── layout.tsx    # Root layout
├── components/       # Reusable React components
└── lib/             # Utilities and API client
```

