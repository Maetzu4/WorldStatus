# 🌍 WorldStatus - Global Intelligence Platform

![World Status Dashboard](https://img.shields.io/badge/World_Status-000000?style=for-the-badge&logo=Next.js&logoColor=white)
![Hackatón CubePath 2026](https://img.shields.io/badge/Hackat%C3%B3n-CubePath_2026-6366f1?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**WorldStatus** es una plataforma de inteligencia global en tiempo real diseñada para el **Hackatón CubePath 2026**.

Compila, procesa y analiza señales globales en 5 pilares fundamentales para crear un panorama holístico del estado del mundo:
🌪️ **Clima Ferviente & Desastres**
📰 **Noticias Globales & NLP Sentiment**
📈 **Inteligencia de Mercados Financieros**
🌌 **Space Weather (Clima Espacial)**

Todo esto culmina en el **Global Stability Index**, un dial interactivo único (0-100) que determina qué tan "estable" está el mundo en este preciso instante.

---

## 🔗 Enlaces Importantes

- **Demo en vivo (Desplegado en CubePath):** [✅ WorldStatus](http://worldstatus-fullstack-mwdqpj-3a3232-157-254-174-224.traefik.me/)

---

## ☁️ ¿Cómo usamos CubePath?

Este proyecto saca el máximo provecho de la insfraestructura de **CubePath** para garantizar una arquitectura escalable, asíncrona y de altísimo rendimiento:

1. **VPC & App Hosting:** El frontend y la API interna servidos a través del motor de alto rendimiento de Next.js.
2. **PostgreSQL en CubePath:** Usamos una instancia maneja para almacenar todos los eventos históricos sincronizados (clima, noticias geoposicionadas, flujos financieros y tormentas geomagnéticas detectadas por la NASA).
3. **Redis Caching:** Todos los cálculos matemáticos pesados (NLP de noticias, medias móviles financieras, _Space Weather Index_) se resuelven en el backend y se almacenan en Redis con tiempos de expiración inteligentes (15m a 6h) para que el frontend responda en milisegundos.
4. **Workers / Cron Jobs:** Contamos con _Background Jobs_ (Node) corriendo periódicamente para ingerir miles de datos de APIs externas (NASA DONKI, OpenWeather, NewsAPI, MarketStack) de manera segura y sin afectar el hilo principal.

---

## ⚖️ Criterios de Evaluación

WorldStatus fue diseñado desde el día cero pensando en los 4 criterios de excelencia del hackatón:

### 1. 🎨 Experiencia del Usuario (UX)

No queríamos un "dashboard de datos" más, queríamos un **Centro de Comando**.

- Diseño oscuro (Dark Mode nativo) con cristalmorfismo (glassmorphism) e iluminación de fondo interactiva según la gravedad de los eventos.
- **Jerarquía Visual Clara:** Tarjetas de rendimiento limpias, gráficas de barra _sparkline_ estilizadas e indicadores radiales para la Estabilidad Global y el _Space Weather_.
- **Microinteracciones:** Transiciones súper fluidas usando las capacidades nativas de Tailwind v4 y componentes que reaccionan de manera visual a cambios bruscos de datos (badasges pulsantes para alertas rojas `critical`).

### 2. 💡 Creatividad

Agrupar el clima o noticias es común. Lo **creativo** de WorldStatus es **cómo cruza esa información y la califica**.

- **Global Stability Index (GSI):** Unimos peras con manzanas. Creamos una fórmula algorítmica ponderada que mezcla cuántos huracanes hay, la caída bursátil de Asia, el sentimiento negativo de las noticias del día y la intensidad de llamaradas solares `X-class`.
- **Inteligencia Sin Pagar APIs Premium:** Derivamos conocimiento avanzado usando APIs gratuitas limitadas. Del _Marketstack Free_ deducimos índices de volatilidad y sentimiento de mercado; del crudo _NASA DONKI_ deducimos alertas tempranas sobre fallos potenciales en satélites y comunicaciones terrestres.

### 3. 🔧 Utilidad del Proyecto

WorldStatus resuelve el problema de la sobrecarga de información (Information Overload).
En lugar de revisar 5 portales distintos para saber "¿qué está pasando en el mundo?", el usuario entra a WorldStatus y en 3 segundos sabe si estamos en relativa paz, enfrentando crisis económicas masivas o bajo una tormenta geomagnética severa. Es una herramienta poderosa para analistas, periodistas y entusiastas globales.

### 4. ⚙️ Implementación Técnica

Arquitectura robusta pensada en producción:

- **Zero Frontend API Calls:** Toda la hidratación de datos ocurre en el cliente llamando exclusivamente a nuestra API propia `/api/data/*`. Ninguna Key externa queda expuesta; el rate-limiting lo controla nuestro servidor.
- **Cache-First Edge:** Ningún usuario que entra a la web hace sufrir a la base de datos SQL. Redis sirve latencias de `< 30ms`.
- **Procesamiento de Lenguaje Natural (NLP):** En el backend, un algoritmo evalúa palabras positivas/negativas de textos de noticias y extrae ubicaciones para un Mapa Mundial Interactivo (Leaflet).

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 16.2 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Leaflet.js
- **Backend (API):** Next.js Route Handlers, Node.js Cron Scripts
- **Persistencia:** PostgreSQL, Redis (`ioredis`)
- **Infraestructura:** CubePath Cloud

---

## 🚀 Setup Local (Para Jueces / Entusiastas)

Si deseas levantar el ecosistema completo en local:

1. **Instalación:**

   ```bash
   npm install
   ```

2. **Variables de Entorno (`.env.local`):**

   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/world_status
   REDIS_URL=redis://localhost:6379
   OPENWEATHER_API_KEY=tu_clave
   NEWS_API_KEY=tu_clave
   MARKETSTACK_API_KEY=tu_clave
   NASA_API_KEY=DEMO_KEY
   LOG_LEVEL=info
   ```

3. **Inicializa la BD (PostgreSQL):**

   ```bash
   psql -U tu_usuario -d world_status -f db/schema.sql
   ```

4. **Inicia el servidor:**
   ```bash
   npm run build
   npm run start
   ```

_(Nota: Deberás correr los scripts en la carpeta `jobs/` para pre-llenar la base de datos con información real de las distintas APIs)._

---

### ❤️ Agradecimientos

Proyecto construido por [@Maetzu4] con pasión, litros de café, y **CubePath**.
¡Nos vemos en los resultados de la Hackatón el 1 de Abril de 2026! 🎲
