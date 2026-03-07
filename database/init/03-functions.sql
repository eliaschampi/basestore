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
  p_note TEXT DEFAULT NULL
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
    note
  ) VALUES (
    p_full_name,
    NULLIF(BTRIM(COALESCE(p_phone, '')), ''),
    NULLIF(BTRIM(COALESCE(p_note, '')), '')
  )
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_update_customer(
  p_customer_code UUID,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS public.inventory_customers
LANGUAGE sql
AS $$
  UPDATE public.inventory_customers
  SET full_name = BTRIM(COALESCE(p_full_name, '')),
      phone = NULLIF(BTRIM(COALESCE(p_phone, '')), ''),
      note = NULLIF(BTRIM(COALESCE(p_note, '')), '')
  WHERE code = p_customer_code
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.inventory_delete_customer(
  p_customer_code UUID
)
RETURNS public.inventory_customers
LANGUAGE sql
AS $$
  DELETE FROM public.inventory_customers
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
  p_branch_code UUID,
  p_user_code UUID,
  p_origin TEXT,
  p_entry_type TEXT,
  p_tracking_number TEXT,
  p_state TEXT,
  p_ordered_at DATE,
  p_note TEXT,
  p_items JSONB
)
RETURNS public.purchases
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_purchase public.purchases%ROWTYPE;
  v_received_at TIMESTAMPTZ := NULL;
  v_refunded_at TIMESTAMPTZ := NULL;
  v_items_count INTEGER := 0;
  v_item RECORD;
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de compra'
      USING ERRCODE = '23514';
  END IF;

  IF p_state = 'received' THEN
    v_received_at := v_now;
  ELSIF p_state = 'refunded' THEN
    v_refunded_at := v_now;
  END IF;

  INSERT INTO public.purchases (
    branch_code,
    user_code,
    origin,
    entry_type,
    tracking_number,
    state,
    ordered_at,
    received_at,
    refunded_at,
    note
  ) VALUES (
    p_branch_code,
    p_user_code,
    p_origin,
    p_entry_type,
    NULLIF(BTRIM(COALESCE(p_tracking_number, '')), ''),
    p_state,
    p_ordered_at,
    v_received_at,
    v_refunded_at,
    v_note
  )
  RETURNING * INTO v_purchase;

  FOR v_item IN
    SELECT
      item.product_code,
      item.quantity,
      item.unit_cost
    FROM jsonb_to_recordset(p_items) AS item(
      product_code UUID,
      quantity INTEGER,
      unit_cost NUMERIC
    )
  LOOP
    IF v_item.product_code IS NULL THEN
      RAISE EXCEPTION 'Cada item debe incluir product_code'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad de cada item debe ser mayor a 0'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.unit_cost IS NOT NULL AND v_item.unit_cost < 0 THEN
      RAISE EXCEPTION 'El costo unitario debe ser mayor o igual a 0'
        USING ERRCODE = '23514';
    END IF;

    v_items_count := v_items_count + 1;

    INSERT INTO public.purchase_items (
      purchase_code,
      product_code,
      quantity,
      unit_cost
    ) VALUES (
      v_purchase.code,
      v_item.product_code,
      v_item.quantity,
      v_item.unit_cost
    );

    INSERT INTO public.inventory_balances (product_code, branch_code)
    VALUES (v_item.product_code, v_purchase.branch_code)
    ON CONFLICT (product_code, branch_code) DO NOTHING;

    IF p_state = 'in_transit' THEN
      UPDATE public.inventory_balances
      SET inbound = inbound + v_item.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE product_code = v_item.product_code
        AND branch_code = v_purchase.branch_code;
    ELSIF p_state = 'received' THEN
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
        v_item.product_code,
        v_purchase.branch_code,
        v_purchase.user_code,
        v_item.quantity,
        'in',
        'purchase',
        v_purchase.code,
        NULL,
        v_now,
        v_note
      );

      IF v_item.unit_cost IS NOT NULL THEN
        UPDATE public.products
        SET cost_price = v_item.unit_cost,
            updated_at = CURRENT_TIMESTAMP
        WHERE code = v_item.product_code;
      END IF;
    END IF;
  END LOOP;

  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de compra'
      USING ERRCODE = '23514';
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
RETURNS public.purchases
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_purchase public.purchases%ROWTYPE;
  v_next_note TEXT;
  v_next_received_at TIMESTAMPTZ;
  v_next_refunded_at TIMESTAMPTZ;
  v_item RECORD;
