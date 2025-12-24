import { AgentSpec } from '../types';
import { Adapter } from './types';
import { openaiAdapter } from './openai';
import { xaiAdapter } from './xai';
import { geminiAdapter } from './gemini';

export function getAdapter(agent: AgentSpec['agent']): Adapter {
  switch (agent) {
    case 'openai':
      return openaiAdapter;
    case 'xai':
      return xaiAdapter;
    case 'gemini':
      return geminiAdapter;
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

export function hasApiKey(agent: AgentSpec['agent']): boolean {
  switch (agent) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'xai':
      return !!process.env.XAI_API_KEY;
    case 'gemini':
      return !!process.env.GEMINI_API_KEY;
    default:
      return false;
  }
}

