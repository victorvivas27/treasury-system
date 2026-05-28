package com.tesoreria.alumno.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;

@Configuration
public class AlumnoDomainConfig {

  @Bean
  public AlumnoService alumnoService(AlumnoRepositoryOutPort repository) {
    return new AlumnoService(repository);
  }
}
