# Agent Productivity Platform

A multi-component system for enhanced productivity through intelligent screen capture and processing.

## Architecture

### Components

**Electron App** (`/electron`)  
Desktop application providing the main user interface and system integration.

**Local Daemon** (`/daemon`)  
Background service handling screen capture and compression operations.

**Web App** (`/web`)  
Next.js application for web-based access and management.

**Backend** (`/convex`)  
Convex backend managing data persistence and real-time synchronization.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies for all components
npm install

# Start the development environment
npm run dev
```

### Development

Each component can be run independently:

```bash
# Electron app
cd electron && npm run dev

# Local daemon
cd daemon && npm run dev

# Web app
cd web && npm run dev

# Convex backend
npx convex dev
```

## Tech Stack

- **Electron** - Desktop application framework
- **Next.js** - React framework for web app
- **Convex** - Backend as a service
- **TypeScript** - Type safety across all components