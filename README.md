## Order Execution Engine

# Overview

This project implements a market order execution engine with DEX routing and real-time WebSocket updates, built using Node.js, Fastify, BullMQ, Redis, and PostgreSQL. 

The system simulates routing trades between Raydium and Meteora, selects the best execution venue, processes orders concurrently using a queue, and streams order lifecycle updates to clients via WebSockets. 

# Order Type Chosen: Market Order

We implemented Market Orders because they:
	•	Execute immediately at the best available price
	•	Simplify routing and execution flow
	•	Are ideal for demonstrating DEX comparison and real-time updates

Extending to Other Order Types
	•	Limit Orders: Store target price and re-queue orders until the price condition is met
	•	Sniper Orders: Trigger execution based on on-chain events such as token launch or liquidity addition 

# Order Execution Flow

1. Order Submission
	•	Client submits an order via POST /api/orders/execute
	•	API validates the request and returns an orderId
	•	Client connects to WebSocket using the orderId to receive live updates

2. Execution Lifecycle (WebSocket Updates)

pending → routing → building → submitted → confirmed / failed

Status              Description  
pending     ===>>   Order received and queued  
routing     ===>>   Comparing Raydium & Meteora prices  
building    ===>>   Preparing transaction.  
submitted   ===>>   Transaction sent (mock)  
confirmed   ===>>   Execution successful  
failed      ===>>   Error after retries  

# DEX Routing Logic

- Fetches price quotes from:  
	•	Raydium  
	•	Meteora  
- Applies realistic price variance (2–5%)
- Selects the DEX with the best execution price
- Logs routing decision for transparency

# Transaction Settlement (Mock)

- Simulates:
	•	Network delay (2–3 seconds)  
	•	Market impact  
	•	Slippage tolerance (basis points)  
- Throws error if slippage exceeds tolerance
- Returns:
	•	txHash  
	•	executedPrice  
	•	slippage %  

# Queue & Concurrency

- BullMQ + Redis
- Up to 10 concurrent orders
- Processes 100+ orders/min
- Retry logic:  
	•	≤ 3 attempts  
	•	Exponential backoff  
- Emits "failed" status after retries exhausted
- Persists failure reason for analysis

# Data Storage

# PostgreSQL

- Stores full order lifecycle:
	•	order_id  
	•	status  
	•	metadata (DEX, price, txHash, slippage)  
	•	failure reasons  
	•	timestamps  

# Redis

- Used for:
	•	BullMQ job queue  
	•	Pub/Sub for WebSocket events  
	•	Active order state caching  

# WebSocket Architecture
	•	Multiple clients per order supported
	•	Late connections receive latest known status
	•	Redis Pub/Sub → Fastify WebSocket fanout
	•	Automatic cleanup on disconnects

# Testing
	•	WebSocket integration test included
	•	Submits multiple orders simultaneously
	•	Validates:
	•	Status transitions
	•	Routing logic
	•	Concurrent execution
	•	WebSocket lifecycle

# Tech Stack

	Layer              	        Technology 
	Runtime         ===>>       Node.js 
	Language        ===>>       TypeScript 
	API             ===>>       Fastify 
	WebSockets      ===>>       @fastify/websocket 
	Queue           ===>>       BullMQ 
	Cache / PubSub  ===>>       Redis 
	Database        ===>>       PostgreSQL (Neon) 
	Testing         ===>>       Axios, ws 

# Installation

1. Install Dependencies

	npm install 

2. Environment Variables

Create .env file:

	REDIS_URL=redis://default:dQo4HFoYJ1rQ6NExofPM9jcGPhsZOMmc@redis-18067.c17.us-east-1-4.ec2.cloud.redislabs.com:18067 
		
	DATABASE_URL=postgresql://neondb_owner:npg_GCofBJK5P2Yw@ep-flat-queen-ad3g8iqh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

3. Running the Project

- Start Redis (Check Whether Redis Connected using ./testing/testRedis.js)

	Terminal: 

		node testing/testRedis.js

	Output:

		PONG

