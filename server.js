// server.js
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
// Render asignará un puerto, pero por convención usamos el env PORT o 3000 localmente.
const port = process.env.PORT || 3000;

// === Configuración de CORS ===
// 🚨 ¡IMPORTANTE! Reemplaza con el dominio REAL de tu portfolio en Netlify
const NETLIFY_DOMAIN = 'https://my-favorite-sites.netlify.app'; 

const corsOptions = {
  // Permite la conexión desde tu dominio de Netlify y desde el desarrollo local (localhost:3000)
  origin: [NETLIFY_DOMAIN, 'http://localhost:3000', 'http://localhost:5173'], // Agregamos 5173 por si usas Vite/React
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware necesario para leer el cuerpo JSON del POST

// Función para inicializar la conexión a Neon
const getClient = () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        // En Render, si esto falla, significa que la variable de entorno no está configurada.
        throw new Error('DATABASE_URL is not configured.');
    }
    return neon(databaseUrl);
};


// ===============================================
// 1. GET ROUTE: Get all projects
// ===============================================
app.get('/api/projects', async (req, res) => {
    try {
        const sql = getClient();
        
        // Ejecuta la consulta SQL (Sintaxis correcta con backticks para GET simple)
        const result = await sql`SELECT id, title, description, link_url, link_text, image_url FROM projects ORDER BY id DESC`;

        res.json(result); 

    } catch (error) {
        console.error('Error fetching projects:', error); 
        res.status(500).json({ error: 'Failed to retrieve projects from database.', details: error.message });
    }
});


// ===============================================
// 2. POST ROUTE: Add a new site (Endpoint para el botón "Add Site")
// ===============================================
app.post('/api/projects', async (req, res) => {
    // 1. Recibir los datos del formulario de React
    const { title, description, link_url, image_url, link_text } = req.body;

    // 2. Validación simple de datos
    if (!title || !description || !link_url || !image_url || !link_text) {
        return res.status(400).json({ error: 'Missing required fields: title, description, link_url, image_url, or link_text.' });
    }

    try {
        const sql = getClient();

        // 3. Consulta SQL para INSERTAR el nuevo sitio
        const insertQuery = `
            INSERT INTO projects (title, description, link_url, image_url, link_text)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [title, description, link_url, image_url, link_text];

        // 🔴 FIX: Se utiliza sql.query() para consultas con parámetros ($1, $2, etc.)
        const result = await sql.query(insertQuery, values); 

        // El resultado de sql.query() es un objeto con la propiedad 'rows', 
        // pero la librería serverless (neon) a veces devuelve un array directo. 
        // Para asegurar compatibilidad con la estructura que espera el frontend, 
        // usaremos 'result.rows' si existe, o el primer elemento si es un array.
        const newSite = result.rows ? result.rows[0] : result[0];


        // 4. Éxito: Responder con un código 201 (Created)
        res.status(201).json({ 
            message: 'Site added successfully to the database.',
            newSite: newSite
        });

    } catch (err) {
        // 5. Error en la base de datos o en la consulta
        console.error('Error during site insertion:', err);
        // Devolver 500 con detalles del error (para debug en Render logs)
        res.status(500).json({ 
            error: 'Failed to insert site into database.',
            details: err.message 
        });
    }
});


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server corriendo en el puerto ${port}`);
});
