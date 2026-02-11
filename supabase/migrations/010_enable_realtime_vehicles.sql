
-- Enable Realtime for vehicles table
-- This allows the web app to listen for INSERT/UPDATE/DELETE events
alter publication supabase_realtime add table vehicles;
