# Vercel deployment

## Required project settings

In [Vercel Project Settings → General](https://vercel.com/docs/projects/project-configuration):

| Setting | Value |
|---------|--------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` (or leave default) |
| **Output Directory** | *(empty — do not set `public`)* |
| **Install Command** | `npm install` |
| **Node.js Version** | 20.x (`.nvmrc` and `package.json#engines` enforce this) |

If **Output Directory** is set to `public`, builds fail with:

`No Output Directory named "public" found after the Build completed`

This repo uses the **Next.js** output (`.next`), not a static `public` export.

## Environment variables

See `.env.local.example`. The app builds and runs in **demo mode** without any env vars.

## Verify locally

```bash
npm ci
npm run build
```
