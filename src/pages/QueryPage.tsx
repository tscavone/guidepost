import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { GuidepostConfig, ProviderRecord, GeneratedQuery } from '../lib/types';
import { parseJsonl } from '../lib/jsonl';
import { generateQueries } from '../lib/queryGenerator';
import { saveQueries, loadQueries, clearQueries } from '../lib/storage';

interface QueryPageProps {
  selectedProviderId: string | null;
}

export default function QueryPage({ selectedProviderId }: QueryPageProps) {
  const [config, setConfig] = useState<GuidepostConfig | null>(null);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [queries, setQueries] = useState<GeneratedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryCount, setQueryCount] = useState<number>(10);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
    const savedQueries = loadQueries();
    if (savedQueries.length > 0) {
      setQueries(savedQueries);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load config
      const configResponse = await fetch('/data/guidepost.config.json');
      if (!configResponse.ok) {
        throw new Error('Failed to load config');
      }
      const configData: GuidepostConfig = await configResponse.json();
      setConfig(configData);

      // Load providers
      const providersResponse = await fetch('/data/providers.jsonl');
      if (!providersResponse.ok) {
        throw new Error('Failed to load providers');
      }
      const providersText = await providersResponse.text();
      const providersData = parseJsonl<ProviderRecord>(providersText);
      setProviders(providersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!config || providers.length === 0) {
      setError('Config or providers not loaded');
      return;
    }

    setGenerating(true);
    try {
      const newQueries = generateQueries(config, providers, queryCount);
      const allQueries = [...queries, ...newQueries];
      setQueries(allQueries);
      saveQueries(allQueries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate queries');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getProviderName = (providerId: string): string => {
    const provider = providers.find((p) => p.provider_id === providerId);
    if (provider) {
      return `${provider.first} ${provider.last}`;
    }
    return providerId;
  };

  const columns: GridColDef<GeneratedQuery>[] = [
    {
      field: 'provider_id',
      headerName: 'Target Provider',
      width: 150,
      renderCell: (params) => getProviderName(params.row.provider_id),
    },
    {
      field: 'query_text',
      headerName: 'Query Text',
      flex: 1,
      minWidth: 300,
      renderCell: (params) => (
        <Tooltip title={params.row.query_text} arrow>
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
          >
            {params.row.query_text}
          </Box>
        </Tooltip>
      ),
    },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'state', headerName: 'State', width: 80 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'language', headerName: 'Language', width: 120 },
    { field: 'insurance', headerName: 'Insurance', width: 200 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="copy"
          icon={
            <Tooltip title="Copy to clipboard">
              <ContentCopyIcon />
            </Tooltip>
          }
          label="Copy"
          onClick={() => handleCopyToClipboard(params.row.query_text)}
        />,
      ],
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !config) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Section */}
      {config && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Prefixes
              </Typography>
              <Tooltip
                title={
                  <Box>
                    {config.prefixes.map((prefix, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        {prefix}
                      </Box>
                    ))}
                  </Box>
                }
                arrow
              >
                <Typography variant="h4" sx={{ cursor: 'help' }}>
                  {config.prefixes.length}
                </Typography>
              </Tooltip>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Providers
              </Typography>
              <Typography variant="h4">{providers.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Attributes
              </Typography>
              <Tooltip
                title={
                  <Box>
                    {config.provider_attributes.map((attr, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        {attr.name}
                      </Box>
                    ))}
                  </Box>
                }
                arrow
              >
                <Typography variant="h4" sx={{ cursor: 'help' }}>
                  {config.provider_attributes.length}
                </Typography>
              </Tooltip>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Generate Queries Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generate Queries
          </Typography>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              type="number"
              label="Number of queries"
              value={queryCount}
              onChange={(e) => setQueryCount(parseInt(e.target.value) || 10)}
              inputProps={{ min: 1, max: 100 }}
              sx={{ width: 200 }}
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating || !config || providers.length === 0}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Queries DataGrid */}
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
              Generated Queries ({queries.length})
            </Typography>
            {queries.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to clear all queries? This action cannot be undone."
                    )
                  ) {
                    clearQueries();
                    setQueries([]);
                  }
                }}
              >
                Clear All Queries
              </Button>
            )}
          </Box>
          {queries.length === 0 ? (
            <Alert severity="info">No queries generated yet. Use the form above to generate queries.</Alert>
          ) : (
            <Box sx={{ height: 630, width: '100%' }}>
              <DataGrid
                rows={queries}
                columns={columns}
                getRowId={(row) => row.query_id}
                getRowClassName={(params) => {
                  if (selectedProviderId && params.row.provider_id === selectedProviderId) {
                    return 'highlighted-row';
                  }
                  return '';
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                sx={{
                  '& .MuiDataGrid-row.highlighted-row': {
                    backgroundColor: 'action.selected',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

