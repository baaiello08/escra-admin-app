# Environment Setup Guide

This guide explains how to set up environment variables for the Escra Admin Portal.

## Environment Files

Copy the appropriate example file and fill in your values:

```bash
# Local development
cp .env.local.example .env.local

# Development environment
cp .env.dev.example .env.dev

# Staging environment
cp .env.staging.example .env.staging

# Production environment
cp .env.prod.example .env.prod
```

## Required Variables

### Application
- `ENVIRONMENT` - Environment name (development, staging, production)
- `SECRET_KEY` - Secret key for JWT signing (use a strong random string)
- `DEBUG` - Debug mode (true/false)

### MongoDB
- `MONGODB_URL` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name
- `MONGO_ROOT_USERNAME` - MongoDB root username (for local development)
- `MONGO_ROOT_PASSWORD` - MongoDB root password (for local development)

### Persona Identity Verification
- `PERSONA_API_KEY` - Your Persona API key
- `PERSONA_WEBHOOK_SECRET` - Secret for verifying Persona webhooks

### Algorand
- `ALGORAND_NETWORK` - Network (testnet, mainnet)
- `ALGORAND_INDEXER_URL` - Algorand indexer API URL
- `ALGORAND_NODE_URL` - Algorand node API URL

### Secrets Management (Production)
- `AWS_SECRETS_MANAGER_ENABLED` - Enable AWS Secrets Manager
- `AWS_REGION` - AWS region
- `AWS_SECRETS_PREFIX` - Prefix for secrets in Secrets Manager

OR

- `VAULT_ENABLED` - Enable HashiCorp Vault
- `VAULT_URL` - Vault server URL
- `VAULT_TOKEN` - Vault authentication token

## Local Development Example

```bash
# .env.local
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URL=mongodb://admin:changeme@localhost:27017/escra_admin?authSource=admin
MONGODB_DB_NAME=escra_admin
PERSONA_API_KEY=your-persona-api-key
PERSONA_WEBHOOK_SECRET=your-webhook-secret
ALGORAND_NETWORK=testnet
ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
ALGORAND_NODE_URL=https://testnet-api.algonode.cloud
INDEXER_ENABLED=true
```

## Security Notes

- **Never commit `.env` files to version control**
- **Use strong, random secret keys in production**
- **Store production secrets in AWS Secrets Manager or Vault**
- **Rotate secrets regularly**
- **Use different secrets for each environment**

