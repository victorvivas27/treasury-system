import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../../core/D-config/api';
import { clearAccessToken, clearCsrfToken } from '../../../core/D-config/axiosInterceptor';
import { AdministrationsPage } from './AdministrationsPage';

const originalAdapter = apiClient.defaults.adapter;
const organization = { id: 7, name: 'Cuarto A', courseName: '4A', slug: 'cuarto-a',
  schoolYear: 2026, type: 'COURSE', active: true, senderName: 'Directiva', replyToEmail: 'curso@example.cl' };
let organizations: typeof organization[];
let requests: InternalAxiosRequestConfig[];
let respond: (request: InternalAxiosRequestConfig) => unknown;
const writes = () => requests.filter(request => request.method !== 'get');
function reject(request: InternalAxiosRequestConfig) {
  throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', request, undefined,
    { data: {}, status: 422, statusText: 'Rejected', headers: {}, config: request });
}
beforeEach(() => {
  clearAccessToken(); clearCsrfToken(); requests = []; organizations = [{ ...organization }];
  respond = request => request.url?.endsWith('/admins') ? [{ id: 1, name: 'Ana Pérez',
    email: 'ana@example.cl', enabled: true, accountNonLocked: true }]
    : request.method === 'get' ? organizations : organization;
  apiClient.defaults.adapter = async request => {
    requests.push(request);
    const data = await respond(request);
    return { data: JSON.stringify(data), status: 200, statusText: 'OK', headers: {}, config: request };
  };
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });
async function openPage() {
  render(<AdministrationsPage />);
  await screen.findByText('ana@example.cl');
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
function fillInitialAdmin() {
  fireEvent.change(screen.getByLabelText('Nombre del curso o administración', { exact: false }), { target: { value: 'Séptimo B' } });
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: '  Ana Pérez  ' } });
  fireEvent.change(screen.getByLabelText('Correo de acceso'), { target: { value: 'ANA@EXAMPLE.CL' } });
  fireEvent.change(screen.getByLabelText('Contraseña temporal', { exact: false }), { target: { value: 'ValidPass1!' } });
}

