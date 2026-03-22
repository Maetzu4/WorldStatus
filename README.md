# World Status - Dashboard Global

![World Status Dashboard](https://img.shields.io/badge/World_Status-000000?style=for-the-badge&logo=Next.js&logoColor=white)

Un dashboard global de alto rendimiento construido con **Next.js (App Router)**, **PostgreSQL** y **Redis**.
Compila información del mundo en las últimas 24 horas: clima, desastres naturales (filtrados de noticias), noticias globales, índices financieros y astronomía.

## Stack Tecnológico

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Leaflet (Mapas), Chart.js
- **Backend (API):** Next.js Route Handlers
- **Base de datos:** PostgreSQL (Queries en SQL crudo con `pg`)
- **Caché:** Redis (con `ioredis`)
- **Background Jobs:** Node.js Cron Scripts (`jobs/*`)
- **Logging:** Pino (Estructurado)

## Estructura del Proyecto

\`\`\`text
world-status/
├── db/
│   ├── schema.sql           # Esquina SQL de Inicialización (PostgreSQL)
├── jobs/
│   ├── weather-sync.ts      # Cron job de Clima (OpenWeather OneCall)
│   ├── news-sync.ts         # Cron job de Noticias y Desastres (NewsAPI)
│   └── astronomy-sync.ts    # Cron job de Astronomía (NASA DONKI y APOD)
├── src/
│   ├── app/
│   │   ├── api/data/...     # Route Handlers (Internal API + Redis Cache)
│   │   ├── layout.tsx       # Estructura principal y Sidebar
│   │   ├── page.tsx         # Dashboard / Landing Page Principal
│   ├── components/          # Componentes Reutilizables (Sidebar, Map, etc.)
│   ├── lib/
│   │   ├── db.ts            # Utilidad de cliente PostgreSQL
│   │   ├── redis.ts         # Utilidad de caché Redis
│   │   ├── errors.ts        # Jerarquía de Errores
│   │   └── logger.ts        # Configuración de Pino
\`\`\`

## Configuración y Setup para CubePath

1. **Clona el repositorio** e instala dependencias.
   \`\`\`bash
   npm install
   \`\`\`

2. **Configura Entorno Local**: Crea un `.env.local` usando las siguientes keys:
   \`\`\`env
   DATABASE_URL=postgresql://user:pass@localhost:5432/world_status
   REDIS_URL=redis://localhost:6379
   OPENWEATHER_API_KEY=tu_clave
   NEWS_API_KEY=tu_clave
   NASA_API_KEY=DEMO_KEY
   LOG_LEVEL=info
   \`\`\`

3. **Inicializa la Base de Datos**:
   Ejecuta el script SQL en PostgreSQL, por ejemplo usando \`psql\`:
   \`\`\`bash
   psql -U tu_usuario -d world_status -f db/schema.sql
   \`\`\`

4. **Compilar y Ejecutar en Producción**:
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`

5. **Configuración de Cron Jobs**:
   Usa un sistema cron real o \`pm2\` para ejecutar los scripts en Node:
   \`\`\`bash
   # Cada 6 horas
   0 */6 * * * npx ts-node jobs/weather-sync.ts
   
   # Cada 30 minutos
   */30 * * * * npx ts-node jobs/news-sync.ts
   
   # Cada 24 horas (Medianoche)
   0 0 * * * npx ts-node jobs/astronomy-sync.ts
   \`\`\`

## Notas Arquitectónicas

- **Caché First:** Cada endpoint de `/api/data/*` verifica Redis antes de golpear a PostgreSQL. La duración estándar del caché varıa entre 1 hora (para noticias) y 6 horas (para clima y astronomía).
- **Cero llamadas externas desde el cliente:** El frontend (Next.js components) *jamás* llama a OpenWeather, NASA o NewsAPI directamente. Los fetch los hace el servidor Next.js a su misma base o los scripts \`jobs/\` pre-llenan los datos.
- **Desastres Naturales:** No usamos APIs de desastres dedicados. El \`news-sync.ts\` filtra noticias con palabras clave (terremoto, huracán, etc.) y las etiqueta como \`category="desastre"\` en la tabla \`news_articles\`.

## SEO y Metadatos

Next.js App Router maneja los metadatos globales en \`layout.tsx\`. Se recomienda implementar [JSON-LD estructurado](https://schema.org) en páginas individuales como \`/disasters/\` para indexación como \`Event\` o \`NewsArticle\`.