BEGIN
  SELECT *
  INTO v_purchase
  FROM public.purchases
  WHERE code = p_purchase_code
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT public.inventory_can_transition_purchase_state(v_purchase.state, p_state) THEN
    RAISE EXCEPTION 'Transicion de estado invalida para esta compra';
  END IF;

  v_next_note := CASE WHEN p_note_provided THEN NULLIF(BTRIM(COALESCE(p_note, '')), '') ELSE v_purchase.note END;
  v_next_received_at := v_purchase.received_at;
  v_next_refunded_at := v_purchase.refunded_at;

  IF v_purchase.state <> p_state THEN
    IF v_purchase.state = 'in_transit' AND p_state = 'received' THEN
      v_next_received_at := v_now;
      v_next_refunded_at := NULL;

      FOR v_item IN
        SELECT product_code, quantity, unit_cost
        FROM public.purchase_items
        WHERE purchase_code = v_purchase.code
      LOOP
        INSERT INTO public.inventory_balances (product_code, branch_code)
        VALUES (v_item.product_code, v_purchase.branch_code)
        ON CONFLICT (product_code, branch_code) DO NOTHING;

        UPDATE public.inventory_balances
        SET inbound = GREATEST(inbound - v_item.quantity, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE product_code = v_item.product_code
          AND branch_code = v_purchase.branch_code;

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
          v_item.product_code,
          v_purchase.branch_code,
          p_user_code,
          v_item.quantity,
          'in',
          'purchase',
          v_purchase.code,
          NULL,
          v_now,
          v_next_note
        );

        IF v_item.unit_cost IS NOT NULL THEN
          UPDATE public.products
          SET cost_price = v_item.unit_cost,
              updated_at = CURRENT_TIMESTAMP
          WHERE code = v_item.product_code;
        END IF;
      END LOOP;
    END IF;

    IF v_purchase.state = 'in_transit' AND p_state = 'refunded' THEN
      v_next_received_at := NULL;
      v_next_refunded_at := v_now;

      FOR v_item IN
        SELECT product_code, quantity
        FROM public.purchase_items
        WHERE purchase_code = v_purchase.code
      LOOP
        INSERT INTO public.inventory_balances (product_code, branch_code)
        VALUES (v_item.product_code, v_purchase.branch_code)
        ON CONFLICT (product_code, branch_code) DO NOTHING;

        UPDATE public.inventory_balances
        SET inbound = GREATEST(inbound - v_item.quantity, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE product_code = v_item.product_code
          AND branch_code = v_purchase.branch_code;
      END LOOP;
    END IF;

    IF v_purchase.state = 'received' AND p_state = 'refunded' THEN
      v_next_refunded_at := v_now;

      FOR v_item IN
        SELECT product_code, quantity
        FROM public.purchase_items
        WHERE purchase_code = v_purchase.code
      LOOP
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
          v_item.product_code,
          v_purchase.branch_code,
          p_user_code,
          v_item.quantity,
          'out',
          'purchase_refund',
          v_purchase.code,
          NULL,
          v_now,
          v_next_note
        );
      END LOOP;
    END IF;
  END IF;

  UPDATE public.purchases
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
  p_branch_code UUID,
  p_user_code UUID,
  p_customer_code UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_sale_channel TEXT,
  p_fulfillment_type TEXT,
  p_shipping_state TEXT,
  p_delivery_address TEXT,
  p_order_reference TEXT,
  p_sold_at TIMESTAMPTZ,
  p_note TEXT,
  p_items JSONB
)
RETURNS public.sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_item RECORD;
  v_items_count INTEGER := 0;
  v_unit_cost NUMERIC(12,2);
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de venta'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.sales (
    branch_code,
    user_code,
    customer_code,
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
    p_branch_code,
    p_user_code,
    p_customer_code,
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

  FOR v_item IN
    SELECT
      item.product_code,
      item.quantity,
      item.unit_price
    FROM jsonb_to_recordset(p_items) AS item(
      product_code UUID,
      quantity INTEGER,
      unit_price NUMERIC
    )
  LOOP
    IF v_item.product_code IS NULL THEN
      RAISE EXCEPTION 'Cada item debe incluir product_code'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad de cada item debe ser mayor a 0'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.unit_price IS NULL OR v_item.unit_price < 0 THEN
      RAISE EXCEPTION 'El precio unitario debe ser mayor o igual a 0'
        USING ERRCODE = '23514';
    END IF;

    v_items_count := v_items_count + 1;

    SELECT p.cost_price
    INTO v_unit_cost
    FROM public.products p
    WHERE p.code = v_item.product_code
    LIMIT 1;

    v_unit_cost := COALESCE(v_unit_cost, 0);

    INSERT INTO public.sale_items (
      sale_code,
      product_code,
      quantity,
      unit_price,
      unit_cost
    ) VALUES (
      v_sale.code,
      v_item.product_code,
      v_item.quantity,
      v_item.unit_price,
      v_unit_cost
    );

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
      v_item.product_code,
      v_sale.branch_code,
      v_sale.user_code,
      v_item.quantity,
      'out',
      'sale',
      NULL,
      v_sale.code,
      v_sale.sold_at,
      v_sale.note
    );
  END LOOP;

  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de venta'
      USING ERRCODE = '23514';
  END IF;

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
RETURNS public.sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_next_delivery_address TEXT;
  v_next_order_reference TEXT;
BEGIN
  SELECT *
  INTO v_sale
  FROM public.sales
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

  UPDATE public.sales
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
RETURNS public.sales
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
  v_movement_note TEXT;
  v_item RECORD;
