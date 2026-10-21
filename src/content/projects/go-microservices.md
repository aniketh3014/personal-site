---
title: "Go microservices: one broker, four transports"
summary: "Five Go services behind a broker, talking over REST, net/rpc, gRPC and RabbitMQ, deployable with Docker Compose, Docker Swarm or Kubernetes."
problem: "Tutorials usually show one way for services to talk and one way to deploy them. I wanted to run the same small system over several transports and three orchestrators, and see what actually changes between them."
stack:
  [
    Go,
    gRPC,
    RabbitMQ,
    PostgreSQL,
    MongoDB,
    Docker,
    Kubernetes,
    Docker Swarm,
    Caddy,
  ]
role: "Solo project: design, implementation and deployment"
results:
  - "The same versioned images run under Docker Compose, a Swarm stack, and Kubernetes manifests with an ingress."
  - "Logging works over all four transports, so they can be compared side by side."
  - "Auth service handlers covered by tests against a mocked repository."
repo_url: "https://github.com/aniketh3014/go-logger-email-microservice"
featured: true
order: 2
---

## Architecture

```mermaid
flowchart LR
  accTitle: Microservices architecture
  accDescr: Requests enter through Caddy to a front end and a broker service. The broker calls the authentication service over HTTP, the mail service over HTTP, and logs through the logger service over HTTP, net/rpc, gRPC, or by publishing to RabbitMQ, where a listener service consumes the events. Authentication stores users in PostgreSQL and the logger stores entries in MongoDB.
  C[Caddy] --> FE[Front end]
  C --> B[Broker service]
  B -- HTTP --> AU[Auth service]
  AU --> PG[(PostgreSQL)]
  B -- HTTP --> M[Mail service]
  B -- "HTTP / net/rpc / gRPC" --> L[Logger service]
  B -- "publish: logs_topic" --> MQ[RabbitMQ]
  MQ --> LI[Listener service]
  LI -- HTTP --> L
  L --> MG[(MongoDB)]
```

- **Broker**: the single entry point. It takes a JSON action (`auth`, `log`,
  `mail`) and forwards it to the right service, so clients only know one URL.
- **Auth**: users in PostgreSQL through `database/sql`, passwords checked
  with bcrypt. Data access sits behind a repository interface.
- **Logger**: stores entries in MongoDB and accepts them over HTTP, Go's
  `net/rpc`, and gRPC (contract in `logs.proto`).
- **Events**: the broker can publish log events to a RabbitMQ topic exchange
  instead; the listener service consumes them and calls the logger.
- **Deployment**: each service has its own Dockerfile and versioned image on
  Docker Hub. `proj/` holds a Compose file, a Swarm stack, and Kubernetes
  manifests per service plus an ingress, with Caddy as the reverse proxy.

## Key decisions

- **A broker instead of clients calling services directly.** Services can
  move, split or change protocol without the front end noticing.
- **Several transports for the same operation.** HTTP is simplest to debug,
  RPC and gRPC give typed contracts, and the queue decouples the caller
  from the logger entirely: the broker returns as soon as the event is
  published.
- **Repository interface in the auth service.** Handlers depend on an
  interface, so tests swap in a fake repository instead of a database.
