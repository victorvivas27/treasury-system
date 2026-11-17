import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = 'docs/architecture/modules/12-shared-infrastructure/github-actions';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const pilot = JSON.parse(readFileSync(resolve(root, 'docs/architecture/modules/01-auth-security/architecture.json'), 'utf8'));
const snapshot = new Map();
const workflow = name => `.github/workflows/${name}.yml`;
const src = (path, needle, length = 14) => {
  if (!snapshot.has(path)) {
    const bytes = execFileSync('git', ['show', `${revision}:${path}`], { cwd: root });
    snapshot.set(path, { bytes, lines: bytes.toString('utf8').replace(/\n$/, '').split('\n') });
  }
  const { lines } = snapshot.get(path);
  const index = lines.findIndex(line => line.includes(needle));
  if (index < 0) throw new Error(`Source not found: ${path}: ${needle}`);
  return { path, line: index + 1, end_line: Math.min(lines.length, index + length) };
};
const w = (name, needle = 'on:', length) => src(workflow(name), needle, length);
const node = (id, label, sublabel, sources, type = 'backend') => ({ id, label, sublabel, sources, type });
const edge = (from, to, label) => ({ from, to, label });
const notes = (title, ...items) => ({ dot: 'cyan', title, items });
const definitions = [
  {
    id: 'ci-cd-workflows', title: 'GitHub Actions · Eventos y coordinadores',
    nodes: [
      node('dev', 'Push a dev', '00 · Decide el responsable', [w('00-dev-validation')], 'frontend'),
      node('pr', 'Pull request', '00 · PR Validation', [w('00-pr-validation')], 'frontend'),
      node('main', 'Push a main', '06 · Release Please', [w('06-release-please')], 'frontend'),
      node('manual', 'Ejecución manual', '11 · Allure privado', [w('11-publish-allure')], 'frontend'),
      node('suites', 'Suites reutilizables', '01 commits · 02 UI · 03 API', [w('01-commit-lint'), w('02-frontend-ci'), w('03-backend-ci')]),
      node('gates', 'Checks de release', '14 main · 12 evidencia', [w('14-main-validation'), w('12-release-validation')], 'security'),
      node('outputs', 'Consumidores', '07 deploy · 09 Pages · 10 sync', [w('07-deploy-backend'), w('09-reports-pages'), w('10-sync-main-dev')], 'external'),
      node('security', 'Controles de seguridad', '13 archivos · 15 secretos', [w('13-protected-files'), w('15-secret-scanning')], 'security'),
      node('api-version', 'API y versionado', '04 Bruno · 05 Versionado', [w('04-bruno-tests'), w('05-versioning-ci')]),
    ],
    edges: [edge('dev','suites','Sin PR coincidente'),edge('pr','suites','Según archivos'),edge('main','gates','Coordina main/release'),edge('gates','outputs','Gates y SHA aprobados'),edge('manual','gates','Llama 12'),edge('pr','security','Siempre en PR'),edge('suites','api-version','También 04 y 05')],
    cards: [notes('Eventos independientes', 'Push dev y synchronize del PR son eventos distintos. El coordinador dev delega si el PR del mismo repositorio cubre exactamente el SHA.', '15 también tiene push main, ejecución manual y programación semanal lunes 12:00 UTC.'), notes('Cómo leer agrupaciones', 'Suites agrupa 01–05; controles agrupa 13 y 15; consumidores agrupa 07, 09 y 10. SRC enumera cada YAML de esos grupos.', 'workflow_call aparece como trabajo anidado; un nodo gris no demuestra que se hayan ejecutado tests.'), notes('Límites', 'No existe 08-deploy-frontend.yml en esta revisión. 14 solo tiene workflow_call. Los demás detalles de cada ruta están en sus vistas.', 'Diagrama del código de referencia, sin consulta a runs ni protección de ramas en vivo.')],
  },
  {
    id:'ci-cd-dev-pr', title:'GitHub Actions · Push dev y pull request',
    nodes:[
      node('push','Push a dev','Evento del commit',[w('00-dev-validation')],'frontend'),
      node('route','Buscar PR por SHA','route · repositorio y base',[w('00-dev-validation','  route:',29)],'security'),
      node('defer','PR coincidente','Omitir suites del push',[w('00-dev-validation',"const covered",9)]),
      node('pr','PR hacia dev/main','opened · synchronize · edited',[w('00-pr-validation')],'frontend'),
      node('select','Seleccionar suites','changes · archivos del PR',[w('00-pr-validation','  changes:',48)]),
      node('suites','Frontend / Backend','Bruno / Versionado',[w('00-pr-validation','  frontend:',34),w('00-dev-validation','  frontend:',30)]),
      node('security','Commits y seguridad','01 · 13 · 15',[w('00-pr-validation','  secrets:',7),w('00-pr-validation','  commits:',8)],'security'),
      node('result','Resultado del PR','PR validation result',[w('00-pr-validation','  result:',24)],'security'),
    ],
    edges:[edge('push','route','Consulta API'),edge('route','defer','Coincide SHA'),edge('route','suites','Sin coincidencia: todas'),edge('pr','select','Lista cambios'),edge('select','suites','Solo aplicables'),edge('pr','security','Obligatorias'),edge('suites','result','Éxito u omisión válida'),edge('security','result','Éxito obligatorio')],
    cards:[notes('El responsable del candidato','La comprobación del push no espera el resultado del PR: deja los checks a su coordinador. Si falla la consulta, route falla visiblemente.', 'Sin PR coincidente se llaman todas las suites y controles; esa ruta todavía no filtra por cambios.'),notes('Selección y cancelaciones','PR de release, archivos compartidos o lista truncada a 3000 archivos seleccionan todas las suites. Se consideran rutas anteriores de archivos renombrados.', 'El coordinador PR cancela runs anteriores del mismo PR; dev cancela anteriores de la rama.'),notes('Trabajo pendiente','edited vuelve a activar el coordinador, incluso si solo cambia el título. Separar metadatos de contenido sigue pendiente.', 'El check agregado rechaza fallos, cancelaciones y omisión de controles obligatorios. No se ha consultado su obligatoriedad remota.')],
  },
  {
    id:'ci-cd-release', title:'GitHub Actions · Main y release',
    nodes:[
      node('main','Push a main','06 · prepare',[w('06-release-please','  prepare:',29)],'frontend'),
      node('release','Preparar release','Acción local y PR pendiente',[src('.github/actions/release-please/action.yml','name:',18),w('06-release-please','      - name: Select pending release',56)]),
      node('check','Esperar check del PR','SHA + base + PR exactos',[w('06-release-please','            const checkName',92)],'security'),
      node('merge','Integrar y publicar','Merge validado y tag exacto',[w('06-release-please','      - name: Publish merged release',27)]),
      node('ordinary','14 · Main ordinario','Sin release; main vigente',[w('06-release-please','  main-target:',50),w('14-main-validation','  frontend:',28)]),
      node('checks','14 · Checks de main','Commits, archivos, Bruno, versión',[w('14-main-validation','jobs:',73)],'security'),
      node('final','12 · Evidencia final','Frontend y Backend forzados',[w('06-release-please','  validate-release:',17),w('12-release-validation','  frontend:',20)],'security'),
      node('consumers','07 / 09 / 10','Consumen gates y mismo SHA',[w('06-release-please','  deploy-backend:',29),w('06-release-please','  sync-dev:',19),w('06-release-please','  publish-reports:',29)],'external'),
    ],
    edges:[edge('main','release','Prepara candidato'),edge('release','check','Si hay PR elegible'),edge('check','merge','Check aprobado'),edge('main','ordinary','Sin release y vigente'),edge('merge','checks','Release publicada'),edge('merge','final','En paralelo'),edge('checks','consumers','Gate main'),edge('final','consumers','Evidencia del SHA')],
    cards:[notes('No toda ejecución publica','06 también recupera una release ya publicada en prepare. Los candidatos superados por nuevos commits no autorizan una publicación.', 'El check previo debe pertenecer al PR, head y base seleccionados. Un fallo bloquea; cambios de candidato o base dejan paso al siguiente run.'),notes('Repetición comprobada','El PR automático selecciona todas las suites. Después 06 llama 12 con el tag, sin aportar evidencia compartida del PR; 12 fuerza Frontend y Backend.', '14 omite Frontend/Backend cuando release=true, porque 12 se encarga. Bruno y versionado siguen en 14.'),notes('Integración y permisos','La integración con GITHUB_TOKEN no dispara otro push; 06 coordina explícitamente los consumidores y la sincronización.', '06 serializa por release-please-main sin cancelar. El gráfico no ejecuta merges ni despliegues.')],
  },
  {
    id:'ci-cd-evidence', title:'GitHub Actions · Evidencia y reutilización',
    nodes:[
      node('input','Entradas de la suite','Árbol Git: rutas, modos, blobs',[src('scripts/ci-validation.cjs','function fingerprint',34)],'database'),
      node('hash','Huella SHA-256','Suite y esquema de validación',[src('scripts/ci-validation.cjs','function currentFingerprint',4)]),
      node('lookup','Buscar artefacto','Mismo nombre y huella',[src('scripts/ci-validation.cjs','async function findArtifact',32)]),
      node('reuse','Reutilizar éxito','Vigente, propio y autorizado',[src('scripts/ci-validation.cjs',"run.status === 'completed'",6)],'security'),
      node('fresh','Ejecutar comprobaciones','Sin coincidencia o force=true',[src('.github/actions/reuse-validation/action.yml','          let artifact;',20),w('02-frontend-ci','      - name: Run tests',9)]),
      node('release','Contrato de release','SHA exacto; inputs completos',[src('scripts/select-release-evidence.cjs','function selectEvidence',17)],'security'),
      node('verify','Verificar procedencia','Recibo + conteos + cobertura',[src('scripts/ci-validation.cjs','function validateEvidence',40),src('scripts/validate-release-evidence.mjs','export function validateReleaseEvidence',17)],'security'),
      node('forced','Generar evidencia final','12 fuerza Frontend y Backend',[w('12-release-validation','  frontend:',20)]),
    ],
    edges:[edge('input','hash','Calcula entradas'),edge('hash','lookup','Clave por suite'),edge('lookup','reuse','Coincide y éxito'),edge('lookup','fresh','No válida / force'),edge('release','verify','Evidencia compartida'),edge('release','forced','Sin inputs compartidos'),edge('forced','verify','Artefactos nuevos')],
    cards:[notes('Dos contratos diferentes','La reutilización ordinaria admite commits distintos con entradas iguales. El contrato de release exige el SHA final y la ejecución actual.', 'Quitar force=true no adapta IDs de artefactos ni la procedencia entre ejecuciones; esa mejora sigue pendiente.'),notes('Qué invalida una huella','Todos los archivos .github/, scripts/ y de raíz son entradas compartidas. Cada suite añade su código/configuración; Backend y Bruno incluyen manifiestos frontend de reporting.', 'Un cambio de VERSION o herramientas puede invalidar varias suites aunque no cambie la lógica de aplicación.'),notes('Vigencia y carreras','Solo se aceptan workflows completados con éxito, autorizados y del repositorio. Artefactos expirados o consultas fallidas conducen a ejecutar comprobaciones.', 'Dos ejecuciones simultáneas pueden no encontrar éxito anterior y repetir pruebas. Retención: hasta 14 días, limitada por política remota.')],
  },
  {
    id:'ci-cd-delivery', title:'GitHub Actions · Despliegue y reportes',
    nodes:[
      node('coordinator','06 · Gates aprobados','Mismo SHA en 14 y 12',[w('06-release-please','  deploy-backend:',27),w('06-release-please','  publish-reports:',29)],'security'),
      node('backend','07 · Backend','Recibe SHA y artefactos',[w('07-deploy-backend','  validation:',18)]),
      node('verify','12 · Verificar evidencia','Omitir suites compartidas',[w('12-release-validation','  evidence:',57)],'security'),
      node('pages','09 · Cobertura','Descarga y ensambla HTML',[w('09-reports-pages','  validation:',17),w('09-reports-pages','  build-reports:',41)]),
      node('cloud','Artifact Registry / Run','Imagen, WIF y despliegue',[w('07-deploy-backend','      - name: Build backend image',30),w('07-deploy-backend','      - name: Deploy backend to Cloud Run',18)],'external'),
      node('public','GitHub Pages','Cobertura pública filtrada',[w('09-reports-pages','  deploy:',22),src('scripts/assemble-public-coverage.mjs','import ',12)],'external'),
      node('allure','11 · Allure manual','12 y Bruno force=true',[w('11-publish-allure','  validation:',22)],'frontend'),
      node('private','Almacenamiento privado','HTML y catálogo; acceso bloqueado',[w('11-publish-allure','      - name: Verify private storage',19),w('11-publish-allure','      - name: Upload private HTML',12)],'external'),
    ],
    edges:[edge('coordinator','backend','Entrega evidencia'),edge('coordinator','pages','Entrega evidencia'),edge('backend','verify','Llama validador'),edge('pages','verify','Llama validador'),edge('backend','cloud','Tras verificar'),edge('pages','public','Tras verificar'),edge('allure','private','Tras 12 y Bruno')],
    cards:[notes('Grafo largo no implica todos los tests','07 y 09 vuelven a llamar 12, pero con evidencia compartida válida se omiten Frontend y Backend y se verifican artefactos de la misma ejecución.', 'La ruta manual de 07, 09 o 11 sin evidencia compartida sí genera pruebas nuevas. 11 fuerza además Bruno.'),notes('Permisos y concurrencia','Deploy usa WIF e id-token:write; Pages publica con pages:write. No se exponen valores de secretos.', 'Deploy, Pages y Allure tienen grupos de concurrencia propios sin cancelar ejecuciones en curso.'),notes('Alcance de publicación','Allure privado exige public access prevention enforced. Pages ensambla cobertura mediante un script específico.', 'El gráfico describe llamadas y configuración del repositorio; no confirma servicios, permisos ni publicaciones remotas.')],
  },
  {
    id:'ci-cd-sync', title:'GitHub Actions · Sincronizar main hacia dev',
    nodes:[
      node('caller','06 o ejecución manual','10 · sync main into dev',[w('06-release-please','  sync-dev:',19),w('10-sync-main-dev')],'frontend'),
      node('compare','Comparar historias','Refs main/dev y merge base',[w('10-sync-main-dev','            const { data: main }',18)]),
      node('noop','Dev ya incluye main','No escribe ni ejecuta suites',[w('10-sync-main-dev','            if (mainInDev',5)]),
      node('ff','Fast-forward','updateRef · force:false',[w('10-sync-main-dev','            let requiresValidation',12)]),
      node('merge','Ramas divergentes','Merge conserva ambas historias',[w('10-sync-main-dev','              // Preserve both histories',10)]),
      node('verify','Verificar SHA resultante','Main incluido en el commit',[w('10-sync-main-dev','            const { data: verified }',12)],'security'),
      node('skip','Omitir suites','Fast-forward exacto ya validado',[w('10-sync-main-dev','            let requiresValidation',12)],'security'),
      node('suites','Validar combinación','02 · 03 · 04 · 05',[w('10-sync-main-dev','  frontend:',30)]),
    ],
    edges:[edge('caller','compare','Lee refs actuales'),edge('compare','noop','Main ya incluido'),edge('compare','ff','Dev es ancestro'),edge('compare','merge','Historias divergen'),edge('ff','verify','SHA dev actualizado'),edge('merge','verify','SHA combinado'),edge('verify','skip','SHA exacto validado'),edge('verify','suites','Merge o sin prueba')],
    cards:[notes('Cuándo se evita repetir','already_validated solo basta si validated_sha coincide con main actual y la actualización es fast-forward. Un merge nuevo requiere validación.', 'Si dev ya incluye main, la operación no escribe ni revalida. Conflictos fallan sin reemplazar la rama.'),notes('Eventos explícitos','Las escrituras con GITHUB_TOKEN no disparan workflows push/PR. 10 llama explícitamente las suites necesarias del SHA sincronizado.', 'El caller 06 espera gates main/release para el mismo SHA, pero no espera que termine el despliegue.'),notes('Protecciones','La actualización de ref usa force:false; no reescribe historia. Antes de informar éxito se comprueba que el commit resultante incluye main.', 'La sincronización serializa por sync-main-into-dev; permisos contents:write solo en el job que escribe.')],
  },
];