- Start Database (Check Whether Database Connected using ./testing/testDB.js)

	Terminal: 

		node testing/testDB.js

	Output:

		DB connected at: {Date}

- Start API Server

		npm run dev

- Run WebSocket Test

		npx tsx testing/testOrderWS.ts

# API Reference 

1. Submit Order

	POST /api/orders/execute

2. Request Body

	{ 
  		"symbol": "AAPL", 
  		"side": "buy", 
  		"quantity": 10 
	} 

3. Response

	{ 
  		"orderId": "uuid" 
	}

4. WebSocket Updates

	ws://localhost:3000/ws/orders?orderId=<orderId>

# API Documentation 

Postman Link For Order : https://www.postman.com/docking-module-cosmologist-62619236/workspace/task-management-platform/collection/41983922-43d088cf-5e1d-49b1-ad7c-c47407548cbb?action=share&creator=41983922  

Postman Link For WebSocket : https://www.postman.com/docking-module-cosmologist-62619236/workspace/task-management-platform/collection/6944cc290bafdf5c088b3626?action=share&creator=41983922  

# Deployment

- Live API: https://order-execution-engine-vtjn.onrender.com

# Core Architecture

This system is designed as an asynchronous, event-driven order execution engine with real-time status updates. It cleanly separates API ingestion, background execution, state persistence, and client notifications. 

# High-Level Overview

1. Fastify API Server 
	
	•	Accepts order requests

	•	Exposes WebSocket endpoints for live order tracking 

2. BullMQ + Redis
	
	•	Handles asynchronous job processing 
	
	•	Ensures reliability, retries, and concurrency 

3. Worker
	
	•	Performs DEX routing and execution logic 

4. PostgreSQL
	
	•	Persists order lifecycle and metadata 

5. WebSocket Pub/Sub
	
	•	Streams real-time order status updates to clients

## High-Level Deployment Diagram 
	┌─────────────────────────────┐  
	│ Client                      │  
	│ (Postman / Browser / WS)    │  
	└──────────────┬──────────────┘  
	               │ HTTP / WS  
 	              ▼  
	┌──────────────────────────────────────────┐  
	│ Render Web Service (Node.js)             │  
	│                                          │  
	│ ┌──────────────────────────────────────┐ │  
	│ │ Fastify API + WebSocket Server       │ │  
	│ │                                      │ │  
	│ │ POST /api/orders/execute             │ │  
	│ │ GET  /ws/orders?orderId=...          │ │  
	│ └──────────────┬───────────────────────┘ │  
	│                │                         │  
	│ ┌──────────────▼───────────────────────┐ │  
	│ │ BullMQ Worker (same process)         │ │  
	│ │                                      │ │  
	│ │ • Routing (Raydium vs Meteora)       │ │  
	│ │ • Slippage simulation                │ │  
	│ │ • Retry & failure handling           │ │  
	│ └──────────────┬───────────────────────┘ │  
	│                │                         │  
	│ ┌──────────────▼───────────────────────┐ │  
	│ │ Mock DEX Router                      │ │  
	│ │ (Raydium + Meteora)                  │ │  
	│ └──────────────────────────────────────┘ │  
	└──────────────┬──────────────┬────────────┘  
 	               │              │  
 	       Redis (Queue + PubSub) PostgreSQL  
 	       • BullMQ Queue         • Order state  
 	       • WebSocket fanout     • Metadata 

## Order Execution Flow

		Client  
		  │  
		  │ POST /api/orders/execute  
		  ▼  
		API Server  
		  │  
		  │ enqueue job  
		  ▼  
		BullMQ Queue (Redis)  
		  │  
		  │ worker pulls job  
		  ▼  
		Worker  
		  ├─ status: pending  
		  ├─ status: routing  
		  │    ├─ Raydium quote  
		  │    └─ Meteora quote  
		  ├─ status: building  
		  ├─ status: submitted  
		  ├─ execute swap (mock)  
		  ├─ status: confirmed | failed  
		  ▼  
		PostgreSQL  
		  └─ Persist order lifecycle + metadata  
