import { randomUUID } from 'node:crypto';

export const brunoRequestFixtures = {
  bodyData: JSON.stringify({ nombre: 'victor javier', email: 'VICTOR@GMAIL.COM', telefono: '+56912345678', observaciones: 'Prueba Bruno' }),
  bodyDataUpdate: JSON.stringify({ nombre: 'victor javier vivas', email: 'VIVASVIVAS@GMAIL.COM', telefono: '+5624187541222', observaciones: 'Todo bien' }),
};

export function brunoFixtureSettings(environment = process.env) {
  if (!/^jdbc:postgresql:\/\/(?:localhost|127\.0\.0\.1):\d+\/(?:bruno_[a-zA-Z0-9_]+|treasury_ci)$/.test(environment.BRUNO_TEST_JDBC_URL ?? '') ||
      !environment.BRUNO_TEST_DB_USER || !environment.BRUNO_TEST_DB_PASSWORD) {
    throw new Error('Explicit loopback disposable Bruno database credentials required');
  }
  const password = `Bruno1!${randomUUID()}`;
  return { credentials: { Admin_Email: 'admin@bruno.invalid', Admin_Password: password },
    environment: { ...environment, BRUNO_SEED_PASSWORD: password } };
}