mkdirSync(resolve(root, directory), { recursive: true });
const placements = {
  'ci-cd-workflows': { dev:[0,0],pr:[0,1],main:[0,2],manual:[1,3],suites:[1,0],gates:[1,2],outputs:[2,2],security:[1,1],'api-version':[2,0] },
  'ci-cd-dev-pr': { push:[0,0],route:[1,0],defer:[2,0],pr:[0,1],select:[1,1],suites:[2,1],security:[0,2],result:[2,2] },
  'ci-cd-release': { main:[0,0],release:[1,0],check:[2,0],merge:[2,1],ordinary:[0,1],checks:[1,1],final:[2,2],consumers:[1,2] },
  'ci-cd-evidence': { input:[0,0],hash:[1,0],lookup:[2,0],reuse:[2,1],fresh:[1,1],release:[0,2],verify:[2,2],forced:[1,3] },
  'ci-cd-delivery': { coordinator:[0,0],backend:[1,0],verify:[1,1],pages:[0,1],cloud:[2,0],public:[0,2],allure:[2,2],private:[2,3] },
  'ci-cd-sync': { caller:[0,0],compare:[1,0],noop:[2,0],ff:[1,1],merge:[0,1],verify:[1,2],skip:[2,2],suites:[0,2] },
};
for (const definition of definitions) {
  const components = definition.nodes.map(item => {
    const [col,row] = placements[definition.id][item.id];
    return { ...item, pos: [40 + col * 430, 60 + row * 240], size: [220, 86] };
  });
  const spec = { schema_version: 1, diagram_type: 'architecture', meta: {
    ...pilot.meta, title: definition.title, output: `${directory}/${definition.id}.html`,
    repository: { url: 'https://github.com/victorvivas27/treasury-system.git', revision },
  }, components, connections: definition.edges.map((item,index) => ({ id:`edge-${index+1}`, ...item })), cards: definition.cards };
  writeFileSync(resolve(root, directory, `${definition.id}.json`), JSON.stringify(spec, null, 2) + '\n');
}
const files = [...snapshot].map(([path,{bytes}]) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') }));
writeFileSync(resolve(root, directory, 'snapshot.json'), JSON.stringify({ revision, generatedAt: '2026-11-16', files }, null, 2) + '\n');
console.log(`${definitions.length} especificaciones Archify con fuentes del commit ${revision}; ${files.length} archivos de evidencia.`);
