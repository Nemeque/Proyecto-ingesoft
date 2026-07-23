# LibreChoice

Plataforma de recomendación personalizada de materias de libre elección para
estudiantes de la **Universidad Nacional de Colombia** — proyecto del curso
**Ingeniería de Software I (2026-1)**.

Este repositorio reúne:

- **`backend/`** — API REST en Django + Django REST Framework + JWT, con un motor de recomendación basado en scikit-learn.
- **`frontend/`** — SPA en React + Vite + TypeScript, ya conectada a la API real (antes usaba datos simulados).
- **`docs/`** — el esquema SQL de referencia (`librechoice_schema.sql`), el CSV de materias de ejemplo (`cursos_libre_eleccion_ejemplo.csv`) y la guía para cargar materias reales (`GUIA_IMPORTAR_CURSOS.md`).
- **`scripts/`** — el scraper de la página del SIA (`scrape_sia.py`) basado en Playwright.

---

## Novedades de la versión final

### Interacción tipo Netflix en el catálogo

- **Hover expansible**: al pasar el cursor sobre una tarjeta de materia, esta crece inline (sin abrir modal) y muestra los botones de acción rápida (Agregar a lista, Me gusta, Ver más, Compartir).
- **Click para fijar (pin)**: si el usuario hace click en la tarjeta expandida, esta se queda fijada en su lugar mientras el usuario decide — no abre el modal de golpe, lo cual es incómodo.
- **Modal solo cuando se quiere**: el modal con toda la información de la materia se abre únicamente al hacer click en el botón **Play** o **Ver más información**, no al hacer click en cualquier parte de la tarjeta.
- **Cierre con botón X**: la tarjeta expandida tiene un botón de cerrar (X) que la devuelve a su estado normal.

### Calificaciones que ya no se comparten entre materias

- **Bug corregido**: antes, si calificabas una materia con 4 estrellas y abrías otra, esta mostraba 4 estrellas como si ya la hubieras calificado. Ahora cada materia lee su propia calificación desde `courseService.getUserRating(courseId)` — completamente aislada.
- **Toast de confirmación** al calificar y al quitar la calificación.
- **Desglose de estrellas** (1★, 2★, 3★, 4★, 5★) visible en cada materia.
- **Versión forzada**: el componente se re-renderiza cuando cambia el estado global de calificaciones, así nunca queda desincronizado.

### Sistema de imágenes por materia

- **Pool de 30 imágenes temáticas** (programación, arte, ciencia, música, biblioteca, deportes, idiomas, filosofía, ingeniería, teatro, matemáticas, naturaleza, medicina, arquitectura, etc.) ubicadas en `frontend/public/courses/course_1.png` hasta `course_30.png`.
- **Asignación determinística por código**: se hace un hash FNV-1a del código de la materia y se mapea al pool — la misma materia siempre tiene la misma imagen, pero materias distintas tienen imágenes distintas siempre que sea posible.
- **Fallback SVG** si la imagen no carga.

### Buscador y filtros que funcionan

- **Buscador funcional**: ahora escribe en la URL (`/explore?search=...`) con debounce de 350 ms y filtra el catálogo en tiempo real contra el backend. Antes era un input puramente decorativo.
- **Botón para limpiar la búsqueda**: aparece una X al lado del input cuando hay texto.
- **Filtros por categoría**: `/explore?cat=top-rated`, `/explore?cat=popular`, `/explore?cat=recommended`, `/explore?cat=rate` (materias vistas).
- **"Ver todo" arreglado**: antes, hacer click en "Ver todo" de cualquier categoría solo mostraba unas pocas materias porque el backend tenía un `[:10]` y el frontend un `.slice(0, 15)`. Ambos límites fueron eliminados — ahora muestra todas las materias de esa categoría.

### Botón "Agregar a lista" reemplaza a "Inscribirse"

- El botón primario del modal cambió de "Inscribirse" a **"Agregar a lista"** — ahora añade la materia a la lista personal del usuario, con feedback visual (cambia a "En tu lista" + check verde) y toast de confirmación. El ícono `+` secundario hace lo mismo y se mantiene como atajo.

### Sistema de notificaciones funcional

- La campana del navbar ya no es decorativa — abre un dropdown con notificaciones reales (bienvenida, recomendaciones, solicitudes, actividad). Persiste en `localStorage`, marca como leídas, descarta individualmente o limpia todas. Badge con contador de no leídas.

### Panel de Configuración interactivo

