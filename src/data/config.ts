// The public settings row set (app_config): min_client_version, feedback_audience, native_latest, … Readable by anyone;
// written only with the service role (private settings live in private_config, which the API never exposes).
import { must } from './errors';
import { qk } from './keys';
import { useSavedQuery } from './query';
import { supabase } from './supabase';

export function useAppConfig() {
  return useSavedQuery({
    queryKey: qk.appConfig(),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const rows = must(await supabase.from('app_config').select('*'));
      return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
    },
  });
}
