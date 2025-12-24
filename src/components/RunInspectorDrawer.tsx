import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  Paper,
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { AgentRun, GeneratedQuery } from "../lib/types";
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
  const [showRequestContext, setShowRequestContext] = useState(false);

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

        {/* Request Context (if available) */}
        {(run as any).request_context && (
          <Paper sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setShowRequestContext(!showRequestContext)}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Request Context
              </Typography>
              {showRequestContext ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
            <Collapse in={showRequestContext}>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify((run as any).request_context, null, 2)}
                </pre>
              </Box>
            </Collapse>
          </Paper>
        )}
      </Box>
    </Drawer>
  );
}
