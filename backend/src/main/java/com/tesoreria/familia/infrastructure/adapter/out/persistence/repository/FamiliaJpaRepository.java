package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

  // 1. Busca la familia de un alumno (Retorna un Optional porque ahora hay una
  // sola Familia por alumno con su lista)
  Optional<FamiliaEntity> findByAlumnoId(Long alumnoId);

  // 2. Verifica si el alumno ya tiene un registro de familia asignado
  boolean existsByAlumnoId(Long alumnoId);

  // 3. Verifica si el alumno ya tiene una familia marcada como principal
  boolean existsByAlumnoIdAndPrincipalTrue(Long alumnoId);

  // 4. MÉTODOS CRUZADOS DE INFRAESTRUCTURA EXIGIDOS POR EL ADAPTADOR:
  // Filtra los datos metiéndose a la tabla intermedia 'familia_apoderados' usando
  // JOIN

  @Query("SELECT p FROM ApoderadoEntity p WHERE p.id IN " +
      "(SELECT a FROM FamiliaEntity f JOIN f.apoderadosIds a WHERE f.alumnoId = :alumnoId)")
  List<Apoderado> findApoderadosByAlumnoId(@Param("alumnoId") Long alumnoId);

  @Query("SELECT al FROM AlumnoEntity al WHERE al.id IN " +
      "(SELECT f.alumnoId FROM FamiliaEntity f JOIN f.apoderadosIds a WHERE a = :apoderadoId)")
  List<Alumno> findAlumnosByApoderadoId(@Param("apoderadoId") Long apoderadoId);

  // --- MÉTODOS ELIMINADOS O REEMPLAZADOS POR CONTRATO ---
  // - findByAlumnoIdAndApoderadoId (Eliminado: No se usa en el adaptador limpio)
  // - existsByAlumnoIdAndApoderadoId (Eliminado: No se usa en el adaptador
  // limpio)
  // - existsByAlumnoIdAndApoderadoIdNotAndPrincipalTrue (Eliminado: El principal
  // ahora aplica a toda la lista)
}
