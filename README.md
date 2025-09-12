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

Production (Vercel): https://your-api-domain.vercel.app

> Paired frontend: Codenex Images UI — https://github.com/your-org/codenex-images-ui (replace with your actual repo link)

## overview
An Express + TypeScript API for AI-powered image generation and editing using Google Gemini (NanoBanana). Includes optional Auth0-protected routes, Cloudinary integration, MongoDB persistence, Swagger docs, rate limiting, caching, logging, and scheduled cron jobs.

## features
- Google Gemini (NanoBanana) image generation/editing endpoints
- Optional JWT authentication with Auth0
- Cloudinary upload/management helpers
- MongoDB/Mongoose models and scripts
- Swagger UI at /api/docs and health check at /health
- Rate limiting, Helmet, CORS, and request logging
- Cron job to reset daily usage limits

## tech stack
- Runtime: Node.js 18+, TypeScript 5
- Framework: Express
- Auth: Auth0 (JWT)
- AI: Google Gemini (NanoBanana)
- Media: Cloudinary
- DB: MongoDB (Atlas)
- Docs: Swagger (swagger-jsdoc + swagger-ui-express)
- Validation: Zod, express-validator
- Logging: Winston + Morgan

## prerequisites
- Node.js 18+
- MongoDB URI (Atlas or local)
- API keys as needed: Google Gemini, (optional) Auth0, Cloudinary

## setup
1) Copy env and install deps

```bash
cp .env.example .env
npm install
```

2) Key environment variables
- MONGODB_URI — MongoDB connection string
- GEMINI_API_KEY — Google Gemini API key
- CORS_ORIGIN — comma-separated allowed origins
- Optional Auth0: AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_ISSUER
- Optional Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- See .env.example for the full list

## run locally
- Dev server (ts-node + nodemon):
```bash
npm run dev
```
- Swagger UI: http://localhost:3000/api/docs
- Health check: http://localhost:3000/health

## build and start
```bash
npm run build
npm start
```

## docker (optional)
A Dockerfile (Node 18 alpine) is included. Build and run with your envs.

## deployment (vercel)
This repo includes a GitHub Actions workflow to deploy to Vercel on push to main. Configure repository secrets:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

Workflow uses:
- vercel pull --environment=production
- vercel build --prod
- vercel deploy --prebuilt --prod

Ensure the Vercel project is set up for Node/Serverless API deployments.

## project scripts
- dev — nodemon + ts-node on src/server.ts
- build — compile TypeScript to dist
- start — run dist/server.js
- cleanup:db — housekeeping generations
- migrate:db — migrate generation documents

## api docs
- OpenAPI generated via swagger-jsdoc from annotations
- Swagger UI at /api/docs; JSON at /api/docs.json

## logs and rate limiting
- Logging via Winston (see logs/)
- Rate limiting defaults: 1000 requests per 15 minutes (configurable)

## related
- Frontend (paired): Codenex Images UI — https://github.com/your-org/codenex-images-ui

## license
MIT — see LICENSE