# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React (TanStack Start), Supabase, Tailwind CSS + shadcn/ui

## Users

**Primary: ENE Finance & Administration Team**
- Finance staff managing budgets, payments, and revenue tracking
- Operations admins coordinating expeditions and resources
- Stakeholders requiring reporting and financial visibility

**Secondary: Expedition Coordinators & Operators**
- Sandra (primary operator) and coordinators managing day-to-day logistics
- Use the system for itinerary details, passenger tracking, and operational notes

## Product Purpose

Replace manual Excel workflows with unified software for expedition operations and financial management. Centralize passenger documentation (passports, visas), hotel/provider data, expedition itineraries, and financial tracking to enable faster decision-making, reduce errors, and provide real-time visibility into expedition health and revenue.

## Positioning

**Integrated Intelligence:** Combines passenger documents, hotel inventory, itinerary logic, and financial data in a single system with AI-powered data extraction (Claude) and automation (n8n). Generic tools (Excel, Airtable, basic CRMs) cannot unify these domains or extract structured data from passport/visa documents at scale. The system is domain-specific to nature expeditions (visa requirements, seasonal routes, naturalist coordination) and operationally specialized (field-ready, compliance-focused).

## Operating Context

**Workflows:**
- Financial: Income tracking (per expedition/passenger), provider payment reconciliation, budget vs. actual reporting
- Operations: Expedition calendar and availability (bloques), itinerary creation and customization, passenger document collection and validation, provider coordination
- Reporting: Financial dashboards, passenger manifests, operational metrics

**Environments:**
- Desktop: Finance staff in office environments
- Tablet: Field operators (less frequent, but required for availability checks and notes in remote areas)
- Operationally: Integrates with n8n for automations and Claude for document extraction; Supabase as source of truth for data

## Capabilities and Constraints

**Core Features:**
- Expedition management (dates, passenger capacity, pricing, status)
- Passenger tracking with document upload and validation (passports, visas, travel insurance)
- Hotel inventory (169 hotels with photos and rates)
- Itinerary customization and templating
- Financial dashboards and reports (income, payments, provider costs)
- Provider (airline, hotel, transportation) management
- Roles: admin, coordinator, operator (permissions unclear; may need definition)

**Technical Constraints:**
- Supabase for database (single source of truth)
- n8n workflows for automation (workflows must remain stable)
- Claude integrations for document extraction (API-based)
- Existing codebase uses React 19, TanStack Start, Radix UI components

**Data Constraints:**
- Highly sensitive: passport scans, visa information, payment records
- MUST comply with data protection regulations (export/storage restrictions may apply)
- Passenger photos and personal information require careful handling

## Brand Commitments

**Voice:** Professional, reliable, enabling. ENE is facilitating efficient expedition management—not inserting corporate branding. The system should feel like a tool that *enables* the user's work, not a corporate product.

**Tone of Design:** Adventurous but professional. Clean, uncluttered, natural colors reflecting the expedition context.

**Color Palette (DESIGN.md):**
- Primary Green (#2D5016): nature, stability
- Accent Orange (#E67E22): adventure, energy
- Supporting: Success green, warning, error

**Typography:** Inter (headings bold, body regular), Fira Code for data/technical output

## Evidence on Hand

- 169 hotels catalogued with photos and rates
- Supabase instance with expedition, passenger, and financial data
- n8n workflows for operational automation
- Existing back-office UI with multiple screens (calendar, operations, providers, itineraries, payments, notes)
- Integration points: Claude API (document extraction), Supabase Auth, Lovable (design-to-code)

## Product Principles

1. **Integrated over Fragmented:** One source of truth for operations + financials eliminates manual reconciliation and sync errors
2. **Intelligence over Manual Data Entry:** AI-powered extraction and n8n automation reduce operator burden and human error
3. **Compliance by Default:** Passenger docs and sensitive data handled with privacy and regulatory requirements built in, not bolted on
4. **Field-Ready Design:** Interfaces work on tablets in remote areas, not desktop-only
5. **Enabler, Not Obstacle:** Clear workflows and fast operations; the system removes friction, doesn't add it

## Accessibility & Inclusion

- Spanish language support required (system currently in Spanish)
- Must be usable on tablets with touchscreen interaction
- Field operators may have limited connectivity (offline capabilities or graceful degradation needed where applicable)
