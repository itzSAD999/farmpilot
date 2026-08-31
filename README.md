# FarmPilot

FarmPilot is a mobile-first web application designed for farmers to easily track their farm setup, seasons, estimated costs, and actual expenditures. It provides intelligent estimates based on standard regional benchmarks and allows farmers to track real spending to see where they are saving or overspending. 

## Features
- **Mobile-first UI:** Built to be used in the field with a phone.
- **Offline-capable design:** Can be enhanced with offline support for remote areas.
- **Intelligent Estimates:** Estimates cost of seeds, fertilizers, and labor based on farm size and crop type.
- **Expense Tracking:** Track real-time expenditures and compare them to estimates.
- **Harvest Logging:** Log your yields and revenue at the end of each season.

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

## Database Migrations

The database is managed using Supabase. To run migrations locally and apply them:

1. Link your project to Supabase:
   ```bash
   supabase link --project-ref your_project_ref
   ```
2. Apply migrations:
   ```bash
   supabase db push
   ```

Alternatively, you can run the SQL files in `supabase/migrations/` directly in the Supabase SQL Editor.

## Running Tests

To run the estimate calculation logic tests and ensure they match the data requirements:

```bash
npm run test
```

*Note: You may need to ensure `vitest` is installed or run `npx vitest` if configured in package.json.*

## Deployment

The application is deployed on Vercel. 

**Live URL:** [https://farmpilot.vercel.app](https://farmpilot.vercel.app) *(Update this with your actual Vercel domain once deployed)*

### Vercel Deployment Checklist:
1. Connect your GitHub repository to a new Vercel project.
2. In the Vercel project settings, add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy the project.
4. **Crucial:** Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**. Add your new Vercel domain (e.g., `https://your-app.vercel.app`) to the **Redirect URLs** list. Otherwise, authentication will fail in production!
