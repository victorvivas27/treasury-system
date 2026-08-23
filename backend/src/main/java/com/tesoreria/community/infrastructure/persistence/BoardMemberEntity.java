package com.tesoreria.community.infrastructure.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "course_board_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"election_year", "role", "position_number"}),
        @UniqueConstraint(columnNames = {"election_year", "apoderado_id"})
})
public class BoardMemberEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "election_year", nullable = false) private Integer electionYear;
    @Column(nullable = false, length = 20) private String role;
    @Column(name = "position_number", nullable = false) private Integer positionNumber;
    @Column(name = "apoderado_id", nullable = false) private Long apoderadoId;

    public Long getId() { return id; }
    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer value) { electionYear = value; }
    public String getRole() { return role; }
    public void setRole(String value) { role = value; }
    public Integer getPositionNumber() { return positionNumber; }
    public void setPositionNumber(Integer value) { positionNumber = value; }
    public Long getApoderadoId() { return apoderadoId; }
    public void setApoderadoId(Long value) { apoderadoId = value; }
}
