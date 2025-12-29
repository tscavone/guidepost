import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  Paper,
  Collapse,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { AgentRun, GeneratedQuery, SearchResult } from "../lib/types";
import { highlightText, flattenHighlightTerms } from "../lib/highlight";
import { useState } from "react";

interface RunInspectorDrawerProps {
  open: boolean;
  onClose: () => void;
  run: AgentRun | null;
  query: GeneratedQuery | null;
}

export default function RunInspectorDrawer({
  open,
  onClose,
  run,
  query,
}: RunInspectorDrawerProps) {
  const [showSearchResults, setShowSearchResults] = useState(true);

  if (!run) return null;

  const highlightTerms = flattenHighlightTerms(run.agent_answer);
  const highlightedText = highlightText(run.output_text, highlightTerms);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 600, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Run Inspector</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Run Metadata */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Run Metadata
          </Typography>
          <Typography variant="body2">
            <strong>Run ID:</strong> {run.run_id}
          </Typography>
          <Typography variant="body2">
            <strong>Query ID:</strong> {run.query_id}
          </Typography>
          <Typography variant="body2">
            <strong>Agent:</strong> {run.agent}
          </Typography>
          <Typography variant="body2">
            <strong>Model:</strong> {run.model}
          </Typography>
          <Typography variant="body2">
            <strong>Latency:</strong> {run.latency_ms} ms
          </Typography>
          <Typography variant="body2">
            <strong>Created:</strong>{" "}
            {new Date(run.created_at).toLocaleString()}
          </Typography>
          {run.error && (
            <Typography variant="body2" color="error">
              <strong>Error:</strong> {run.error}
            </Typography>
          )}
        </Paper>

        {/* Query Information */}
        {query && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Query Information
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Query Text:</strong>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                p: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                mb: 1,
                fontStyle: "italic",
              }}
            >
              {query.query_text}
            </Typography>
            <Typography variant="body2">
              <strong>Expected Provider ID:</strong> {query.provider_id}
            </Typography>
          </Paper>
        )}

        {/* Raw Response */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Raw Response
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.900",
              color: "grey.100",
              borderRadius: 1,
              maxHeight: 400,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {highlightedText}
          </Box>
        </Paper>

        {/* Parsed Extraction */}
        {run.agent_answer && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Parsed Extraction
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "grey.100",
                borderRadius: 1,
                maxHeight: 300,
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(run.agent_answer, null, 2)}
              </pre>
            </Box>
          </Paper>
        )}

        {/* Simulated Web Search Results */}
        {run.search_results && run.search_results.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                mb: 1,
              }}
              onClick={() => setShowSearchResults(!showSearchResults)}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Simulated Web Search ({run.search_results.length} results)
              </Typography>
              {showSearchResults ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
            <Collapse in={showSearchResults}>
              <TableContainer sx={{ maxHeight: 400, overflow: "auto", mt: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>Provider</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Specialties</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Matches</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {run.search_results.map((result: SearchResult, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {result.provider.provider_name}
                          </Typography>
                          {result.provider.source && (
                            <Typography variant="caption" color="text.secondary">
                              {result.provider.source}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.provider.location
                            ? `${result.provider.location.city}, ${result.provider.location.state}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {result.provider.specialties
                            ? result.provider.specialties.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={result.score.toFixed(1)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxWidth: 200 }}>
                            {result.reasons.slice(0, 3).map((reason, i) => (
                              <Chip
                                key={i}
                                label={reason}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {result.reasons.length > 3 && (
                              <Chip
                                label={`+${result.reasons.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>
        )}

      </Box>
    </Drawer>
  );
}
