# SAP API Gateway

A lightweight API Gateway service for the Super Administration Panel microservices architecture.

## Overview

The API Gateway serves as the central entry point for all client requests, routing them to appropriate microservices:

- **Auth Service** (port 3001) - Authentication and authorization
- **User Service** (port 3002) - User management
- **Content Service** (port 5005) - Content management
- **Subscription Service** (port 3003) - Subscription management

## Features

- Request routing and proxy functionality
- Security middleware (Helmet, CORS)
- Request compression
- Health and readiness checks
- Error handling and logging

## Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `/api/auth/*` - Auth service proxy
- `/api/users/*` - User service proxy
- `/api/content/*` - Content service proxy
- `/api/subscriptions/*` - Subscription service proxy

## Environment Variables

- `PORT` - Server port (default: 5001)
- `AUTH_SERVICE_URL` - Auth service URL
- `USER_SERVICE_URL` - User service URL
- `CONTENT_SERVICE_URL` - Content service URL
- `SUBSCRIPTION_SERVICE_URL` - Subscription service URL

## Docker Deployment

```bash
docker build -t sap-api-gateway .
docker run -p 5001:5001 sap-api-gateway
```
