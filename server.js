// server.js
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
// --- NUEVAS DEPENDENCIAS PARA SUBIDA DE ARCHIVOS ---
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
// ----------------------------------------------------

const app = express();
// Render asignará un puerto, pero por convención usamos el env PORT o 3000 localmente.
const port = process.env.PORT || 3000;

// Middleware para parsear JSON (necesario para el POST de /api/projects)
app.use(express.json());

// === Configuración de CORS ===
// 🚨 ¡IMPORTANTE! Reemplaza con el dominio REAL de tu portfolio en Netlify
const NETLIFY_DOMAIN = 'https://my-favorite-sites.netlify.app'; 

const corsOptions = {
  // Permite la conexión desde tu dominio de Netlify y desde el desarrollo local (localhost:3000)
  origin: [NETLIFY_DOMAIN, 'http://localhost:3000'], 
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// =================================================================
// 📸 Configuración de Cloudinary
// =================================================================
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true, // Usar HTTPS
    });
} else {
    console.warn("ADVERTENCIA: Las variables de entorno de Cloudinary no están configuradas.");
}

// Configuración de Multer para manejar el archivo en memoria (como buffer)
// Esto es necesario para que Cloudinary pueda tomar el archivo directamente.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// =================================================================
// 🚀 ENDPOINT 1: Subida de Imagen a Cloudinary
// =================================================================
app.post('/api/upload-image', upload.single('imageFile'), async (req, res) => {
    // 1. Verifica si se subió un archivo
    if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo.' });
    }

    // 2. Verifica configuración de Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
         return res.status(500).json({ error: 'Cloudinary no está configurado en el servidor.' });
    }

    // 3. Convierte el buffer de la imagen a un string base64 para subir a Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    // Formato de data URI que acepta Cloudinary
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    // 4. Sube a Cloudinary
    try {
        const result = await cloudinary.uploader.upload(dataURI, {
            // Opcional: define una carpeta para organizar
            folder: "portfolio-sites", 
            // Opcional: limita el tamaño del archivo (útil para planes gratuitos)
            max_bytes: 5000000, // 5MB limit
            resource_type: "image"
        });

        // 5. Devuelve la URL segura al frontend
        res.json({ imageUrl: result.secure_url });

    } catch (error) {
        console.error('Error al subir a Cloudinary:', error);
        res.status(500).json({ error: 'Fallo la subida a Cloudinary.', details: error.message });
    }
});


// =================================================================
// 💾 ENDPOINT 2: Guardar Nuevo Proyecto (ahora con la URL de Cloudinary)
// =================================================================
app.post('/api/projects', async (req, res) => {
    const { title, description, link_url, link_text = 'Go to Site', image_url } = req.body;
    
    // Validación mínima
    if (!title || !description || !link_url || !image_url) {
        return res.status(400).json({ error: 'Faltan campos requeridos (title, description, link_url, image_url).' });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return res.status(500).json({ error: 'DATABASE_URL no está configurada.' });
    }

    try {
        const sql = neon(databaseUrl);
        
        // Ejecuta la inserción
        // Usamos ARRAY de valores con los nombres de columna correctos (title, description, link_url, link_text, image_url)
        const result = await sql`
            INSERT INTO projects (title, description, link_url, link_text, image_url)
            VALUES (${title}, ${description}, ${link_url}, ${link_text}, ${image_url})
            RETURNING id, title;
        `;

        res.status(201).json({ 
            message: 'Proyecto añadido exitosamente.', 
            newProjectId: result[0].id 
        });

    } catch (error) {
        console.error('Error al insertar en Neon:', error); 
        res.status(500).json({ error: 'Fallo al guardar el proyecto en la base de datos.', details: error.message });
    }
});


// =================================================================
// 📋 ENDPOINT 3: Obtener Proyectos
// (Este endpoint queda casi igual)
// =================================================================
app.get('/api/projects', async (req, res) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL no está configurada.');
        return res.status(500).json({ error: 'DATABASE_URL no está configurada.' });
    }

    try {
        const sql = neon(databaseUrl);
        
        const result = await sql`SELECT id, title, description, link_url, link_text, image_url FROM projects ORDER BY id DESC`;

        res.json(result); 

    } catch (error) {
        console.error('Error al consultar Neon:', error); 
        res.status(500).json({ error: 'Fallo al consultar la base de datos.' });
    }
});


// 4. Iniciamos el servidor
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});