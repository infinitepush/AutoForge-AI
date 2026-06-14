# AutoForge AI Deployment Guide

This document describes how to deploy the AutoForge AI MVP to production.

---

## 🚗 Frontend Deployment (Vercel)

Vercel is the recommended hosting platform for the Next.js frontend.

### Steps:
1. **Create/Log in to Vercel**: Go to [Vercel](https://vercel.com) and log in.
2. **Import Project**:
   - Click **Add New** -> **Project**.
   - Import your GitHub repository `AutoForge-AI`.
3. **Configure Build Settings**:
   - Set **Root Directory** to `frontend`.
   - Vercel automatically detects Next.js configuration and sets the build command as `npm run build` and output directory as `.next`.
4. **Configure Environment Variables**:
   - Add the following environment variable:
     - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend service on Render (e.g., `https://autoforge-backend.onrender.com`).
     - `NEXT_PUBLIC_APP_NAME`: `AutoForge AI`
5. **Deploy**: Click **Deploy**. Vercel will build and host your frontend app.

---

## ⚙️ Backend Deployment (Render)

Render is the recommended platform for hosting the FastAPI backend web service.

### Steps:
1. **Create/Log in to Render**: Go to [Render](https://render.com) and log in.
2. **Connect GitHub**: Go to your dashboard and select **New** -> **Web Service**.
3. **Configure Web Service**:
   - Select your `AutoForge-AI` repository.
   - Set **Name** (e.g., `autoforge-backend`).
   - Set **Root Directory** to `backend`.
   - Set **Runtime** to `Python`.
   - Set **Build Command** to `pip install -r requirements.txt`.
   - Set **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. **Configure Environment Variables**:
   - Click **Advanced** and add the following keys:
     - `GEMINI_API_KEY`: Your Google Gemini API Key.
     - `ALLOWED_ORIGINS`: Set to your deployed Vercel frontend URL (e.g., `https://autoforge-ai.vercel.app`) to allow secure cross-origin requests.
     - `ENVIRONMENT`: `production`
5. **Deploy**: Click **Create Web Service**. Render will install dependencies, spin up the server, and expose the live endpoints.

---

## 🔑 Required Environment Variables

### Frontend Variables:
| Variable Name | Purpose | Example Value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Endpoint of the FastAPI backend API | `https://autoforge-backend.onrender.com` |
| `NEXT_PUBLIC_APP_NAME` | Name of the web application | `AutoForge AI` |

### Backend Variables:
| Variable Name | Purpose | Example Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `ALLOWED_ORIGINS` | Permitted origins for CORS | `https://your-app.vercel.app` |
| `ENVIRONMENT` | Deployment environment identifier | `production` |

---

## 🛠️ Troubleshooting

### 1. 3D Model Loading fails (404 Error)
- **Problem**: Rims load, but the rest of the 3D model does not render, or there is a 404 in the console.
- **Solution**: Check that the main GLB asset (`range-rover-suv.glb`) exists in your repository under `frontend/public/models/`.

### 2. CORS Blocked on Prompt Submission
- **Problem**: Submitting prompts displays "Failed to fetch" or console shows CORS violations.
- **Solution**: Ensure that the `ALLOWED_ORIGINS` environment variable on Render matches your frontend Vercel URL exactly (without trailing slashes).

### 3. Backend Start Errors
- **Problem**: Render service logs show `ModuleNotFoundError` or startup command errors.
- **Solution**: Ensure your start command matches `uvicorn main:app --host 0.0.0.0 --port $PORT` and that `main.py` is present in the `backend/` root directory to expose the FastAPI application.
