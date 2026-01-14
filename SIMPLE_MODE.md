# Simple Mode for WebistzuPDF

Simple Mode is designed for internal organizational use where you want to hide all branding and marketing content, showing only the essential PDF tools for your users.

## What Simple Mode Does

When enabled, Simple Mode will:

- Hide the navigation bar
- Hide the hero section with marketing content
- Hide the features section
- Hide the security/compliance section
- Hide the FAQ section
- Hide the testimonials section
- Hide the support section
- Hide the footer
- Update the page title to "PDF Tools"
- Make the tools section more prominent

## How to Enable Simple Mode

### Method 1: Using Pre-built Simple Mode Image (Recommended)

Use the pre-built Simple Mode image directly:

**Using Docker Hub:**

```bash
docker run -p 3000:8080 ghcr.io/zara-datacenter/webistzupdf-simple:latest
```

**Using GitHub Container Registry:**

```bash
docker run -p 3000:8080 ghcr.io/zara-datacenter/webistzupdf-simple:latest
```

Or with Docker Compose:

```yaml
services:
  webistzupdf:
    # Using Docker Hub
    image: ghcr.io/zara-datacenter/webistzupdf-simple:latest
    # Or using GitHub Container Registry
    # image: ghcr.io/zara-datacenter/webistzupdf-simple:latest
    container_name: webistzupdf
    restart: unless-stopped
    ports:
      - '3000:8080'
```

### Method 2: Using Docker Compose with Build

Build the image locally with Simple Mode enabled:

```bash
docker compose -f docker-compose.dev.yml build --build-arg SIMPLE_MODE=true
docker compose -f docker-compose.dev.yml up -d
```

### Method 3: Using Docker Build

Build the image with the SIMPLE_MODE build argument:

```bash
docker build --build-arg SIMPLE_MODE=true -t webistzupdf-simple .
docker run -p 3000:8080 webistzupdf-simple
```

### Method 4: Using npm Script (Easiest for Local Development)

Use the built-in npm script that handles everything:

```bash
npm run serve:simple
```

This command automatically:

- Sets `SIMPLE_MODE=true`
- Builds the project with Simple Mode enabled
- Serves the built files on `http://localhost:3000`

### Method 5: Using Environment Variables

Set the environment variable before building:

```bash
export SIMPLE_MODE=true
npm run build
npx serve dist -p 3000
```

## 🧪 Testing Simple Mode Locally

### Method 1: Using npm Script (Easiest for Development)

```bash
npm run serve:simple
```

This automatically builds and serves Simple Mode on `http://localhost:3000`.

### Method 2: Using Pre-built Image (Easiest for Production)

```bash
# Pull and run the Simple Mode image
docker pull ghcr.io/zara-datacenter/webistzupdf-simple:latest
docker run -p 3000:8080 ghcr.io/zara-datacenter/webistzupdf-simple:latest
```

Open `http://localhost:3000` in your browser.

### Method 3: Build and Test Locally

```bash
# Build with simple mode
SIMPLE_MODE=true npm run build

# Serve the built files
npx serve dist -p 3000
```

Open `http://localhost:3000` in your browser.

### Method 4: Compare Both Modes

```bash
# Test Normal Mode
docker run -p 3000:8080 ghcr.io/zara-datacenter/webistzupdf:latest

# Test Simple Mode
docker run -p 3001:8080 ghcr.io/zara-datacenter/webistzupdf-simple:latest
```

- Normal Mode: `http://localhost:3000`
- Simple Mode: `http://localhost:3001`

## 🔍 What to Look For

When Simple Mode is working correctly, you should see:

- ✅ Clean "PDF Tools" header (no marketing hero section)
- ✅ "Select a tool to get started" subtitle
- ✅ Search bar for tools
- ✅ All PDF tool cards organized by category
- ❌ No navigation bar
- ❌ No hero section with "The PDF Toolkit built for privacy"
- ❌ No features, FAQ, testimonials, or footer sections

## 📦 Available Docker Images

### Normal Mode (Full Branding)

**Docker Hub:**

- `ghcr.io/zara-datacenter/webistzupdf:latest`
- `ghcr.io/zara-datacenter/webistzupdf:v1.0.0` (versioned)

**GitHub Container Registry:**

- `ghcr.io/zara-datacenter/webistzupdf:latest`
- `ghcr.io/zara-datacenter/webistzupdf:v1.0.0` (versioned)

### Simple Mode (Clean Interface)

**Docker Hub:**

- `ghcr.io/zara-datacenter/webistzupdf-simple:latest`
- `ghcr.io/zara-datacenter/webistzupdf-simple:v1.0.0` (versioned)

**GitHub Container Registry:**

- `ghcr.io/zara-datacenter/webistzupdf-simple:latest`
- `ghcr.io/zara-datacenter/webistzupdf-simple:v1.0.0` (versioned)

## 🚀 Production Deployment Examples

### Internal Company Tool

```yaml
services:
  webistzupdf:
    image: ghcr.io/zara-datacenter/webistzupdf-simple:latest
    container_name: webistzupdf
    restart: unless-stopped
    ports:
      - '80:80'
    environment:
      - PUID=1000
      - PGID=1000
```

## ⚠️ Important Notes

- **Pre-built images**: Use `ghcr.io/zara-datacenter/webistzupdf-simple:latest` for Simple Mode
- **Environment variables**: `SIMPLE_MODE=true` only works during build, not runtime
- **Build-time optimization**: Simple Mode uses dead code elimination for smaller bundles
- **Same functionality**: All PDF tools work identically in both modes