- El ícono de engranaje del sidebar ya no salta directo a `/profile` — abre un panel lateral con preferencias (notificaciones, visualización, atajos de cuenta, acerca de). Las preferencias se guardan en `localStorage`.

### Solicitar agregar materia

- Botón visible en "Explorar" que abre un modal con formulario (nombre, código, facultad, créditos, nivel, modalidad, justificación). La solicitud se envía al backend (`POST /api/courses/requests`) y, si el backend no está disponible, se guarda localmente para no perderla. Aparece también una notificación push confirmando el envío.

### Scraper robusto

- `scripts/scrape_sia.py` ahora (a) normaliza espacios irrompibles (U+00A0), tabs y espacios dobles antes de comparar; (b) hace fuzzy matching con `difflib` y muestra sugerencias si el texto no calza; (c) tiene modo interactivo por defecto que combina discover + extract en una sola sesión — ya no hay que copiar valores a mano entre dos comandos.

---

## Requisitos

- **Python 3.11+** (recomendado 3.12)
- **Node.js 18+** y `npm` o `pnpm`
- Para el scraper opcional: **Playwright** (`pip install playwright && playwright install chromium`)

---

## Estructura del proyecto

```
LibreChoice/
├── backend/                 # Django + DRF + JWT
│   ├── Ingesoft/            # settings, urls raíz
│   ├── academics/           # Faculty, Career, Teacher, InterestTag
│   ├── accounts/            # Usuario personalizado + auth (JWT)
│   ├── courses/             # Course, Review, Favorite, ViewHistory + recomendador
│   │   └── management/commands/
│   │       ├── seed_demo.py        # datos base (facultades, carreras, demo user)
│   │       └── import_courses.py   # carga de materias desde CSV
│   ├── requirements.txt
│   ├── .env.example
│   └── manage.py
├── frontend/                # Vite + React + TypeScript
│   ├── public/courses/      # 30 imágenes PNG temáticas (course_1..30.png)
│   ├── src/app/
│   │   ├── components/      # CourseCard, CourseModal, Navbar, Sidebar, ...
│   │   ├── pages/           # HomePage, ExplorePage, MyListPage, ProfilePage, ...
│   │   └── utils/           # courseImage.ts, courseService.ts, ...
│   └── package.json
├── docs/
│   ├── cursos_libre_eleccion_ejemplo.csv   # 10 materias reales de ejemplo
│   ├── librechoice_schema.sql               # esquema SQL de referencia
│   └── GUIA_IMPORTAR_CURSOS.md              # cómo obtener más materias del SIA
├── scripts/
│   ├── scrape_sia.py        # scraper Playwright del buscador del SIA
│   └── requirements.txt     # dependencias del scraper
└── README.md                # este archivo
```

---

## Paso a paso completo (de cero a app corriendo)

### Paso 0 — Pre-requisitos

Antes de empezar necesitas tener instalados:

- **Python 3.11+**: verificar con `python --version`
- **Node.js 18+**: verificar con `node --version`
- **Git**: verificar con `git --version`

### Paso 1 — Clonar el repositorio

```bash
git clone <URL_DE_TU_REPO> LibreChoice
cd LibreChoice
```

> ⚠️ **Importante sobre la base de datos**: el archivo `backend/db.sqlite3` **NO se sube a git** (está en `.gitignore`). Esto es lo correcto en proyectos Django. En su lugar, el CSV `docs/cursos_libre_eleccion_ejemplo.csv` y el comando `import_courses` permiten regenerar la BD en cualquier máquina en segundos. Ver paso 5.

### Paso 2 — Levantar el backend

Abre una terminal en la carpeta del proyecto:

```bash
cd backend
python -m venv venv

# Windows (PowerShell):
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env


python manage.py migrate
python manage.py seed_demo
python manage.py import_courses ../scripts/cursos_sia_bogota.csv
python manage.py createsuperuser
python manage.py runserver
```

### Paso 3 — Migraciones y datos base

Sigue en la misma terminal (con el `venv` activado):

`seed_demo` crea una cuenta de prueba lista para usar:

- **Email**: `demo@librechoice.edu.co`
- **Password**: `demo1234`

### Paso 4 — Levantar el frontend

Abre **otra terminal** en la carpeta del proyecto:

```bash
cd frontend

# Instalar dependencias
npm install

# Crear .env.local desde el ejemplo
# Windows:
copy .env.example .env.local
# macOS / Linux:
cp .env.example .env.local

# Levantar el servidor de desarrollo
npm run dev
```

El frontend queda en **http://localhost:5173** y el backend en **http://localhost:8000**.

---

## Cargar más materias (catálogo completo del SIA)

