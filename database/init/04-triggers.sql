-- =====================================================
-- Faztore Database Triggers
-- =====================================================

-- Users table trigger
CREATE TRIGGER users_updated_at_tg BEFORE UPDATE ON public.users 
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater ();

-- Drive files table trigger
CREATE TRIGGER drive_files_updated_at_tg BEFORE UPDATE ON public.drive_files
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater ();

-- Inventory balances timestamp trigger
CREATE TRIGGER inventory_balances_updated_at_tg
BEFORE UPDATE ON public.inventory_balances
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- Inventory purchases timestamp trigger
CREATE TRIGGER inventory_purchases_updated_at_tg
BEFORE UPDATE ON public.inventory_purchases
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- Inventory sales timestamp trigger
CREATE TRIGGER inventory_sales_updated_at_tg
BEFORE UPDATE ON public.inventory_sales
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- Inventory movements timestamp trigger
CREATE TRIGGER inventory_movements_updated_at_tg
BEFORE UPDATE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- Inventory customers timestamp trigger
CREATE TRIGGER inventory_customers_updated_at_tg
BEFORE UPDATE ON public.inventory_customers
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- Apply movements into inventory balances.
CREATE TRIGGER inventory_apply_movement_tg
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.inventory_apply_movement_to_balance();

-- Synchronize inbound quantities on purchase state changes.
CREATE TRIGGER inventory_sync_inbound_tg
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_purchases
FOR EACH ROW EXECUTE FUNCTION public.inventory_sync_inbound_from_purchase();

-- Seed inventory balances when a new product is created.
CREATE TRIGGER inventory_seed_balances_product_tg
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.inventory_seed_balances_for_new_product();

-- Seed inventory balances when a new branch is created.
CREATE TRIGGER inventory_seed_balances_branch_tg
AFTER INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.inventory_seed_balances_for_new_branch();

-- Ensure pre-existing products and branches are seeded in balances.
INSERT INTO public.inventory_balances (product_code, branch_code)
SELECT p.code, b.code
FROM public.products p
CROSS JOIN public.branches b
ON CONFLICT (product_code, branch_code) DO NOTHING;
