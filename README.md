# Guidepost - Agentic Analysis Harness

A demo web application for healthcare directory use case analysis with real AI agent integrations.

## Features

- **Query Generation**: Generate natural language queries from provider data
- **Real Agent Integration**: Run queries through OpenAI, xAI, and Gemini agents
- **Analytics**: Visualize agent performance with charts and data grids
- **Local Storage**: Queries and runs persisted in browser localStorage

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript, Material-UI v5, Recharts
- **Backend**: Node.js + Express + TypeScript
- **AI Providers**: OpenAI, xAI (Grok), Google Gemini

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server
npm install
cd ..
```

3. Configure API keys:
```bash
cd server
cp .env.example .env
```

Edit `server/.env` and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_api_key_here

GEMINI_API_KEY=**not currently supported**

```

You can use any subset of these keys. Agents without keys will show errors in the UI.

4. Start both client and server:
```bash
npm run dev
```

This will start:
- Client on `http://localhost:5173`
- Server on `http://localhost:8787`

### Building for Production

```bash
npm run build
cd server
npm run build
```

## Project Structure

```
guidepost/
  src/                    # Frontend React app
    app/
      App.tsx             # Main app component with tabs
      theme.ts           # MUI theme configuration
    pages/
      QueryPage.tsx      # Query generation interface
      AnalyzePage.tsx    # Agent analysis interface
    lib/                  # Client utilities
      types.ts           # TypeScript type definitions
      jsonl.ts           # JSONL parsing utilities
      storage.ts         # localStorage utilities
      queryGenerator.ts  # Query generation logic
      scoring.ts         # Scoring functions (placeholder)
  server/                 # Backend Express server
    src/
      server.ts          # Express server and routes
      adapters/          # AI provider adapters
        openai.ts        # OpenAI adapter
        xai.ts           # xAI adapter
        gemini.ts        # Gemini adapter
      types.ts           # Server type definitions
      utils.ts           # Utility functions
  public/
    data/
      guidepost.config.json  # Configuration file
      providers.jsonl        # Provider data (JSONL format)
```

## Usage

1. **Query Tab**: 
   - View summary of loaded config and providers
   - Generate queries by specifying a count
   - View and copy generated queries

2. **Analyze Tab**:
   - Select agents to run (checkboxes for OpenAI, xAI, Gemini)
   - Configure model names for each agent (defaults provided)
   - Click "Go" to run selected agents on all queries
   - View analytics charts (run count, average latency)
   - Filter and explore agent runs in the data grid

## API Endpoints

The server provides two endpoints:

- `POST /api/run` - Run agents on a single query
- `POST /api/run-batch` - Run agents on multiple queries (used by the UI)

## Security

- API keys are stored server-side only in `server/.env`
- The browser never sees API keys
- CORS is configured to only allow requests from `http://localhost:5173`

## Data Format

- **Config**: JSON file with prefixes and provider attributes
- **Providers**: JSONL format (one JSON object per line)
- **Queries**: Stored in localStorage as JSON array
- **Runs**: Stored in localStorage as JSON array

## Notes

- All data persistence uses localStorage (browsers cannot write to disk)
- Agents without API keys will show error messages in the runs table
- The server handles timeouts (15s) and retries (once on 429/5xx errors)
- JSON parsing is attempted from agent outputs automatically
