// server.js
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
// Render asignará un puerto, pero por convención usamos el env PORT o 3000 localmente.
const port = process.env.PORT || 3000;

// === Configuración de CORS ===
// 🚨 ¡IMPORTANTE! Reemplaza con el dominio REAL de tu portfolio en Netlify
const NETLIFY_DOMAIN = 'https://tudominio-aqui.netlify.app'; 

const corsOptions = {
  // Permite la conexión desde tu dominio de Netlify y desde el desarrollo local (localhost:3000)
  origin: [NETLIFY_DOMAIN, 'http://localhost:3000'], 
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// === Endpoint para Proyectos ===
app.get('/api/projects', async (req, res) => {
    // La conexión a Neon usa la variable de entorno configurada en Render
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        // Esto solo debería ocurrir si olvidaste configurar DATABASE_URL en Render
        console.error('DATABASE_URL no está configurada.');
        return res.status(500).json({ error: 'DATABASE_URL no está configurada.' });
    }

    try {
        // 1. Inicializa la conexión a Neon
        const sql = neon(databaseUrl);
        
        // 2. Ejecuta la consulta SQL
        // 🚨 La sintaxis corregida: usa backticks (`) y no paréntesis ni comillas
        const result = await sql`SELECT id, title, description, link_url, link_text FROM projects ORDER BY id DESC`;
        
        // 3. Envía los resultados como JSON
        res.json(result); 

    } catch (error) {
        // Registra el error detallado para que lo veas en los Logs de Render
        console.error('Error al consultar Neon:', error); 
        // Envía un mensaje genérico al cliente (React)
        res.status(500).json({ error: 'Fallo interno del servidor.' });
    }
});

app.listen(port, () => {
  console.log(`Server corriendo en el puerto ${port}`);
});