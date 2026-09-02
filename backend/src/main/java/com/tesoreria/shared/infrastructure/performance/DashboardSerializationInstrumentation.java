package com.tesoreria.shared.infrastructure.performance;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Configuration
public class DashboardSerializationInstrumentation implements WebMvcConfigurer {
    private final DashboardPerformanceProbe probe;

    public DashboardSerializationInstrumentation(DashboardPerformanceProbe probe) {
        this.probe = probe;
    }

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (int index = 0; index < converters.size(); index++) {
            HttpMessageConverter<?> converter = converters.get(index);
            if (converter instanceof JacksonJsonHttpMessageConverter jackson) {
                converters.set(index, new TimedJacksonConverter(jackson, probe));
                return;
            }
        }
    }

    private static final class TimedJacksonConverter extends JacksonJsonHttpMessageConverter {
        private final DashboardPerformanceProbe probe;

        private TimedJacksonConverter(JacksonJsonHttpMessageConverter source,
                                      DashboardPerformanceProbe probe) {
            super(source.getMapper());
            this.probe = probe;
            setSupportedMediaTypes(source.getSupportedMediaTypes());
        }

        @Override
        protected void writeInternal(Object object, ResolvableType type,
                                     HttpOutputMessage outputMessage,
                                     Map<String, Object> hints)
                throws IOException, HttpMessageNotWritableException {
            long startedAt = DashboardPerformanceProbe.now();
            super.writeInternal(object, type, outputMessage, hints);
            probe.phaseCurrent("jsonSerialization", startedAt);
        }
    }
}
