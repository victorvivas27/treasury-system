package com.tesoreria;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
public class TesoreriaAppApplication {
    public static final Logger logger = LoggerFactory.getLogger(TesoreriaAppApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(TesoreriaAppApplication.class, args);
        logger.info("🚀 Tesorería App iniciada."); System.out.println(
                new BCryptPasswordEncoder().encode("Theoamiel2019$")
        );

    }
}
/**
 * "Es una arquitectura hexagonal con packages basados en contexto delimitado.
 * Si no lo entendés, estudiá más DDD."
 */
