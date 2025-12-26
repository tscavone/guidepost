import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Chip,
  Tooltip,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AgentRun,
  GeneratedQuery,
  AgentAnswer,
  ProviderRecord,
} from "../lib/types";
import { loadQueries, loadRuns, saveRuns, clearRuns } from "../lib/storage";
import { parseJsonl } from "../lib/jsonl";
import RunInspectorDrawer from "../components/RunInspectorDrawer";

const AGENTS = [
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini" },
  { value: "xai", label: "xAI", defaultModel: "grok-2" },
  { value: "gemini", label: "Gemini", defaultModel: "gemini-1.5-pro" },
];

const API_BASE_URL = "http://localhost:8787";

export default function AnalyzePage() {
  const [queries, setQueries] = useState<GeneratedQuery[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [queryFilter, setQueryFilter] = useState<string>("");
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>(
    {
      openai: true,
      xai: false,
      gemini: false,
    }
  );
  const [agentModels, setAgentModels] = useState<Record<string, string>>({
    openai: "gpt-4.1-mini",
    xai: "grok-2",
    gemini: "gemini-1.5-pro",
  });
  const [runCount, setRunCount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<GeneratedQuery | null>(
    null
  );

  useEffect(() => {
    const savedQueries = loadQueries();
    setQueries(savedQueries);
    const savedRuns = loadRuns();
    setRuns(savedRuns);

    // Load providers for name lookup
    const loadProviders = async () => {
      try {
        const providersResponse = await fetch("/data/providers.jsonl");
        if (providersResponse.ok) {
          const providersText = await providersResponse.text();
          const providersData = parseJsonl<ProviderRecord>(providersText);
          setProviders(providersData);
        }
      } catch (err) {
        // Silently fail - provider names just won't show
        console.error("Failed to load providers:", err);
      }
    };
    loadProviders();
  }, []);

  const handleAgentToggle = (agent: string) => {
    setSelectedAgents((prev) => ({
      ...prev,
      [agent]: !prev[agent],
    }));
  };

  const handleModelChange = (agent: string, model: string) => {
    setAgentModels((prev) => ({
      ...prev,
      [agent]: model,
    }));
  };

  const handleRunAgents = async () => {
    if (queries.length === 0) {
      setError(
        "No queries available. Please generate queries in the Query tab first."
      );
      return;
    }

    const activeAgents = AGENTS.filter((agent) => selectedAgents[agent.value]);
    if (activeAgents.length === 0) {
      setError("Please select at least one agent.");
      return;
    }

    if (runCount <= 0) {
      setError("Run count must be greater than 0.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const agentSpecs = activeAgents.map((agent) => ({
        agent: agent.value as "openai" | "xai" | "gemini",
        model: agentModels[agent.value] || agent.defaultModel,
      }));

      // Calculate total possible runs and limit to runCount
      const totalPossibleRuns = queries.length * agentSpecs.length;
      const limitedRunCount = Math.min(runCount, totalPossibleRuns);

      // Calculate how many queries we need to achieve the desired run count
      // Each query runs with all selected agents, so we need ceil(runCount / agentCount) queries
      const queriesNeeded = Math.ceil(limitedRunCount / agentSpecs.length);
      const queriesToRun = queries.slice(0, queriesNeeded);

      const response = await fetch(`${API_BASE_URL}/api/run-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: queriesToRun,
          agents: agentSpecs,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const allNewRuns: AgentRun[] = await response.json();

      // Limit the returned runs to the specified count
      const limitedRuns = allNewRuns.slice(0, limitedRunCount);

      const allRuns = [...runs, ...limitedRuns];
      setRuns(allRuns);
      saveRuns(allRuns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run agents");
    } finally {
      setRunning(false);
    }
  };

  // Calculate analytics
  const agentStats = AGENTS.reduce((acc, agent) => {
    const agentRuns = runs.filter((r) => r.agent === agent.value);
    const avgLatency =
      agentRuns.length > 0
        ? agentRuns.reduce((sum, r) => sum + r.latency_ms, 0) / agentRuns.length
        : 0;

    acc[agent.value] = {
      count: agentRuns.length,
      avgLatency: Math.round(avgLatency),
    };
    return acc;
  }, {} as Record<string, { count: number; avgLatency: number }>);

  const chartData = AGENTS.map((agent) => ({
    agent: agent.label,
    count: agentStats[agent.value]?.count || 0,
    avgLatency: agentStats[agent.value]?.avgLatency || 0,
  }));

  // Filter runs
  const filteredRuns = runs.filter((run) => {
    if (agentFilter && run.agent !== agentFilter) return false;
    if (queryFilter && run.query_id !== queryFilter) return false;
    return true;
  });

  const getProviderName = (providerId: string | null): string => {
    if (!providerId) return "-";
    const provider = providers.find((p) => p.provider_id === providerId);
    if (provider) {
      return `${provider.first} ${provider.last}`;
    }
    return providerId;
  };

  const columns: GridColDef<AgentRun>[] = [
    { field: "run_id", headerName: "Run ID", width: 150 },
    {
      field: "query_id",
      headerName: "Query ID",
      width: 120,
      renderCell: (params) => {
        const query = queries.find((q) => q.query_id === params.row.query_id);
        const queryText = query?.query_text || params.row.query_id;
        return (
          <Tooltip title={queryText} arrow placement="top">
            <span>{params.row.query_id}</span>
          </Tooltip>
        );
      },
    },
    { field: "agent", headerName: "Agent", width: 100 },
    { field: "model", headerName: "Model", width: 150 },
    {
      field: "agent_answer",
      headerName: "Name",
      width: 150,
      renderCell: (params) => {
        const query = queries.find((q) => q.query_id === params.row.query_id);
        return getProviderName(query?.provider_id || null);
      },
    },
    {
      field: "found",
      headerName: "Found",
      width: 80,
      renderCell: (params) => {
        const answer = params.row.agent_answer as AgentAnswer | null;
        if (!answer) return "-";
        return (
          <Chip
            label={answer.found ? "Yes" : "No"}
            color={answer.found ? "success" : "default"}
            size="small"
          />
        );
      },
    },
    {
      field: "extracted_attributes",
      headerName: "Attributes",
      width: 200,
      renderCell: (params) => {
        const answer = params.row.agent_answer as AgentAnswer | null;
        if (!answer || !answer.extracted_attributes) return "-";
        const keys = Object.keys(answer.extracted_attributes);
        if (keys.length === 0) return "-";

        const formatAttributeValue = (value: any): string => {
          if (Array.isArray(value)) {
            return value.join(", ");
          }
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value, null, 2);
          }
          return String(value);
        };

        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {keys.slice(0, 3).map((key) => {
              const value = answer.extracted_attributes[key];
              const formattedValue = formatAttributeValue(value);
              return (
                <Tooltip key={key} title={formattedValue} arrow placement="top">
                  <Chip label={key} size="small" variant="outlined" />
                </Tooltip>
              );
            })}
            {keys.length > 3 && (
              <Tooltip
                title={keys
                  .slice(3)
                  .map(
                    (key) =>
                      `${key}: ${formatAttributeValue(
                        answer.extracted_attributes[key]
                      )}`
                  )
                  .join("\n")}
                arrow
                placement="top"
              >
                <Chip
                  label={`+${keys.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: "latency_ms",
      headerName: "Latency (ms)",
      width: 120,
      type: "number",
    },
    {
      field: "output_text",
      headerName: "Output",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 400,
          }}
          title={params.value}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: "error",
      headerName: "Error",
      width: 200,
      renderCell: (params) =>
        params.value ? (
          <Alert severity="error" sx={{ py: 0, fontSize: "0.75rem" }}>
            {params.value}
          </Alert>
        ) : (
          "-"
        ),
    },
    { field: "created_at", headerName: "Created At", width: 180 },
  ];

  return (
    <Box>
      {queries.length === 0 ? (
        <Alert severity="info">
          No queries found. Please generate queries in the Query tab first.
        </Alert>
      ) : (
        <>
          {/* Run Agents Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Run Agents
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Run selected agents on queries. Specify the number of runs to
                execute. API keys must be configured in the server.
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <FormGroup sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                  {AGENTS.map((agent) => (
                    <Grid item xs={12} sm={6} md={4} key={agent.value}>
                      <Box
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          p: 2,
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAgents[agent.value] || false}
                              onChange={() => handleAgentToggle(agent.value)}
                            />
                          }
                          label={agent.label}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Model"
                          value={agentModels[agent.value] || agent.defaultModel}
                          onChange={(e) =>
                            handleModelChange(agent.value, e.target.value)
                          }
                          disabled={!selectedAgents[agent.value]}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>

              <Box
                sx={{
                  mb: 2,
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <TextField
                  type="number"
                  label="Run Count"
                  value={runCount}
                  onChange={(e) =>
                    setRunCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: 200 }}
                  helperText={
                    queries.length > 0
                      ? `Max: ${
                          queries.length *
                          AGENTS.filter((a) => selectedAgents[a.value]).length
                        } runs (${queries.length} queries × ${
                          AGENTS.filter((a) => selectedAgents[a.value]).length
                        } agents)`
                      : "Enter number of runs to execute"
                  }
                />
                <Button
                  variant="contained"
                  onClick={handleRunAgents}
                  disabled={running || queries.length === 0}
                >
                  {running ? "Running..." : "Go"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Analytics Charts */}
          {runs.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Run Count by Agent
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agent" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#1976d2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Runs DataGrid */}
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">
                  Latest Runs ({filteredRuns.length})
                </Typography>
                {runs.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to clear all runs? This action cannot be undone."
                        )
                      ) {
                        clearRuns();
                        setRuns([]);
                        setAgentFilter("");
                        setQueryFilter("");
                      }
                    }}
                  >
                    Clear All Runs
                  </Button>
                )}
              </Box>
              <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                  select
                  label="Filter by Agent"
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  sx={{ minWidth: 200 }}
                  size="small"
                >
                  <MenuItem value="">All Agents</MenuItem>
                  {AGENTS.map((agent) => (
                    <MenuItem key={agent.value} value={agent.value}>
                      {agent.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Filter by Query ID"
                  value={queryFilter}
                  onChange={(e) => setQueryFilter(e.target.value)}
                  sx={{ minWidth: 200 }}
                  size="small"
                >
                  <MenuItem value="">All Queries</MenuItem>
                  {Array.from(new Set(runs.map((r) => r.query_id))).map(
                    (queryId) => (
                      <MenuItem key={queryId} value={queryId}>
                        {queryId}
                      </MenuItem>
                    )
                  )}
                </TextField>
              </Box>
              {filteredRuns.length === 0 ? (
                <Alert severity="info">
                  {runs.length === 0
                    ? 'No runs yet. Click "Go" to run agents on queries.'
                    : "No runs match the current filters."}
                </Alert>
              ) : (
                <Box sx={{ height: 600, width: "100%" }}>
                  <DataGrid
                    rows={filteredRuns}
                    columns={columns}
                    getRowId={(row) => row.run_id}
                    pageSizeOptions={[10, 25, 50, 100]}
                    initialState={{
                      pagination: {
                        paginationModel: { pageSize: 25 },
                      },
                      sorting: {
                        sortModel: [{ field: "created_at", sort: "desc" }],
                      },
                    }}
                    onRowClick={(params) => {
                      setSelectedRun(params.row);
                      const query = queries.find(
                        (q) => q.query_id === params.row.query_id
                      );
                      setSelectedQuery(query || null);
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <RunInspectorDrawer
        open={selectedRun !== null}
        onClose={() => {
          setSelectedRun(null);
          setSelectedQuery(null);
        }}
        run={selectedRun}
        query={selectedQuery}
      />
    </Box>
  );
}
