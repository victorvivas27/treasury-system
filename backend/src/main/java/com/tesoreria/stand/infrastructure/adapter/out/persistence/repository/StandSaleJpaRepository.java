package com.tesoreria.stand.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.stand.core.model.StandPaymentMethod;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandSaleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface StandSaleJpaRepository extends JpaRepository<StandSaleEntity, Long> {
    @Query("select distinct s from StandSaleEntity s left join fetch s.items "
            + "where s.stand.id = :standId order by s.soldAt desc")
    List<StandSaleEntity> findByStandIdOrderBySoldAtDesc(@Param("standId") Long standId);

    boolean existsByStandId(Long standId);

    @Query("select s.paymentMethod as paymentMethod, sum(s.total) as total, count(s.id) as saleCount "
            + "from StandSaleEntity s where s.stand.id = :standId "
            + "and (s.status is null or s.status <> com.tesoreria.stand.core.model.StandSaleStatus.CANCELLED) "
            + "group by s.paymentMethod")
    List<SaleAggregate> aggregateSales(@Param("standId") Long standId);

    @Query("select i.productName as productName, i.category as category, i.variant as variant, "
            + "i.presentation as presentation, sum(i.quantity) as units, sum(i.subtotal) as total, "
            + "sum(i.costSubtotal) as cost, "
            + "sum(coalesce(i.unitEquivalence, 0.0000) * i.quantity) "
            + "as equivalentUnits from StandSaleEntity s join s.items i "
            + "where s.stand.id = :standId "
            + "and (s.status is null or s.status <> com.tesoreria.stand.core.model.StandSaleStatus.CANCELLED) "
            + "group by i.productName, i.category, i.variant, i.presentation")
    List<ItemAggregate> aggregateItems(@Param("standId") Long standId);

    @Query(value = """
            SELECT COALESCE(SUM(
                COALESCE((SELECT SUM(v.total) FROM event_stand_sales v WHERE v.stand_id = s.id AND (v.status IS NULL OR v.status <> 'CANCELLED')), 0)
                - ROUND(COALESCE((SELECT SUM(v.total) FROM event_stand_sales v WHERE v.stand_id = s.id AND (v.status IS NULL OR v.status <> 'CANCELLED') AND v.payment_method = 'DEBIT'), 0) * s.debit_commission / 100, 2)
                - ROUND(COALESCE((SELECT SUM(v.total) FROM event_stand_sales v WHERE v.stand_id = s.id AND (v.status IS NULL OR v.status <> 'CANCELLED') AND v.payment_method = 'CREDIT'), 0) * s.credit_commission / 100, 2)
                - ROUND(COALESCE((SELECT SUM(v.total) FROM event_stand_sales v WHERE v.stand_id = s.id AND (v.status IS NULL OR v.status <> 'CANCELLED') AND v.payment_method = 'TRANSFER'), 0) * s.transfer_commission / 100, 2)
                - COALESCE((SELECT SUM(i.cost_subtotal) FROM event_stand_sales v JOIN event_stand_sale_items i ON i.sale_id = v.id WHERE v.stand_id = s.id AND (v.status IS NULL OR v.status <> 'CANCELLED')), 0)
            ), 0)
            FROM event_stands s WHERE s.event_id = :eventId AND s.status = 'CLOSED'
            """, nativeQuery = true)
    BigDecimal calculateEventNetRevenueRaw(@Param("eventId") Long eventId);

    default BigDecimal calculateEventNetRevenue(Long eventId) {
        BigDecimal result = calculateEventNetRevenueRaw(eventId);
        return result == null || result.signum() == 0
                ? BigDecimal.ZERO : result.setScale(2, java.math.RoundingMode.UNNECESSARY);
    }

    interface SaleAggregate {
        StandPaymentMethod getPaymentMethod();

        BigDecimal getTotal();

        long getSaleCount();
    }

    interface ItemAggregate {
        String getProductName();

        String getCategory();

        String getVariant();

        String getPresentation();

        long getUnits();

        BigDecimal getTotal();

        BigDecimal getCost();

        BigDecimal getEquivalentUnits();
    }
}
