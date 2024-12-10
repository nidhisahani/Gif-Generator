const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const gifRouter = require('./routes/gif');
const dotenv=require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Multer configuration for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size per file
});

// Upload route
app.post('/api/upload-images', upload.array('images'), (req, res) => {
    try {
        console.log('Received files:', req.files);

        // Check if the uploads folder exists and create it if it doesn't
        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
        }

        // Process the uploaded files
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const tempPath = file.path;
                const targetPath = path.join(uploadsPath, file.originalname);

                // Rename the file to preserve original names
                fs.renameSync(tempPath, targetPath);
                console.log(`File uploaded and renamed: ${file.originalname}`);
            });

            res.status(200).send('Images uploaded successfully!');
        } else {
            res.status(400).send('No files uploaded!');
        }
    } catch (error) {
        console.error('Error during file upload:', error.message);
        res.status(500).send('An error occurred during the upload process.');
    }
});

// GIF generation route
app.use('/api', gifRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
