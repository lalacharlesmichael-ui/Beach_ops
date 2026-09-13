# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Beach_ops

## Supabase setup

Create `.env.local` from `.env.example` and fill in the public Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run `supabase/schema.sql` in the Supabase SQL Editor before using the app. If the tables already exist but browser writes are blocked, run `supabase/browser-access-policies.sql`.

## Deployment

Vite reads `VITE_*` variables at build time. Add these same variables in the deployment host, such as Vercel, Netlify, Render, or Cloudflare Pages, for the production environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After changing them, redeploy the site. `.env.local` is intentionally ignored by git and will not be included in the deployed build.
