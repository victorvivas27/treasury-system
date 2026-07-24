package com.tesoreria.alumno.config;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AlumnoDomainConfig {

    @Bean
    public AlumnoService alumnoService(
            AlumnoRepositoryOutPort repository,
            FamiliaRepositoryOutPort familiaRepository) {
        return new AlumnoService(repository, familiaRepository);
    }
}
