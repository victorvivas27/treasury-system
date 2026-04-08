package com.tesoreria.app;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TesoreriaAppApplication {
    public static Logger logger = LoggerFactory.getLogger(TesoreriaAppApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(TesoreriaAppApplication.class, args);
        logger.info("🚀 Tesorería App iniciada.");
    }
}