describe('course administration through HTTP', () => {
  it('loads administrators and shows their access status', async () => {
    await openPage();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4A' })).toBeInTheDocument();
    expect(requests.map(request => request.url)).toEqual(['/organizations', '/organizations/7/admins']);
  });

  it('creates an organization before its first administrator and normalizes identity fields', async () => {
    await openPage(); fillInitialAdmin();
    expect(screen.getByLabelText('Identificador', { exact: false })).toHaveValue('septimo-b');
    click('Crear administración');
    await screen.findByText('Administración y administrador creados correctamente.');
    expect(writes().map(request => request.url)).toEqual(['/organizations', '/organizations/7/admins']);
    expect(JSON.parse(writes()[0].data)).toEqual({ name: 'Séptimo B', slug: 'septimo-b', type: 'COURSE',
      senderName: 'Séptimo B', replyToEmail: 'ana@example.cl' });
    expect(JSON.parse(writes()[1].data)).toEqual({ name: 'Ana Pérez', email: 'ana@example.cl', password: 'ValidPass1!' });
    expect(screen.getByLabelText('Identificador', { exact: false })).toHaveValue('');
  });

  it('preserves an explicitly edited slug when the course name changes', async () => {
    await openPage(); fillInitialAdmin();
    fireEvent.change(screen.getByLabelText('Identificador', { exact: false }), { target: { value: 'Mi Curso!' } });
    fireEvent.change(screen.getByLabelText('Nombre del curso o administración', { exact: false }), { target: { value: 'Otro nombre' } });
    expect(screen.getByLabelText('Identificador', { exact: false })).toHaveValue('mi-curso');
    const password = screen.getByLabelText('Contraseña temporal', { exact: false });
    click('Mostrar contraseña'); expect(password).toHaveAttribute('type', 'text');
    click('Ocultar contraseña'); expect(password).toHaveAttribute('type', 'password');
    expect(writes()).toHaveLength(0);
  });

  it.each(['organization', 'admin'])('reports %s creation failure without claiming complete success', async stage => {
    await openPage(); fillInitialAdmin();
    const normal = respond;
    respond = request => request.method === 'post' && (stage === 'organization' || request.url?.endsWith('/admins'))
      ? reject(request) : normal(request);
    click('Crear administración');
    await screen.findByText(stage === 'organization'
      ? 'No fue posible crear la administración. Revisa que el identificador y el correo no estén en uso.'
      : 'El curso fue creado, pero no se pudo crear su administrador. Puedes agregarlo desde la tarjeta del curso.');
    expect(writes()).toHaveLength(stage === 'organization' ? 1 : 2);
  });

  it('rejects an insecure password before any HTTP write', async () => {
    await openPage(); fillInitialAdmin();
    fireEvent.change(screen.getByLabelText('Contraseña temporal', { exact: false }), { target: { value: 'password' } });
    click('Crear administración');
    await screen.findByText(/Completa el curso y usa un administrador válido/);
    expect(writes()).toHaveLength(0);
  });

  it('creates an additional administrator and closes the form after success', async () => {
    await openPage(); click('Agregar administrador');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Nombre completo'), { target: { value: '  Luis Pérez  ' } });
    fireEvent.change(dialog.getByLabelText('Correo'), { target: { value: 'LUIS@EXAMPLE.CL' } });
    fireEvent.change(dialog.getByLabelText('Contraseña temporal'), { target: { value: 'ValidPass1!' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Crear administrador' }));
    await screen.findByText('Administrador agregado correctamente.');
    expect(writes()[0].url).toBe('/organizations/7/admins');
    expect(JSON.parse(writes()[0].data)).toEqual({ name: 'Luis Pérez', email: 'luis@example.cl', password: 'ValidPass1!' });
  });

  it.each([true, false])('confirms changing active=%s before sending PATCH', async active => {
    organizations[0].active = active;
    await openPage(); click(active ? 'Desactivar' : 'Reactivar');
    expect(writes()).toHaveLength(0);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: active ? 'Sí, desactivar' : 'Sí, reactivar' }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].method).toBe('patch');
    expect(writes()[0].url).toBe('/organizations/7/active');
    expect(writes()[0].params).toEqual({ value: !active });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('saves normalized sender branding', async () => {
    await openPage(); click('Configurar correo');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Nombre visible del remitente'), { target: { value: '  Directiva 4A  ' } });
    fireEvent.change(dialog.getByLabelText('Correo para respuestas'), { target: { value: 'CURSO@EXAMPLE.CL' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar configuración' }));
    await screen.findByText('Configuración de correo actualizada.');
    expect(writes()[0].url).toBe('/organizations/7/email-branding');
    expect(JSON.parse(writes()[0].data)).toEqual({ senderName: 'Directiva 4A', replyToEmail: 'curso@example.cl' });
  });

  it('saves the course name and school year through their dedicated endpoint', async () => {
    await openPage(); click('Editar curso y año');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Nombre actual del curso'), { target: { value: '  5A  ' } });
    fireEvent.change(dialog.getByLabelText('Año escolar'), { target: { value: '2027' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar curso y año' }));
    await screen.findByText('Nombre y año escolar actualizados correctamente.');
    expect(writes()[0].url).toBe('/organizations/7/course');
    expect(JSON.parse(writes()[0].data)).toEqual({ name: '5A', schoolYear: 2027 });
  });

  it('requires both exact confirmations before deletion and reloads the empty state', async () => {
    await openPage(); click('Eliminar');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Cuarto A' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Continuar' }));
    expect(dialog.getByRole('button', { name: 'Eliminar todo definitivamente' })).toBeDisabled();
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'eliminar' } });
    expect(dialog.getByRole('button', { name: 'Eliminar todo definitivamente' })).toBeDisabled();
    expect(writes()).toHaveLength(0);
    const normal = respond;
    respond = request => { if (request.method === 'delete') organizations = []; return normal(request); };
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'ELIMINAR' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Eliminar todo definitivamente' }));
    await screen.findByText('Sin administraciones');
    expect(writes()[0].url).toBe('/organizations/7');
    expect(writes()[0].method).toBe('delete');
    expect(JSON.parse(writes()[0].data)).toEqual({ organizationName: 'Cuarto A', confirmation: 'ELIMINAR' });
  });

  it.each([
    ['Agregar administrador', 'No se pudo agregar el administrador. Revisa si el correo ya está registrado.'],
    ['Configurar correo', 'No fue posible actualizar el remitente del curso.'],
    ['Editar curso y año', 'No fue posible actualizar el curso y su año escolar.'],
  ])('preserves the form after %s fails', async (action, message) => {
    await openPage(); click(action);
    const dialog = within(screen.getByRole('dialog'));
    if (action === 'Agregar administrador') {
      fireEvent.change(dialog.getByLabelText('Nombre completo'), { target: { value: 'Luis Pérez' } });
      fireEvent.change(dialog.getByLabelText('Correo'), { target: { value: 'luis@example.cl' } });
      fireEvent.change(dialog.getByLabelText('Contraseña temporal'), { target: { value: 'ValidPass1!' } });
    }
    const normal = respond;
    respond = request => request.method !== 'get' ? reject(request) : normal(request);
    fireEvent.click(dialog.getByRole('button', { name: action === 'Agregar administrador' ? 'Crear administrador'
      : action === 'Configurar correo' ? 'Guardar configuración' : 'Guardar curso y año' }));
    await screen.findByText(message);
    expect(writes()).toHaveLength(1);
    expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it.each(['Agregar administrador', 'Configurar correo', 'Editar curso y año', 'Eliminar'])(
    'cancels %s before any write', async action => {
      await openPage(); click(action);
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: action === 'Eliminar' ? 'Cancelar' : 'Cerrar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(writes()).toHaveLength(0);
    });
});
