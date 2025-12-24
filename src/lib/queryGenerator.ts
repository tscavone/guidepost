import { GuidepostConfig, ProviderRecord, GeneratedQuery } from './types';

/**
 * Generate queries from config and providers
 * Creates queries using template: "<prefix> <specialty> in <city>, <state> who accepts <insurance> and speaks <language>"
 * Only includes parts that exist on the provider record
 */
export function generateQueries(
  config: GuidepostConfig,
  providers: ProviderRecord[],
  count: number
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const prefixes = config.prefixes;
  
  // Use a deterministic approach to select providers and prefixes
  for (let i = 0; i < count && i < providers.length * prefixes.length; i++) {
    const providerIndex = i % providers.length;
    const prefixIndex = Math.floor(i / providers.length) % prefixes.length;
    
    const provider = providers[providerIndex];
    const prefix = prefixes[prefixIndex];
    
    const parts: string[] = [];
    
    // Add specialty if available
    if (provider.attributes.specialties && provider.attributes.specialties.length > 0) {
      const specialty = provider.attributes.specialties[0];
      parts.push(specialty);
    }
    
    // Add location if available
    if (provider.attributes.location) {
      const { city, state } = provider.attributes.location;
      parts.push(`in ${city}, ${state}`);
    }
    
    // Add insurance if available
    if (provider.attributes.insurance_accepted && provider.attributes.insurance_accepted.length > 0) {
      const insurance = provider.attributes.insurance_accepted[0];
      parts.push(`who accepts ${insurance}`);
    }
    
    // Add language if available
    if (provider.attributes.languages && provider.attributes.languages.length > 0) {
      const language = provider.attributes.languages[0];
      parts.push(`and speaks ${language}`);
    }
    
    // Build query text
    const queryText = `${prefix} ${parts.join(' ')}`;
    
    // Generate stable query_id
    const queryId = `q_${String(i + 1).padStart(4, '0')}`;
    
    queries.push({
      query_id: queryId,
      query_text: queryText,
      provider_id: provider.provider_id,
      city: provider.attributes.location?.city,
      state: provider.attributes.location?.state,
      specialty: provider.attributes.specialties?.[0],
      language: provider.attributes.languages?.[0],
      insurance: provider.attributes.insurance_accepted?.[0],
    });
  }
  
  return queries;
}

