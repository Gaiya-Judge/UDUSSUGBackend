package com.udusug.voting.election.repository;

import com.udusug.voting.election.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    List<Position> findAllByOrderByIdAsc();
    List<Position> findBySessionLabelOrderByIdAsc(String sessionLabel);
}