BEGIN
  SELECT *
  INTO v_sale
  FROM public.sales
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

  FOR v_item IN
    SELECT product_code, quantity
    FROM public.sale_items
    WHERE sale_code = v_sale.code
  LOOP
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
      v_item.product_code,
      v_sale.branch_code,
      p_user_code,
      v_item.quantity,
      'in',
      'manual_adjustment',
      NULL,
      v_sale.code,
      v_now,
      v_movement_note
    );
  END LOOP;

  UPDATE public.sales
  SET
    voided_at = v_now,
    voided_by_user_code = p_user_code,
    void_note = v_note
  WHERE code = v_sale.code
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_create_product_transfer(
  p_source_branch_code UUID,
  p_destination_branch_code UUID,
  p_user_code UUID,
  p_transferred_at TIMESTAMPTZ,
  p_note TEXT,
  p_items JSONB
)
RETURNS public.product_transfers
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer public.product_transfers%ROWTYPE;
  v_item RECORD;
  v_items_count INTEGER := 0;
  v_transferred_at TIMESTAMPTZ := COALESCE(p_transferred_at, CURRENT_TIMESTAMP);
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
  v_source_branch_name TEXT;
  v_destination_branch_name TEXT;
  v_outbound_note TEXT;
  v_inbound_note TEXT;
BEGIN
  IF p_source_branch_code IS NULL OR p_destination_branch_code IS NULL THEN
    RAISE EXCEPTION 'Debes indicar sede origen y sede destino'
      USING ERRCODE = '23514';
  END IF;

  IF p_source_branch_code = p_destination_branch_code THEN
    RAISE EXCEPTION 'La sede origen y la sede destino deben ser distintas'
      USING ERRCODE = '23514';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de transferencia'
      USING ERRCODE = '23514';
  END IF;

  SELECT b.name
  INTO v_source_branch_name
  FROM public.branches b
  WHERE b.code = p_source_branch_code
  LIMIT 1;

  IF v_source_branch_name IS NULL THEN
    RAISE EXCEPTION 'Sede origen no encontrada'
      USING ERRCODE = '23503';
  END IF;

  SELECT b.name
  INTO v_destination_branch_name
  FROM public.branches b
  WHERE b.code = p_destination_branch_code
  LIMIT 1;

  IF v_destination_branch_name IS NULL THEN
    RAISE EXCEPTION 'Sede destino no encontrada'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.product_transfers (
    source_branch_code,
    destination_branch_code,
    user_code,
    transferred_at,
    note
  ) VALUES (
    p_source_branch_code,
    p_destination_branch_code,
    p_user_code,
    v_transferred_at,
    v_note
  )
  RETURNING * INTO v_transfer;

  FOR v_item IN
    SELECT
      item.product_code,
      item.quantity
    FROM jsonb_to_recordset(p_items) AS item(
      product_code UUID,
      quantity INTEGER
    )
  LOOP
    IF v_item.product_code IS NULL THEN
      RAISE EXCEPTION 'Cada item debe incluir product_code'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad de cada item debe ser mayor a 0'
        USING ERRCODE = '23514';
    END IF;

    v_items_count := v_items_count + 1;
    v_outbound_note := CASE
      WHEN v_note IS NULL THEN FORMAT('Transferencia a %s', v_destination_branch_name)
      ELSE FORMAT('Transferencia a %s: %s', v_destination_branch_name, v_note)
    END;
    v_inbound_note := CASE
      WHEN v_note IS NULL THEN FORMAT('Transferencia desde %s', v_source_branch_name)
      ELSE FORMAT('Transferencia desde %s: %s', v_source_branch_name, v_note)
    END;

    INSERT INTO public.product_transfer_items (
      transfer_code,
      product_code,
      quantity
    ) VALUES (
      v_transfer.code,
      v_item.product_code,
      v_item.quantity
    );

    INSERT INTO public.inventory_movements (
      product_code,
      branch_code,
      user_code,
      quantity,
      direction,
      reason,
      purchase_code,
      sale_code,
      transfer_code,
      occurred_at,
      note
    ) VALUES (
      v_item.product_code,
      v_transfer.source_branch_code,
      v_transfer.user_code,
      v_item.quantity,
      'out',
      'transfer',
      NULL,
      NULL,
      v_transfer.code,
      v_transferred_at,
      v_outbound_note
    );

    INSERT INTO public.inventory_movements (
      product_code,
      branch_code,
      user_code,
      quantity,
      direction,
      reason,
      purchase_code,
      sale_code,
      transfer_code,
      occurred_at,
      note
    ) VALUES (
      v_item.product_code,
      v_transfer.destination_branch_code,
      v_transfer.user_code,
      v_item.quantity,
      'in',
      'transfer',
      NULL,
      NULL,
      v_transfer.code,
      v_transferred_at,
      v_inbound_note
    );
  END LOOP;

  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de transferencia'
      USING ERRCODE = '23514';
  END IF;

  RETURN v_transfer;
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
  price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
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
    p.price::NUMERIC(12,2) AS price,
    p.cost_price::NUMERIC(12,2) AS cost_price,
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
