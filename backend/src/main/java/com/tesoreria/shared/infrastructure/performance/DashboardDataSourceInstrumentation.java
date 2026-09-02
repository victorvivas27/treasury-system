package com.tesoreria.shared.infrastructure.performance;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Locale;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DashboardDataSourceInstrumentation implements BeanPostProcessor {
    private final boolean enabled;

    public DashboardDataSourceInstrumentation(@Value("${app.instrumentation.dashboard:false}") boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (!enabled || !(bean instanceof DataSource dataSource) || Proxy.isProxyClass(bean.getClass())) {
            return bean;
        }
        return Proxy.newProxyInstance(bean.getClass().getClassLoader(), new Class<?>[]{DataSource.class},
                new DataSourceHandler(dataSource));
    }

    private record DataSourceHandler(DataSource target) implements InvocationHandler {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if (!isGetConnection(method)) {
                return invokeTarget(method, target, args);
            }
            long startedAt = DashboardPerformanceProbe.now();
            Object connection = invokeTarget(method, target, args);
            DashboardPerformanceProbe.connectionAcquired(startedAt);
            if (connection instanceof Connection jdbcConnection) {
                return Proxy.newProxyInstance(connection.getClass().getClassLoader(),
                        new Class<?>[]{Connection.class}, new ConnectionHandler(jdbcConnection));
            }
            return connection;
        }

        private boolean isGetConnection(Method method) {
            return "getConnection".equals(method.getName()) && Connection.class.equals(method.getReturnType());
        }
    }

    private record ConnectionHandler(Connection target) implements InvocationHandler {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            Object result = invokeTarget(method, target, args);
            if (result instanceof PreparedStatement statement && isPreparedStatementFactory(method)) {
                String sql = args != null && args.length > 0 && args[0] instanceof String value ? value : null;
                return Proxy.newProxyInstance(statement.getClass().getClassLoader(),
                        new Class<?>[]{PreparedStatement.class},
                        new StatementHandler(statement, sql));
            }
            if (result instanceof Statement statement && isStatementFactory(method)) {
                return Proxy.newProxyInstance(statement.getClass().getClassLoader(),
                        new Class<?>[]{Statement.class}, new StatementHandler(statement, null));
            }
            return result;
        }

        private boolean isPreparedStatementFactory(Method method) {
            String name = method.getName();
            return name.equals("prepareStatement") || name.equals("prepareCall");
        }

        private boolean isStatementFactory(Method method) {
            return method.getName().equals("createStatement");
        }
    }

    private record StatementHandler(Statement target, String preparedSql) implements InvocationHandler {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if (!isExecute(method)) {
                return invokeTarget(method, target, args);
            }
            long startedAt = DashboardPerformanceProbe.now();
            try {
                return invokeTarget(method, target, args);
            } finally {
                DashboardPerformanceProbe.sql(method.getName(), sqlFor(args), startedAt);
            }
        }

        private boolean isExecute(Method method) {
            String name = method.getName().toLowerCase(Locale.ROOT);
            return name.startsWith("execute");
        }

        private String sqlFor(Object[] args) {
            if (preparedSql != null) return preparedSql;
            return args != null && args.length > 0 && args[0] instanceof String value ? value : null;
        }
    }

    private static Object invokeTarget(Method method, Object target, Object[] args) throws Throwable {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException exception) {
            throw exception.getCause();
        }
    }
}
