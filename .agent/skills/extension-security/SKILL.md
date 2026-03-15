---
name: extension-security
description: Enforce secure Chrome Extension architecture and compliance with Manifest V3 best practices.
---

This skill ensures extension code meets security, privacy, and store compliance standards.

## Security Principles

- Least privilege permissions
- Strict CSP enforcement
- Isolated execution contexts
- Secure messaging patterns

## Mandatory Rules

- Follow Manifest V3 strictly
- Never inject remote scripts
- Avoid inline JavaScript
- Use secure message passing between scripts

## Permissions Policy

Only request permissions when absolutely necessary.

## Data Protection

- Never store sensitive user data in plain text
- Use secure storage APIs
- Avoid exposing tokens in client code

## Anti-Patterns

Never:

- Use unsafe eval or dynamic script injection
- Over-request permissions
- Expose API keys in frontend
