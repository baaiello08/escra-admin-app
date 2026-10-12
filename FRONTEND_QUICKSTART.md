# Frontend Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Quick Start (3 Steps)

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, TypeScript, Tailwind CSS, and other dependencies.

### 3. Run Development Server

```bash
npm run dev
```

The frontend will start on **http://localhost:3000**

## Optional: Configure API URL

If your backend is running on a different URL, create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Full Stack

To see the frontend connected to the backend API:

### Terminal 1: Start Backend & MongoDB
```bash
# From project root
make up
```

### Terminal 2: Start Frontend
```bash
# From project root
cd frontend
npm install  # First time only
npm run dev
```

## What You'll See

1. **Landing Page** (http://localhost:3000)
   - Welcome page with links to admin sections

2. **Admin Dashboard** (http://localhost:3000/admin)
   - Dashboard with overview cards
   - Sidebar navigation

3. **Indexer Page** (http://localhost:3000/admin/indexer)
   - Real-time Escra Indexer status
   - Current round, lag, configuration
   - Auto-refreshes every 5 seconds

4. **Persona Page** (http://localhost:3000/admin/persona)
   - Identity verification management (placeholder UI)

5. **Other Admin Pages** (placeholder UIs)
   - Tenants
   - Users
   - Ledger, Contracts, Billing, Security, Operations

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
npm run dev -- -p 3001
```

### API Connection Errors
- Make sure backend is running (`make up` from project root)
- Check backend is accessible at http://localhost:8000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches your backend URL

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── admin/        # Admin dashboard pages
│   │   │   ├── indexer/  # Escra Indexer page
│   │   │   ├── persona/  # Persona management
│   │   │   └── layout.tsx # Admin layout with sidebar
│   │   └── page.tsx      # Landing page
│   ├── components/       # React components
│   │   └── AdminSidebar.tsx
│   └── lib/             # Utilities
│       └── api.ts       # API client
├── package.json
└── tailwind.config.ts   # Tailwind CSS config
```

## Features

✅ Next.js 14 with App Router  
✅ TypeScript for type safety  
✅ Tailwind CSS for styling  
✅ React Query for data fetching  
✅ Responsive admin layout  
✅ Real-time Indexer status dashboard  
✅ Ready for API integration  

