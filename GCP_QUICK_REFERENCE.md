# GCP Quick Reference - Presentation Script

## 🎯 One-Minute Overview

"I deployed EduTrack on Google Cloud Platform using a serverless architecture. The backend and frontend run on Cloud Run, which automatically scales and only charges for usage. The database is on Cloud SQL, a fully-managed PostgreSQL service. I set up automated CI/CD with Cloud Build, so every git push automatically builds and deploys the application."

---

## 📦 GCP Services Used (Quick List)

1. **Cloud Run** - Serverless container platform (hosts app)
2. **Cloud SQL** - Managed PostgreSQL database
3. **Cloud Build** - CI/CD automation
4. **Container Registry (GCR)** - Docker image storage
5. **Cloud SDK (gcloud)** - Command-line tool
6. **Cloud Logging** - Centralized logging

---

## ☁️ CLOUD RUN (2-3 lines each)

### **What It Is:**
"Cloud Run is a serverless container platform. I deploy Docker containers, and Google manages all the infrastructure, scaling, and networking."

### **Backend Service:**
"I deploy the FastAPI backend to Cloud Run with 512MB memory on port 8000. It automatically scales from 0 to N instances based on traffic, and I only pay when requests are being processed."

### **Frontend Service:**
"I deploy the React frontend as a static site served by Nginx. Cloud Run handles HTTPS automatically, and the frontend gets a unique URL like `edutrack-frontend-xxxxx-uc.a.run.app`."

### **Key Features:**
"Cloud Run provides automatic HTTPS, auto-scaling, and pay-per-use pricing. Each service gets a unique URL, and I can configure environment variables, memory limits, and database connections."

---

## 🗄️ CLOUD SQL (2-3 lines each)

### **What It Is:**
"Cloud SQL is a fully-managed PostgreSQL database. Google handles backups, updates, and security, so I don't need to manage the database server."

### **Connection:**
"Cloud Run connects to Cloud SQL via Unix socket, not network connection. This is more secure because the database has no public IP and is only accessible from Cloud Run services."

### **Configuration:**
"I use PostgreSQL 15 on a db-f1-micro instance. The connection string uses the format `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME` as the host, which tells Cloud Run to use the Unix socket."

---

## 🔨 CLOUD BUILD (2-3 lines each)

### **What It Is:**
"Cloud Build is a CI/CD platform that automatically builds and deploys my application when I push code to GitHub."

### **Pipeline Flow:**
"My pipeline has 8 steps: build backend image, push to registry, deploy backend, get backend URL, build frontend with that URL, push frontend, deploy frontend, and update backend CORS with frontend URL."

### **Automation:**
"I configured a Cloud Build trigger that watches the main branch. When I push code, it automatically runs the entire deployment pipeline, taking about 5-7 minutes to complete."

---

## 🔐 SECURITY (2-3 lines each)

### **Database Security:**
"The database has no public IP and is only accessible via Unix socket from Cloud Run. All data is encrypted at rest and in transit, and I use strong passwords."

### **Application Security:**
"Cloud Run provides automatic HTTPS with SSL certificates. I configure CORS to only allow requests from the frontend URL, and I use JWT tokens for authentication."

---

## 💰 COST (2-3 lines)

### **Pricing Model:**
"Cloud Run charges only for actual usage - CPU and memory during requests. When there's no traffic, it scales to zero and costs nothing. Cloud SQL charges for instance uptime, and I use the smallest tier (db-f1-micro) for cost efficiency."

---

## 🚀 DEPLOYMENT FLOW (Quick Summary)

**Manual:**
1. Create Cloud SQL instance
2. Apply database schema
3. Build and push Docker images
4. Deploy to Cloud Run
5. Configure CORS

**Automated (CI/CD):**
1. Push code to GitHub
2. Cloud Build triggers
3. Builds Docker images
4. Deploys to Cloud Run
5. Updates CORS automatically

---

## 🎯 KEY CHALLENGES SOLVED

### **1. Frontend Needs Backend URL at Build Time**
**Problem:** "React environment variables are baked into the build, so I need the backend URL when building the frontend, but the backend URL is only known after deployment."

**Solution:** "I have Cloud Build get the backend URL after deployment, save it to a file, and pass it as a build argument to the frontend Docker build. This way, the frontend build has the correct backend URL."

### **2. Backend Needs Frontend URL for CORS**
**Problem:** "The backend needs the frontend URL for CORS headers, but the frontend URL is only known after it's deployed."

**Solution:** "After both services are deployed, I have Cloud Build get the frontend URL and update the backend's environment variables. The backend reads this and configures CORS accordingly."

### **3. Database Connection**
**Problem:** "Need secure database connection without exposing database to internet."

**Solution:** "I use Unix socket connection via Cloud SQL connection name. Cloud Run connects through `/cloudsql/` path, which is more secure than TCP and doesn't require public IP."

---

## 📝 QUICK COMMANDS REFERENCE

```bash
# Deploy backend
gcloud run deploy edutrack-backend \
  --image gcr.io/PROJECT_ID/edutrack-backend:TAG \
  --region us-central1

# Get service URL
gcloud run services describe edutrack-backend \
  --region=us-central1 \
  --format='value(status.url)'

# Update environment variables
gcloud run services update edutrack-backend \
  --region=us-central1 \
  --update-env-vars="KEY=value"
```

---

## 🎤 PRESENTATION OPENING

"I deployed EduTrack on Google Cloud Platform using a modern serverless architecture. The application consists of a FastAPI backend and React frontend, both running on Cloud Run, with a PostgreSQL database on Cloud SQL. I set up automated CI/CD using Cloud Build, so every code push automatically builds Docker images and deploys to production."

---

## 🎤 PRESENTATION CLOSING

"The serverless architecture provides automatic scaling, pay-per-use pricing, and zero server management. The CI/CD pipeline ensures consistent deployments, and the managed database handles backups and security automatically. This setup is production-ready, cost-effective, and scalable."

---

## 📊 ARCHITECTURE DIAGRAM (Verbal)

```
User → HTTPS → Cloud Run (Frontend)
                ↓
            API Calls
                ↓
         Cloud Run (Backend)
                ↓
         Unix Socket
                ↓
          Cloud SQL (Database)
```

---

## ✅ KEY TAKEAWAYS

1. **Serverless**: No server management, auto-scaling
2. **Managed Services**: Database, builds, deployments
3. **CI/CD**: Automated pipeline on git push
4. **Security**: Unix sockets, HTTPS, private images
5. **Cost-Effective**: Pay-per-use, scale to zero
6. **Production-Ready**: Real-world deployment

---

Use this for quick reference during presentations or interviews!
