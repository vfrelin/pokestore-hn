# ⚡ PokéVault HN - Vitrina de Cartas Pokémon TCG & Gestor de Inventario

Aplicación web móvil-first diseñada especialmente para vender colecciones de cartas Pokémon en Honduras con conversión automática a Lempiras (HNL), control de stock/repetidas, ubicación física en álbumes y pedidos instantáneos por WhatsApp.

---

## 🚀 Cómo Ejecutar en Local

1. Abrir terminal en esta carpeta:
   ```bash
   npm run dev
   ```
2. Abre en tu navegador de la computadora:
   - `http://localhost:5173`
3. **¡Pruébalo en tu Celular directamente!**
   - Asegúrate de estar conectado al mismo Wi-Fi de tu casa y entra a la IP que muestra la terminal (ejemplo: `http://192.168.1.15:5173`).

---

## 🌟 Características Principales

### 1. 🛒 Vitrina de Clientes (Modo Comprador)
* **Diseño Nativo Móvil:** Visualización en cuadrícula responsiva, rápida y táctil.
* **Precios Duales:** Muestra el precio en **Lempiras (Lps.)** como principal y el precio de mercado USA (**$ USD**) de referencia.
* **Filtros Avanzados:** Por tipo de Pokémon (Fuego, Agua, Eléctrico, etc.), Colección/Set, Rareza, Condición (NM, LP, etc.) y búsqueda rápida por texto.
* **Gráfica de Histórico:** Tendencia de precio de los últimos 30 días con porcentaje de subida/bajada.
* **Control de Stock:** Muestra cuántas copias disponibles quedan de cada carta.
* **Carrito y Checkout por WhatsApp:** El cliente arma su pedido y al presionar "Enviar Pedido por WhatsApp", se genera automáticamente el mensaje con:
  - Lista detallada con cantidad, nombre, colección y condición.
  - Subtotales en \$ USD y Lempiras HNL.
  - **Ubicación en tu Álbum** (ej. `[Álbum 1 - Pág 4 - Casilla 2]`) para que tú como vendedor sepas exactamente en qué página buscar cada carta al instante.

### 2. 📦 Gestor de Inventario (Modo Vendedor / Admin)
* **Buscador de Cartas en Vivo (API Oficial):** Escribe el nombre (ej. `Charizard 151` o `Pikachu`) y autocompleta la foto en HD, set, número de carta y precio de mercado actual.
* **Control de Repetidas:** Agrega el stock inicial y suma/resta con botones rápidos `+` y `-`.
* **Filtro por Álbum Físico:** Puedes filtrar la lista para ver solo las cartas de `"Álbum 1"`, `"Álbum 2"` o `"Caja Vintage"`, facilitando el inventario físico en tus carpetas.
* **Precios Personalizables:** Usa el precio de mercado sugerido o asigna tu propio precio en dólares.
* **Configuración de Tienda:** Ajusta la tasa de cambio del dólar (ej. `25.00` o `25.20`), tu número de WhatsApp y nombre de tienda.
* **Copias de Seguridad (JSON):** Exporta e importa tu base de datos de 800+ cartas en 1 solo clic para no perder nada.

---

## 🌐 Cómo Publicar Gratis en Internet (0 Costo)

Puedes subir esta vitrina a internet en 2 minutos sin pagar nada:

### Opción 1: Vercel (Recomendado)
1. Crea una cuenta gratuita en [Vercel](https://vercel.com).
2. Sube esta carpeta a tu repositorio de GitHub.
3. Conecta el repositorio en Vercel y presiona **Deploy**. Tendrás un enlace público como `mitienda-pokemon.vercel.app` listo para compartir en tus estados de WhatsApp o redes sociales.

### Opción 2: Netlify
1. Ve a [Netlify](https://netlify.com).
2. Ejecuta `npm run build` en tu consola y arrastra la carpeta `dist` directamente a Netlify Drop.