El CSV de ejemplo trae 10 materias. Para tener el catálogo completo de libre elección de la UNAL, sigue **`docs/GUIA_IMPORTAR_CURSOS.md`** — explica cómo:

1. Entrar al buscador del SIA con tu cuenta.
2. Filtrar por "Libre Elección".
3. Exportar a CSV (manualmente o usando `scripts/scrape_sia.py` con Playwright).
4. Cargarlo con `python manage.py import_courses ruta_al_csv.csv`.

El scraper requiere:

```bash
pip install -r scripts/requirements.txt
playwright install chromium
python scripts/scrape_sia.py
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro de usuario. |
| `POST` | `/api/auth/login` | Login (devuelve JWT). |
| `GET`  | `/api/courses` | Lista paginada de materias con filtros (`?search=`, `?faculty=`, etc.). |
| `GET`  | `/api/courses/{id}` | Detalle de una materia. |
| `GET`  | `/api/courses/top-rated` | Top calificadas. |
| `GET`  | `/api/courses/popular` | Más populares. |
| `GET`  | `/api/courses/recommended` | Recomendadas para el usuario autenticado (motor de recomendación). |
| `POST` | `/api/courses/{id}/favorite` | Agregar/quitar de favoritos. |
| `POST` | `/api/courses/{id}/rate` | Calificar una materia (1-5 estrellas). |
| `GET`  | `/api/courses/requests/mine` | Lista de solicitudes del usuario. |
| `POST` | `/api/courses/requests` | Crear solicitud de nueva materia (acepta anónimo). |

Ver `docs/API.md` para el detalle completo.

---

## PostgreSQL (opcional, para producción)

Por defecto el proyecto corre en SQLite para poder levantarlo sin instalar nada más. Para usar PostgreSQL, en `backend/.env`:

```
DB_ENGINE=postgres
DB_NAME=librechoice
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
```

Y vuelve a correr `migrate` + `seed_demo` + `import_courses`.


## Comandos útiles de Django

```bash
# Crear migraciones después de cambiar un modelo
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Cargar datos base
python manage.py seed_demo

# Cargar materias desde CSV
python manage.py import_courses ruta/al/csv.csv

# Acceder al shell de Django
python manage.py shell

# Crear superusuario para /admin
python manage.py createsuperuser

# Levantar el servidor de desarrollo
python manage.py runserver

# Levantar con host accesible desde la red local
python manage.py runserver 0.0.0.0:8000
```

---

## Comandos útiles del frontend

```bash
# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción (genera dist/)
npm run build

# Previsualizar el build de producción
npm run preview

# Lint
npm run lint
```

---

## Solución de problemas comunes

### `ModuleNotFoundError: No module named 'django'`

El entorno virtual no está activado o no se instalaron las dependencias. Verifica:

```bash
cd backend
source venv/bin/activate    # o venv\Scripts\activate en Windows
pip install -r requirements.txt
python manage.py runserver
```

### El frontend no carga datos del backend

1. Verifica que el backend esté corriendo en `http://localhost:8000`.
2. Verifica que `frontend/.env.local` tenga `VITE_API_URL=http://localhost:8000/api`.
3. Verifica que las migraciones estén aplicadas y los datos cargados (`seed_demo` + `import_courses`).
4. Abre la consola del navegador (F12) — si hay errores de CORS, asegúrate de que `CORS_ALLOWED_ORIGINS` en `Ingesoft/settings.py` incluya `http://localhost:5173`.

### Las imágenes de las materias no aparecen

- Verifica que `frontend/public/courses/` tenga los archivos `course_1.png` hasta `course_30.png`.
- Si falta alguno, el fallback SVG debería mostrarse — si no se muestra, revisa la consola del navegador.

### El buscador no funciona

- Verifica que el backend esté corriendo y respondiendo en `http://localhost:8000/api/courses?search=algo`.
- Verifica que el navegador no esté bloqueando las redirecciones a `/explore?search=...`.

### El modal de una materia muestra calificaciones de otra

- Esto ya está corregido en la versión final. Si lo ves, asegúrate de tener la última versión del código (`CourseModal.tsx` debe leer la calificación desde `courseService.getUserRating(course.id)`).

---

## Créditos

- **Curso**: Ingeniería de Software I — 2026-1
- **Universidad**: Universidad Nacional de Colombia
- **Stack**: Django + Django REST Framework + JWT (backend), React + Vite + TypeScript + Tailwind CSS (frontend), scikit-learn (motor de recomendación), Playwright (scraper del SIA).
