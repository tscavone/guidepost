export interface AdapterResponse {
  output_text: string;
  raw: any;
}

export interface Adapter {
  (input: { prompt: string; model: string }): Promise<AdapterResponse>;
}

