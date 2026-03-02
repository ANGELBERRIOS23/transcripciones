# LegalScript Pro

Aplicación web para transcribir audiencias legales usando la API de Google Gemini.

## Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **IA**: Google Gemini (File API + generate_content)
- **Export**: `.docx` via librería `docx`
- **Deploy**: Docker / EasyPanel (puerto 3000)

## Variables de entorno (requeridas en EasyPanel)

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | API Key de Google AI Studio |
| `SITE_PASSWORD` | Contraseña de acceso a la app |
| `PORT` | Puerto del servidor (default: 3000) |
| `GEMINI_MODEL` | Modelo Gemini a usar (opcional) |

## Desarrollo local

```bash
# Backend
cd backend
cp .env.example .env   # llenar las variables
npm install
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Deploy en EasyPanel

1. Conectar este repositorio en EasyPanel
2. Elegir tipo **Dockerfile**
3. Puerto: **3000**
4. Configurar las variables de entorno: `GEMINI_API_KEY`, `SITE_PASSWORD`
5. Deploy
