-- =====================================================
-- Faztore Database Functions
-- =====================================================

-- Timestamp updater function
CREATE OR REPLACE FUNCTION public.timestamp_updater () RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep inventory balances synchronized with inventory movements.
CREATE OR REPLACE FUNCTION public.inventory_apply_movement_to_balance()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  VALUES (NEW.product_code, NEW.branch_code)
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  IF NEW.direction = 'in' THEN
    UPDATE public.inventory_balances
    SET on_hand = on_hand + NEW.quantity,
        last_movement_at = NEW.occurred_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSE
    UPDATE public.inventory_balances
    SET on_hand = on_hand - NEW.quantity,
        last_movement_at = NEW.occurred_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code
      AND on_hand >= NEW.quantity;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'Inventario insuficiente para producto % en sede %', NEW.product_code, NEW.branch_code
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep inbound quantities in sync with purchase state changes.
CREATE OR REPLACE FUNCTION public.inventory_sync_inbound_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  old_inbound INTEGER := 0;
  new_inbound INTEGER := 0;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_inbound := CASE WHEN OLD.state = 'in_transit' THEN OLD.quantity ELSE 0 END;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_inbound := CASE WHEN NEW.state = 'in_transit' THEN NEW.quantity ELSE 0 END;
    INSERT INTO public.inventory_balances (product_code, branch_code)
    VALUES (NEW.product_code, NEW.branch_code)
    ON CONFLICT (product_code, branch_code) DO NOTHING;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory_balances
    SET inbound = inbound + new_inbound,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = OLD.product_code
      AND branch_code = OLD.branch_code;
  ELSIF OLD.product_code IS DISTINCT FROM NEW.product_code OR OLD.branch_code IS DISTINCT FROM NEW.branch_code THEN
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = OLD.product_code
      AND branch_code = OLD.branch_code;

    UPDATE public.inventory_balances
    SET inbound = inbound + new_inbound,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSE
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound + new_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.inventory_seed_balances_for_new_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  SELECT NEW.code, b.code
  FROM public.branches b
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.inventory_seed_balances_for_new_branch()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  SELECT p.code, NEW.code
  FROM public.products p
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.inventory_can_transition_purchase_state(
  p_current TEXT,
  p_next TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
SELECT
  CASE
    WHEN p_current = p_next THEN true
    WHEN p_current = 'in_transit' THEN p_next IN ('received', 'refunded')
    WHEN p_current = 'received' THEN p_next = 'refunded'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_can_transition_sale_shipping_state(
  p_current TEXT,
  p_next TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
SELECT
  CASE
    WHEN p_current = p_next THEN true
    WHEN p_current = 'pending' THEN p_next = 'in_transit'
    WHEN p_current = 'in_transit' THEN p_next = 'delivered'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_create_customer(
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT false
)
RETURNS public.inventory_customers
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer public.inventory_customers%ROWTYPE;
BEGIN
  INSERT INTO public.inventory_customers (
    full_name,
    phone,
    is_favorite,
    note
  ) VALUES (
    p_full_name,
    NULLIF(BTRIM(COALESCE(p_phone, '')), ''),
    COALESCE(p_is_favorite, false),
    NULLIF(BTRIM(COALESCE(p_note, '')), '')
  )
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_update_customer_favorite(
  p_customer_code UUID,
  p_is_favorite BOOLEAN
)
RETURNS public.inventory_customers
LANGUAGE sql
AS $$
  UPDATE public.inventory_customers
  SET is_favorite = p_is_favorite
  WHERE code = p_customer_code
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.inventory_get_customer(
  p_customer_code UUID
)
RETURNS public.inventory_customers
LANGUAGE sql
STABLE
AS $$
  SELECT c.*
  FROM public.inventory_customers c
  WHERE c.code = p_customer_code
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.inventory_find_customer_by_identity(
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS public.inventory_customers
LANGUAGE sql
STABLE
AS $$
  SELECT c.*
  FROM public.inventory_customers c
  WHERE lower(c.full_name) = lower(BTRIM(COALESCE(p_full_name, '')))
    AND COALESCE(c.phone, '') = COALESCE(NULLIF(BTRIM(COALESCE(p_phone, '')), ''), '')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.inventory_create_purchase(
  p_product_code UUID,
  p_branch_code UUID,
  p_user_code UUID,
  p_origin TEXT,
  p_entry_type TEXT,
  p_tracking_number TEXT,
  p_quantity INTEGER,
  p_state TEXT,
  p_ordered_at DATE,
  p_unit_cost NUMERIC,
  p_note TEXT
)
RETURNS public.inventory_purchases
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_purchase public.inventory_purchases%ROWTYPE;
  v_received_at TIMESTAMPTZ := NULL;
  v_refunded_at TIMESTAMPTZ := NULL;
BEGIN
  IF p_state = 'received' THEN
    v_received_at := v_now;
  ELSIF p_state = 'refunded' THEN
    v_refunded_at := v_now;
  END IF;

  INSERT INTO public.inventory_purchases (
    product_code,
    branch_code,
    user_code,
    origin,
    entry_type,
    tracking_number,
    quantity,
    state,
    ordered_at,
    received_at,
    refunded_at,
    unit_cost,
    note
  ) VALUES (
    p_product_code,
    p_branch_code,
    p_user_code,
    p_origin,
    p_entry_type,
    NULLIF(BTRIM(COALESCE(p_tracking_number, '')), ''),
    p_quantity,
    p_state,
    p_ordered_at,
    v_received_at,
    v_refunded_at,
    p_unit_cost,
    NULLIF(BTRIM(COALESCE(p_note, '')), '')
  )
  RETURNING * INTO v_purchase;

  IF p_state = 'received' THEN
    INSERT INTO public.inventory_movements (
      product_code,
      branch_code,
      user_code,
      quantity,
      direction,
      reason,
      purchase_code,
      sale_code,
      occurred_at,
      note
    ) VALUES (
      p_product_code,
      p_branch_code,
      p_user_code,
      p_quantity,
      'in',
      'purchase',
      v_purchase.code,
      NULL,
      v_now,
      NULLIF(BTRIM(COALESCE(p_note, '')), '')
    );
  END IF;

  RETURN v_purchase;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_update_purchase_state(
  p_purchase_code UUID,
  p_user_code UUID,
  p_state TEXT,
  p_note_provided BOOLEAN DEFAULT false,
  p_note TEXT DEFAULT NULL
)
RETURNS public.inventory_purchases
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_purchase public.inventory_purchases%ROWTYPE;
  v_next_note TEXT;
  v_next_received_at TIMESTAMPTZ;
  v_next_refunded_at TIMESTAMPTZ;
BEGIN
  SELECT *
  INTO v_purchase
  FROM public.inventory_purchases
  WHERE code = p_purchase_code
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT public.inventory_can_transition_purchase_state(v_purchase.state, p_state) THEN
    RAISE EXCEPTION 'Transicion de estado invalida para esta compra';
  END IF;

  v_next_note := CASE WHEN p_note_provided THEN p_note ELSE v_purchase.note END;
  v_next_received_at := v_purchase.received_at;
  v_next_refunded_at := v_purchase.refunded_at;

  IF v_purchase.state <> p_state THEN
    IF v_purchase.state = 'in_transit' AND p_state = 'received' THEN
      v_next_received_at := v_now;
      v_next_refunded_at := NULL;

      INSERT INTO public.inventory_movements (
        product_code,
        branch_code,
        user_code,
        quantity,
        direction,
        reason,
        purchase_code,
        sale_code,
        occurred_at,
        note
      ) VALUES (
        v_purchase.product_code,
        v_purchase.branch_code,
        p_user_code,
        v_purchase.quantity,
        'in',
        'purchase',
        v_purchase.code,
        NULL,
        v_now,
        v_next_note
      );
    END IF;

    IF v_purchase.state = 'in_transit' AND p_state = 'refunded' THEN
      v_next_received_at := NULL;
      v_next_refunded_at := v_now;
    END IF;

    IF v_purchase.state = 'received' AND p_state = 'refunded' THEN
      v_next_refunded_at := v_now;

      INSERT INTO public.inventory_movements (
        product_code,
        branch_code,
        user_code,
        quantity,
        direction,
        reason,
        purchase_code,
        sale_code,
        occurred_at,
        note
      ) VALUES (
        v_purchase.product_code,
        v_purchase.branch_code,
        p_user_code,
        v_purchase.quantity,
        'out',
        'purchase_refund',
        v_purchase.code,
        NULL,
        v_now,
        v_next_note
      );
    END IF;
  END IF;

  UPDATE public.inventory_purchases
  SET
    state = p_state,
    received_at = v_next_received_at,
    refunded_at = v_next_refunded_at,
    note = v_next_note
  WHERE code = v_purchase.code
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_create_sale(
  p_product_code UUID,
  p_branch_code UUID,
  p_user_code UUID,
  p_customer_code UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_sale_channel TEXT,
  p_fulfillment_type TEXT,
  p_shipping_state TEXT,
  p_delivery_address TEXT,
  p_order_reference TEXT,
  p_sold_at TIMESTAMPTZ,
  p_note TEXT
)
RETURNS public.inventory_sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.inventory_sales%ROWTYPE;
BEGIN
  INSERT INTO public.inventory_sales (
    product_code,
    branch_code,
    user_code,
    customer_code,
    quantity,
    unit_price,
    sale_channel,
    fulfillment_type,
    shipping_state,
    delivery_address,
    order_reference,
    customer_name,
    customer_phone,
    sold_at,
    note
  ) VALUES (
    p_product_code,
    p_branch_code,
    p_user_code,
    p_customer_code,
    p_quantity,
    p_unit_price,
    p_sale_channel,
    p_fulfillment_type,
    p_shipping_state,
    p_delivery_address,
    p_order_reference,
    p_customer_name,
    p_customer_phone,
    p_sold_at,
    p_note
  )
  RETURNING * INTO v_sale;

  INSERT INTO public.inventory_movements (
    product_code,
    branch_code,
    user_code,
    quantity,
    direction,
    reason,
    purchase_code,
    sale_code,
    occurred_at,
    note
  ) VALUES (
    p_product_code,
    p_branch_code,
    p_user_code,
    p_quantity,
    'out',
    'sale',
    NULL,
    v_sale.code,
    p_sold_at,
    p_note
  );

  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_update_sale_shipping_state(
  p_sale_code UUID,
  p_shipping_state TEXT,
  p_delivery_address_provided BOOLEAN DEFAULT false,
  p_delivery_address TEXT DEFAULT NULL,
  p_order_reference_provided BOOLEAN DEFAULT false,
  p_order_reference TEXT DEFAULT NULL
)
RETURNS public.inventory_sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.inventory_sales%ROWTYPE;
  v_next_delivery_address TEXT;
  v_next_order_reference TEXT;
BEGIN
  SELECT *
  INTO v_sale
  FROM public.inventory_sales
  WHERE code = p_sale_code
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_sale.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'La venta ya fue anulada';
  END IF;

  IF v_sale.fulfillment_type = 'pickup' THEN
    IF p_shipping_state <> 'na' THEN
      RAISE EXCEPTION 'Los pedidos en tienda no pueden tener estado de envio';
    END IF;
  ELSIF NOT public.inventory_can_transition_sale_shipping_state(v_sale.shipping_state, p_shipping_state) THEN
    RAISE EXCEPTION 'Transicion de estado de envio invalida';
  END IF;

  v_next_delivery_address := CASE
    WHEN p_delivery_address_provided THEN p_delivery_address
    ELSE v_sale.delivery_address
  END;
  v_next_order_reference := CASE
    WHEN p_order_reference_provided THEN p_order_reference
    ELSE v_sale.order_reference
  END;

  UPDATE public.inventory_sales
  SET
    shipping_state = p_shipping_state,
    delivery_address = v_next_delivery_address,
    order_reference = v_next_order_reference
  WHERE code = v_sale.code
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_void_sale(
  p_sale_code UUID,
  p_user_code UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.inventory_sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.inventory_sales%ROWTYPE;
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
  v_movement_note TEXT;
BEGIN
  SELECT *
  INTO v_sale
  FROM public.inventory_sales
  WHERE code = p_sale_code
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_sale.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'La venta ya fue anulada';
  END IF;

  v_movement_note := CASE
    WHEN v_note IS NULL THEN FORMAT('Anulacion de venta %s', v_sale.code)
    ELSE FORMAT('Anulacion de venta %s: %s', v_sale.code, v_note)
  END;

  INSERT INTO public.inventory_movements (
    product_code,
    branch_code,
    user_code,
    quantity,
    direction,
    reason,
    purchase_code,
    sale_code,
    occurred_at,
    note
  ) VALUES (
    v_sale.product_code,
    v_sale.branch_code,
    p_user_code,
    v_sale.quantity,
    'in',
    'manual_adjustment',
    NULL,
    v_sale.code,
    v_now,
    v_movement_note
  );

  UPDATE public.inventory_sales
  SET
    voided_at = v_now,
    voided_by_user_code = p_user_code,
    void_note = v_note
  WHERE code = v_sale.code
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_update_thresholds(
  p_product_code UUID,
  p_branch_code UUID,
  p_reorder_point INTEGER,
  p_emergency_point INTEGER
)
RETURNS TABLE(
  product_code UUID,
  product_name TEXT,
  sku TEXT,
  product_is_active BOOLEAN,
  category_code UUID,
  category_name TEXT,
  branch_code UUID,
  branch_name TEXT,
  on_hand INTEGER,
  reserved INTEGER,
  available INTEGER,
  inbound INTEGER,
  reorder_point INTEGER,
  emergency_point INTEGER,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  stock_state TEXT,
  stock_health_pct INTEGER,
  awaiting_first_stock BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  VALUES (p_product_code, p_branch_code)
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  UPDATE public.inventory_balances
  SET
    reorder_point = p_reorder_point,
    emergency_point = p_emergency_point
  WHERE product_code = p_product_code
    AND branch_code = p_branch_code;

  RETURN QUERY
  SELECT
    ib.product_code,
    p.name::TEXT AS product_name,
    p.sku::TEXT AS sku,
    p.is_active AS product_is_active,
    p.category_code,
    c.name::TEXT AS category_name,
    ib.branch_code,
    b.name::TEXT AS branch_name,
    ib.on_hand,
    ib.reserved,
    ib.available,
    ib.inbound,
    ib.reorder_point,
    ib.emergency_point,
    ib.last_movement_at,
    ib.created_at,
    ib.updated_at,
    CASE
      WHEN ib.available <= 0 AND ib.inbound > 0 THEN 'in_transit_only'
      WHEN ib.available <= 0 THEN 'out_of_stock'
      WHEN ib.available <= ib.emergency_point THEN 'emergency'
      WHEN ib.available <= ib.reorder_point THEN 'low'
      ELSE 'healthy'
    END AS stock_state,
    COALESCE(
      LEAST(
        100,
        GREATEST(
          0,
          ROUND((ib.available::numeric / NULLIF(ib.reorder_point::numeric, 0)) * 100)
        )
      ),
      100
    )::INTEGER AS stock_health_pct,
    NOT EXISTS (
      SELECT 1
      FROM public.inventory_movements m
      WHERE m.product_code = ib.product_code
        AND m.branch_code = ib.branch_code
    ) AS awaiting_first_stock
  FROM public.inventory_balances ib
  INNER JOIN public.products p ON p.code = ib.product_code
  INNER JOIN public.branches b ON b.code = ib.branch_code
  LEFT JOIN public.categories c ON c.code = p.category_code
  WHERE ib.product_code = p_product_code
    AND ib.branch_code = p_branch_code
  LIMIT 1;
END;
$$;
