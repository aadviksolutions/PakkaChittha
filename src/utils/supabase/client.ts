import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let clientInstance: ReturnType<typeof createBrowserClient> | undefined;

export const createClient = () => {
  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl!, supabaseKey!);
  }
  return clientInstance;
};

