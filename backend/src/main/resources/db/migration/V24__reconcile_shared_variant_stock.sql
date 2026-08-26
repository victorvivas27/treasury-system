WITH reconciled AS (
    SELECT product.id,
           GREATEST(
               product.initial_stock::NUMERIC(14, 4) - COALESCE(SUM(
                   item.quantity * COALESCE(item.unit_equivalence, 1)
               ), 0),
               0
           ) AS remaining_stock
    FROM event_stand_products product
    LEFT JOIN event_stand_sales sale
        ON sale.stand_id = product.stand_id
       AND (sale.status IS NULL OR sale.status <> 'CANCELLED')
    LEFT JOIN event_stand_sale_items item
        ON item.sale_id = sale.id
       AND LOWER(TRIM(COALESCE(item.variant, '')))
           = LOWER(TRIM(COALESCE(product.variant, '')))
    WHERE product.initial_stock IS NOT NULL
      AND COALESCE(product.unit_equivalence, 1) = 1
    GROUP BY product.id, product.initial_stock
)
UPDATE event_stand_products product
SET current_stock = reconciled.remaining_stock,
    available = CASE WHEN reconciled.remaining_stock = 0 THEN FALSE ELSE product.available END
FROM reconciled
WHERE product.id = reconciled.id;
