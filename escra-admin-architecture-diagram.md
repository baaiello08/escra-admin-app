# Escra Admin Portal – High-Level Architecture

```mermaid
flowchart LR
  %% ======================================================
  %% CLIENT LAYER
  %% ======================================================
  subgraph Client[Client]
    AdminUI[Escra Admin Portal
Next.js / React / TypeScript]
  end

  %% ======================================================
  %% AWS CLOUD & CORE INFRA
  %% ======================================================
  subgraph AWS[AWS Cloud]
    subgraph Network[AWS VPC / Networking]
      ALB[Application Load Balancer
(HTTPS)]
    end

    subgraph ECS[ECS Cluster / Compute]
      subgraph BackendSvc[Escra Admin Backend
Python API Service]
        API[API Layer
REST/GraphQL Controllers]
        Services[Domain Services
(Tenant, Users, Ledger, Billing...)]
        Repos[Repositories
MongoDB Data Access]
        AuthRBAC[Auth & RBAC Middleware]
        Audit[Audit & Logging Hooks]
      end

      Workers[Background Workers
(Node.js/Python)
Indexer / Jobs / Notifications]
    end

    Mongo[(MongoDB Cluster)]
    Vault[(HashiCorp Vault / AWS Secrets Manager)]
    Queue[(Message Queue
SQS / RabbitMQ)]
    Logs[(Centralized Logs
CloudWatch / Logging Stack)]
    Metrics[(Metrics & Traces
CloudWatch / Prometheus / OTEL)]
  end

  %% ======================================================
  %% EXTERNAL INTEGRATIONS
  %% ======================================================
  subgraph External[External Systems]
    Algorand[Algorand Blockchain
Contract & Document Apps]
    IdP[Identity Providers
SSO / IdV / HRIS]
    Payments[Payment Processor
(Billing)]
  end

  %% ======================================================
  %% CI/CD PIPELINE
  %% ======================================================
  CI[CI/CD Pipeline
(GitHub Actions / GitLab CI)]

  %% ======================================================
  %% FLOWS
  %% ======================================================

  %% Client to Backend
  AdminUI -->|HTTPS| ALB --> BackendSvc

  %% Backend internals
  API --> Services --> Repos
  API --> AuthRBAC
  Services --> Audit

  %% Backend to Data & Infra
  Repos --> Mongo
  BackendSvc --> Vault
  BackendSvc --> Queue
  BackendSvc --> Logs
  BackendSvc --> Metrics

  %% Workers to Data & External
  Workers --> Mongo
  Workers --> Vault
  Workers --> Logs
  Workers --> Metrics
  Workers --> Algorand

  %% On-chain from backend
  BackendSvc --> Algorand

  %% Identity & Billing
  BackendSvc --> IdP
  BackendSvc --> Payments

  %% CI/CD artifact & deploy path
  CI -->|Build & Push Images| BackendSvc
  CI -->|Build & Push Images| Workers
  CI -->|Deploy Frontend| AdminUI
  CI -->|Infra as Code / Deploy| AWS
```
