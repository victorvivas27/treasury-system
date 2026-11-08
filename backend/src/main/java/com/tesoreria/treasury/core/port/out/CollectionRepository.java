package com.tesoreria.treasury.core.port.out;

import com.tesoreria.treasury.core.model.CollectionCampaign;
import java.util.List;
import java.util.Optional;

public interface CollectionRepository {
    List<CollectionCampaign> list(int year);
    Optional<CollectionCampaign> find(Long id, boolean lock);
    CollectionCampaign save(CollectionCampaign campaign);
    void archive(Long id);
}
