# Codenex Images API

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![Auth0](https://img.shields.io/badge/Auth0-Authentication-EB5424?logo=auth0&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Generative%20AI-4285F4?logo=google&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Image%20Storage-3448C5?logo=cloudinary&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?logo=swagger&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Production: https://<your-vercel-domain>.vercel.app

> Paired frontend: Codenex Images UI — https://github.com/Nikunj2003/codenex-images-ui

## Overview
Express + TypeScript API for AI-powered image generation and editing using Google Gemini (NanoBanana). Auth0-ready, Cloudinary integration, MongoDB persistence, Swagger docs, rate limiting, caching, and cron jobs.

## Architecture
- Local/dev: traditional Express server (ts-node/nodemon).
- Production (Vercel): serverless function at `api/[...all].ts` wraps the Express app (`src/app.ts`). All `/api/*` routes, including `/api/docs` and `/api/docs.json`, are served from the serverless runtime. The legacy `index.js` is not used on Vercel.

## Key Features
- Gemini (NanoBanana) image generation & editing endpoints
- Optional JWT auth with Auth0
- Cloudinary helpers for media storage
- MongoDB/Mongoose models & scripts
- Swagger UI at `/api/docs`, JSON at `/api/docs.json`
- Rate limiting, Helmet, CORS, request logging
- Daily usage reset via cron service

## Tech Stack
- Node.js 18+, TypeScript 5, Express
- Auth0 (JWT), Google Gemini (NanoBanana), Cloudinary, MongoDB Atlas
- Swagger (swagger-jsdoc + swagger-ui-express)
- Validation: Zod, express-validator
- Logging: Winston + Morgan (console in serverless)

## Prerequisites
- Node.js 18+
- MongoDB connection string
- API keys: Gemini, and optionally Auth0 & Cloudinary

## Setup
1) Install dependencies
```bash
npm install
```

2) Environment variables
Create a `.env` locally from `.env.example` and fill values:
- `MONGODB_URI` — MongoDB connection string (mongodb or mongodb+srv)
- `GEMINI_API_KEY` — Google Gemini API key
- `CORS_ORIGIN` — comma-separated allowed origins (e.g. `http://localhost:8080`)
- Optional Auth0: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER`
- Optional Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- See `.env.example` for the full list

Security note: Do not commit `.env`. Use Vercel environment variables for production.

## Run locally
Dev server (ts-node + nodemon):
```bash
npm run dev
```
Swagger UI: http://localhost:3000/api/docs

Health check: http://localhost:3000/health

## Build and start (non-serverless runtime)
```bash
npm run build
npm start
```

## Deployment (Vercel)
- This repo includes `vercel.json` and a serverless entry at `api/[...all].ts`.
- Set environment variables in Vercel (Preview/Production):
	- `MONGODB_URI`, `GEMINI_API_KEY`, and any Auth0/Cloudinary vars.
- Deploy via Vercel dashboard or CLI (`vercel`, `vercel --prod`).
- Endpoints in production:
	- `/api/health`
	- `/api/docs` (Swagger UI)
	- `/api/docs.json` (OpenAPI JSON)

Notes for serverless:
- File-based logging is disabled; logs go to console (Vercel logs). Local/dev still writes to `logs/`.
- Ensure MongoDB Atlas allows connections from Vercel (IP allowlist or 0.0.0.0/0 for testing).

## Project Scripts
- `dev` — nodemon + ts-node on `src/server.ts`
- `build` — compile TypeScript to `dist`
- `start` — run `dist/server.js` (non-serverless)
- `cleanup:db` — housekeeping generations
- `migrate:db` — migrate generation documents

## API Docs
- OpenAPI generated via swagger-jsdoc from code annotations.
- Swagger UI at `/api/docs`; JSON at `/api/docs.json`.

## License
MIT — see LICENSE