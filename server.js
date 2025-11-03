// server.js
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
const port = process.env.PORT || 3000;

// La URL del backend de Render (el puerto es irrelevante para el CORS)
const RENDER_URL = 'https://nombre-de-tu-servicio.onrender.com'; // <--- ¡Importante: Reemplaza esto con la URL que Render te dé!

// Dominio de Netlify (necesario para CORS)
const NETLIFY_DOMAIN = 'https://portfolio-ddr.netlify.app/'; // <--- ¡Importante: Reemplaza esto con el dominio REAL de Netlify!

// CORS Configuration: Solo permite peticiones desde tu frontend de Netlify
const corsOptions = {
  origin: [NETLIFY_DOMAIN, 'http://localhost:3000'], // Añade localhost para desarrollo
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Función para conectar y obtener los proyectos
app.get('/api/projects', async (req, res) => {
    // La conexión a Neon se crea aquí, usando la variable de entorno de Render
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return res.status(500).json({ error: 'DATABASE_URL no está configurada.' });
    }

    try {
        const sql = neon(databaseUrl);
        // Consulta SQL para obtener los datos
        const query = 'SELECT id, title, description, link_url, link_text FROM projects ORDER BY id DESC';
        const result = await sql(query);
        
        // Devuelve el array de proyectos como JSON
        res.json(result); 
    } catch (error) {
        console.error('Error al consultar Neon:', error);
        res.status(500).json({ error: 'Fallo interno del servidor.' });
    }
});

app.listen(port, () => {
  console.log(`Server corriendo en el puerto ${port}`);
});