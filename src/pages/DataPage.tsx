import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ProviderRecord } from "../lib/types";
import { parseJsonl } from "../lib/jsonl";

interface DataPageProps {
  selectedProviderId: string | null;
  onProviderSelect: (providerId: string | null) => void;
}

export default function DataPage({ selectedProviderId, onProviderSelect }: DataPageProps) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/data/providers.jsonl");
        if (!response.ok) {
          throw new Error("Failed to load providers data");
        }

        const text = await response.text();
        const parsed = parseJsonl<ProviderRecord>(text);
        setProviders(parsed);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load providers"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const columns: GridColDef<ProviderRecord>[] = [
    {
      field: "name",
      headerName: "Provider Name",
      width: 200,
      valueGetter: (params) => {
        if (!params.row) return "";
        return `${params.row.first} ${params.row.last}`;
      },
    },
    {
      field: "city",
      headerName: "City",
      width: 150,
      valueGetter: (params) => {
        if (!params.row) return "";
        return params.row.attributes.location?.city || "";
      },
    },
    {
      field: "state",
      headerName: "State",
      width: 100,
      valueGetter: (params) => {
        if (!params.row) return "";
        return params.row.attributes.location?.state || "";
      },
    },
    {
      field: "specialty",
      headerName: "Specialty",
      width: 180,
      valueGetter: (params) => {
        if (!params.row) return "Not specified";
        return params.row.attributes.specialties?.[0] || "Not specified";
      },
    },
    {
      field: "language",
      headerName: "Language",
      width: 200,
      valueGetter: (params) => {
        if (!params.row) return "Not specified";
        return params.row.attributes.languages?.join(", ") || "Not specified";
      },
    },
    {
      field: "insurance",
      headerName: "Insurance",
      width: 200,
      valueGetter: (params) => {
        if (!params.row) return "Not specified";
        return params.row.attributes.insurance_accepted?.join(", ") || "Not specified";
      },
    },
    {
      field: "accepting_new_patients",
      headerName: "Accepting New Patients",
      width: 180,
      valueGetter: (params) => {
        if (!params.row) return "No";
        return params.row.attributes.accepting_new_patients === true ? "Yes" : "No";
      },
    },
    {
      field: "telehealth",
      headerName: "Telehealth",
      width: 120,
      valueGetter: (params) => {
        if (!params.row) return "No";
        return params.row.attributes.telehealth_available === true ? "Yes" : "No";
      },
    },
    {
      field: "provider_id",
      headerName: "Provider ID",
      width: 150,
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Provider Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Source of truth provider data loaded from providers.jsonl. This data
          is used to generate queries and evaluate agent responses. Read-only.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total providers: {providers.length}
        </Typography>
      </Box>

      <Paper sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={providers}
          columns={columns}
          getRowId={(row) => row.provider_id}
          rowSelectionModel={selectedProviderId ? [selectedProviderId] : []}
          onRowSelectionModelChange={(newSelection) => {
            const selectedId = newSelection[0] as string | undefined;
            onProviderSelect(selectedId || null);
          }}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          checkboxSelection
          sx={{
            "& .MuiDataGrid-cell": {
              cursor: "default",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "action.hover",
            },
            "& .MuiDataGrid-row.Mui-selected": {
              backgroundColor: "action.selected",
              "&:hover": {
                backgroundColor: "action.selected",
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
}

