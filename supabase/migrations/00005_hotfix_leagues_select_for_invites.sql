-- Hotfix: current production join flow reads leagues directly by invite token.
-- Until app deploy picks up RPC-based join, allow leagues to be selected.

alter policy "League members can view league"
on public.leagues
using (true);
