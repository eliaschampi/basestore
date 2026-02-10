-- =====================================================
-- Faztore Database Triggers
-- =====================================================

-- Users table trigger
CREATE TRIGGER users_updated_at_tg BEFORE UPDATE ON public.users 
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater ();

-- Drive files table trigger
CREATE TRIGGER drive_files_updated_at_tg BEFORE UPDATE ON public.drive_files
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater ();