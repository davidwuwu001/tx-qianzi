# Product Overview

This is a contract signing management platform built on Tencent E-Sign API. The system enables multi-city contract management with a complete workflow from initiation to signing and approval.

## Core Features

- **Multi-city Management**: Data isolation and template configuration per city
- **Role-based Access**: System Admin, City Admin, and Ordinary User roles
- **Contract Workflow**: Party B signs → City Admin approves → Party A auto-signs
- **Mobile-first**: Optimized mobile interface for ordinary users to initiate and manage contracts
- **Signing Methods**: Generate QR codes, shareable links, and SMS notifications
- **Product-Template Binding**: Products are bound to Tencent E-Sign contract templates

## User Roles

- **System Admin**: Manages all cities, users, products, and global configuration
- **City Admin**: Manages contracts, approvals, and local templates for their assigned city
- **Ordinary User**: Initiates contracts and views their signing records (primarily mobile)

## Contract States

DRAFT → PENDING_PARTY_B → PENDING_PARTY_A → COMPLETED

Alternative states: REJECTED, EXPIRED, CANCELLED
