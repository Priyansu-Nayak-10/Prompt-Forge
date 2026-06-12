-- Make the search view respect the permissions and RLS policies of the querying user.
ALTER VIEW public.prompts_search_view SET (security_invoker = true);
