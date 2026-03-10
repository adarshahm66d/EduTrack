# Complete GCP (Google Cloud Platform) Guide for EduTrack

## 🎯 Overview
EduTrack is deployed on Google Cloud Platform using a serverless architecture with automated CI/CD. This document covers all GCP services, configurations, and deployment strategies used.

---

## 📦 GCP Services Used

### 1. **Cloud Run** ⭐ (Primary Service)
### 2. **Cloud SQL** (Database)
### 3. **Cloud Build** (CI/CD)
### 4. **Container Registry (GCR)** (Docker Images)
### 5. **Cloud SDK (gcloud)** (CLI Tool)
### 6. **Cloud Logging** (Monitoring)

---

## 1. ☁️ CLOUD RUN

### **What is Cloud Run?**
Cloud Run is a **serverless container platform** that automatically scales your applications. You deploy Docker containers, and Google manages the infrastructure.

### **Why Cloud Run?**
- ✅ **Serverless**: No server management, auto-scaling
- ✅ **Pay-per-use**: Only pay for actual usage
- ✅ **Fast deployment**: Deploy in seconds
- ✅ **HTTPS by default**: Automatic SSL certificates
- ✅ **Multiple languages**: Any containerized app

### **How We Use It:**

#### **Backend Service (`edutrack-backend`)**
```yaml
Service Name: edutrack-backend
Region: us-central1
Platform: managed
Memory: 512Mi
Port: 8000
Image: gcr.io/sms-capstone/edutrack-backend:SHORT_SHA
```

**Configuration:**
- **Container**: Python 3.11 with FastAPI
- **Port**: 8000 (Uvicorn server)
- **Memory**: 512MB (sufficient for API)
- **Auto-scaling**: 0 to N instances based on traffic
- **Cold start**: ~2-3 seconds (acceptable for API)

#### **Frontend Service (`edutrack-frontend`)**
```yaml
Service Name: edutrack-frontend
Region: us-central1
Platform: managed
Memory: 512Mi
Port: 80
Image: gcr.io/sms-capstone/edutrack-frontend:SHORT_SHA
```

**Configuration:**
- **Container**: Nginx serving React build
- **Port**: 80 (HTTP, Cloud Run handles HTTPS)
- **Memory**: 512MB (static files, minimal)
- **Auto-scaling**: 0 to N instances
- **Cold start**: <1 second (static files)

### **Key Features We Use:**

#### **1. Environment Variables**
```yaml
--set-env-vars="DATABASE_URL=...,SECRET_KEY=..."
```
- Store configuration without hardcoding
- Different values for dev/staging/prod
- Secure secrets (though should use Secret Manager)

#### **2. Cloud SQL Connection**
```yaml
--add-cloudsql-instances="${_CLOUDSQL_CONNECTION_NAME}"
```
- Connects to Cloud SQL via Unix socket
- Secure connection (no network exposure)
- Managed by Google

#### **3. Public Access**
```yaml
--allow-unauthenticated
```
- Makes service publicly accessible
- Gets HTTPS URL automatically
- No authentication required (public API)

#### **4. URL Generation**
Each service gets a unique URL:
- Backend: `https://edutrack-backend-xxxxx-uc.a.run.app`
- Frontend: `https://edutrack-frontend-xxxxx-uc.a.run.app`

### **How It Works:**
1. **Deploy**: Push Docker image to Container Registry
2. **Cloud Run**: Pulls image and creates service
3. **Scaling**: Automatically scales based on requests
4. **Traffic**: Routes to available instances
5. **Billing**: Pay only for CPU/memory used during requests

---

## 2. 🗄️ CLOUD SQL

### **What is Cloud SQL?**
Cloud SQL is a **fully-managed relational database** service. We use PostgreSQL 15.

### **Why Cloud SQL?**
- ✅ **Managed**: No database administration
- ✅ **Backups**: Automatic daily backups
- ✅ **High Availability**: Multi-zone replication
- ✅ **Security**: Encrypted at rest and in transit
- ✅ **Scalability**: Easy to scale up/down

### **Our Configuration:**
```yaml
Instance Name: edutrack-db
Database Version: PostgreSQL 15
Tier: db-f1-micro (1 vCPU, 0.6GB RAM)
Region: us-central1
Database Name: edutrack
User: postgres
```

### **Connection String:**
```python
DATABASE_URL=postgresql://postgres:password@/edutrack?host=/cloudsql/sms-capstone:us-central1:edutrack-db
```

**Key Parts:**
- **`/cloudsql/...`**: Unix socket path (not network)
- **`sms-capstone:us-central1:edutrack-db`**: Connection name
- **Format**: `PROJECT_ID:REGION:INSTANCE_NAME`

### **How Cloud Run Connects:**
1. **Unix Socket**: Cloud Run uses Unix socket (not TCP)
2. **Security**: No public IP, only accessible from Cloud Run
3. **Performance**: Faster than network connection
4. **Configuration**: `--add-cloudsql-instances` flag

### **Database Setup:**
```bash
# Create instance
gcloud sql instances create edutrack-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create edutrack --instance=edutrack-db

# Create user
gcloud sql users create postgres --instance=edutrack-db --password=password
```

### **Schema Application:**
```bash
# Connect and apply schema
gcloud sql connect edutrack-db --user=postgres
# Then: \c edutrack
# Paste: database/schema.sql
```

---

## 3. 🔨 CLOUD BUILD

### **What is Cloud Build?**
Cloud Build is a **CI/CD platform** that builds, tests, and deploys applications automatically when code is pushed to repository.

### **Why Cloud Build?**
- ✅ **Automated**: Deploys on git push
- ✅ **Docker Support**: Native Docker building
- ✅ **Parallel Steps**: Run multiple steps simultaneously
- ✅ **Integration**: Works with GitHub, GitLab, etc.
- ✅ **Free Tier**: 120 build-minutes/day free

### **Our CI/CD Pipeline (`cloudbuild.yaml`):**

#### **Step 1: Build Backend Image**
```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'build-backend'
  args:
    - 'build'
    - '-t'
    - 'gcr.io/$PROJECT_ID/edutrack-backend:$SHORT_SHA'
    - './backend'
```
- **What**: Builds Docker image from `./backend/Dockerfile`
- **Tag**: Uses git commit SHA for versioning
- **Why**: Versioned images, can rollback

#### **Step 2: Push Backend Image**
```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'push-backend'
  args: ['push', 'gcr.io/$PROJECT_ID/edutrack-backend:$SHORT_SHA']
  waitFor: ['build-backend']
```
- **What**: Pushes image to Container Registry
- **Wait**: Waits for build to complete
- **Why**: Image must exist before deployment

#### **Step 3: Deploy Backend**
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'deploy-backend'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'edutrack-backend'
    - '--image'
    - 'gcr.io/$PROJECT_ID/edutrack-backend:$SHORT_SHA'
    - '--region'
    - 'us-central1'
    - '--add-cloudsql-instances'
    - '${_CLOUDSQL_CONNECTION_NAME}'
    - '--set-env-vars'
    - 'DATABASE_URL=...,SECRET_KEY=...'
```
- **What**: Deploys container to Cloud Run
- **Config**: Sets environment variables, connects to Cloud SQL
- **Why**: Automated deployment with configuration

#### **Step 4: Get Backend URL**
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'get-backend-url'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      BACKEND_URL=$(gcloud run services describe edutrack-backend --region=us-central1 --format='value(status.url)')
      echo "$BACKEND_URL" > /workspace/backend_url.txt
```
- **What**: Gets deployed backend URL
- **Save**: Saves to file for next step
- **Why**: Frontend needs backend URL at build time

#### **Step 5: Build Frontend**
```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'build-frontend'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      BACKEND_URL=$(cat /workspace/backend_url.txt)
      docker build \
        --build-arg REACT_APP_API_URL="$BACKEND_URL" \
        -t gcr.io/$PROJECT_ID/edutrack-frontend:$SHORT_SHA \
        ./frontend
```
- **What**: Builds frontend with backend URL
- **Build Arg**: Passes URL to React build
- **Why**: React env vars are baked into build

#### **Step 6: Push Frontend Image**
```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'push-frontend'
  args: ['push', 'gcr.io/$PROJECT_ID/edutrack-frontend:$SHORT_SHA']
```
- **What**: Pushes frontend image
- **Why**: Image must exist before deployment

#### **Step 7: Deploy Frontend**
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'deploy-frontend'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'edutrack-frontend'
    - '--image'
    - 'gcr.io/$PROJECT_ID/edutrack-frontend:$SHORT_SHA'
    - '--region'
    - 'us-central1'
```
- **What**: Deploys frontend to Cloud Run
- **Why**: Makes frontend accessible

#### **Step 8: Update Backend CORS**
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'update-cors'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      FRONTEND_URL=$(gcloud run services describe edutrack-frontend --region=us-central1 --format='value(status.url)')
      gcloud run services update edutrack-backend \
        --region=us-central1 \
        --update-env-vars="FRONTEND_URL=$FRONTEND_URL"
```
- **What**: Updates backend CORS with frontend URL
- **Why**: Backend needs frontend URL for CORS headers

### **Pipeline Flow:**
```
Git Push → Cloud Build Triggered
    ↓
Build Backend Image → Push to GCR → Deploy to Cloud Run
    ↓
Get Backend URL → Build Frontend (with URL) → Push to GCR → Deploy to Cloud Run
    ↓
Update Backend CORS with Frontend URL
    ↓
Deployment Complete ✅
```

### **Substitutions:**
```yaml
substitutions:
  _CLOUDSQL_CONNECTION_NAME: 'sms-capstone:us-central1:edutrack-db'
  _SECRET_KEY: '5j3Q-xtu9Kpih84L0uQ4jBfpRBuJt6PVtWDURCo8iCs'
```
- **Purpose**: Reusable variables across builds
- **Usage**: `${_VARIABLE_NAME}` in steps
- **Note**: Secret key should be in Secret Manager (security best practice)

---

## 4. 📦 CONTAINER REGISTRY (GCR)

### **What is Container Registry?**
Google Container Registry (GCR) stores Docker images. It's integrated with Cloud Build and Cloud Run.

### **Image Naming:**
```
gcr.io/PROJECT_ID/SERVICE_NAME:TAG
```
- **`gcr.io`**: Registry hostname
- **`PROJECT_ID`**: GCP project ID (sms-capstone)
- **`SERVICE_NAME`**: Image name (edutrack-backend, edutrack-frontend)
- **`TAG`**: Version tag (`$SHORT_SHA` = git commit SHA)

### **Our Images:**
1. **Backend**: `gcr.io/sms-capstone/edutrack-backend:SHORT_SHA`
2. **Frontend**: `gcr.io/sms-capstone/edutrack-frontend:SHORT_SHA`

### **Why Use GCR?**
- ✅ **Integrated**: Works seamlessly with Cloud Build/Run
- ✅ **Private**: Images are private by default
- ✅ **Versioning**: Tag images with versions
- ✅ **Fast**: Optimized for GCP services

---

## 5. 🛠️ CLOUD SDK (gcloud CLI)

### **What is gcloud?**
Command-line tool for interacting with GCP services.

### **Commands We Use:**

#### **Database:**
```bash
# Create SQL instance
gcloud sql instances create edutrack-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create edutrack --instance=edutrack-db

# Connect to database
gcloud sql connect edutrack-db --user=postgres
```

#### **Cloud Run:**
```bash
# Deploy service
gcloud run deploy edutrack-backend \
  --image gcr.io/PROJECT_ID/edutrack-backend:TAG \
  --region us-central1 \
  --allow-unauthenticated

# Get service URL
gcloud run services describe edutrack-backend \
  --region=us-central1 \
  --format='value(status.url)'

# Update service
gcloud run services update edutrack-backend \
  --region=us-central1 \
  --update-env-vars="KEY=value"
```

#### **Cloud Build:**
```bash
# Create build trigger
gcloud builds triggers create github \
  --name=edutrack-deploy \
  --repo-name=EduTrack \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## 6. 📊 CLOUD LOGGING

### **What is Cloud Logging?**
Centralized logging service for GCP resources.

### **Configuration:**
```yaml
options:
  logging: CLOUD_LOGGING_ONLY
```
- **Purpose**: Send all logs to Cloud Logging
- **Access**: View in Cloud Console
- **Benefits**: Centralized, searchable, retained

### **What We Log:**
- Build logs (Cloud Build)
- Application logs (Cloud Run)
- Error logs (FastAPI, React)
- Access logs (HTTP requests)

---

## 🏗️ DEPLOYMENT ARCHITECTURE

### **Complete Flow:**

```
┌─────────────────┐
│   GitHub Repo   │
│   (Code Push)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cloud Build    │
│  (CI/CD)        │
└────────┬────────┘
         │
         ├──► Build Backend Docker Image
         │         │
         │         ▼
         │    Push to GCR
         │         │
         │         ▼
         │    Deploy to Cloud Run (Backend)
         │         │
         │         ▼
         │    Get Backend URL
         │         │
         ├──► Build Frontend (with Backend URL)
         │         │
         │         ▼
         │    Push to GCR
         │         │
         │         ▼
         │    Deploy to Cloud Run (Frontend)
         │         │
         │         ▼
         └──► Update Backend CORS
                  │
                  ▼
         ┌─────────────────┐
         │  Cloud Run      │
         │  (Backend)      │◄──┐
         └────────┬────────┘   │
                  │             │
                  │ Unix Socket │
                  │             │
         ┌────────▼────────┐   │
         │   Cloud SQL     │   │
         │  (PostgreSQL)   │   │
         └─────────────────┘   │
                               │
         ┌─────────────────┐   │
         │  Cloud Run      │   │
         │  (Frontend)     │───┘
         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │     Users       │
         │  (HTTPS Access) │
         └─────────────────┘
```

---

## 🔐 SECURITY CONFIGURATION

### **1. Database Security:**
- ✅ **No Public IP**: Only accessible via Unix socket
- ✅ **Encrypted**: Data encrypted at rest and in transit
- ✅ **Access Control**: Only Cloud Run can connect
- ✅ **Strong Passwords**: Secure database passwords

### **2. Application Security:**
- ✅ **HTTPS**: Automatic SSL certificates
- ✅ **CORS**: Configured for specific frontend URL
- ✅ **JWT Tokens**: Secure authentication
- ✅ **Environment Variables**: Secrets in env vars (should use Secret Manager)

### **3. Container Security:**
- ✅ **Private Images**: GCR images are private
- ✅ **Versioned**: Tagged with commit SHA
- ✅ **Minimal Base Images**: Python slim, Node alpine

---

## 💰 COST OPTIMIZATION

### **Cloud Run:**
- **Pay-per-use**: Only pay for actual requests
- **Scales to zero**: No cost when idle
- **512MB memory**: Cost-effective tier

### **Cloud SQL:**
- **db-f1-micro**: Smallest tier (suitable for dev/test)
- **No idle cost**: Pay only for instance uptime
- **Backups**: Included in price

### **Cloud Build:**
- **Free tier**: 120 build-minutes/day
- **Efficient builds**: Multi-stage Dockerfiles
- **Cached layers**: Faster subsequent builds

---

## 🚀 DEPLOYMENT STEPS (Manual)

### **1. Setup Database:**
```bash
# Create Cloud SQL instance
gcloud sql instances create edutrack-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_PASSWORD

# Create database
gcloud sql databases create edutrack --instance=edutrack-db

# Create user
gcloud sql users create postgres \
  --instance=edutrack-db \
  --password=YOUR_PASSWORD
```

### **2. Apply Schema:**
```bash
# Connect to database
gcloud sql connect edutrack-db --user=postgres

# In PostgreSQL:
\c edutrack
# Paste contents of database/schema.sql
```

### **3. Deploy Backend:**
```bash
# Build and push image
docker build -t gcr.io/PROJECT_ID/edutrack-backend:latest ./backend
docker push gcr.io/PROJECT_ID/edutrack-backend:latest

# Deploy to Cloud Run
gcloud run deploy edutrack-backend \
  --image gcr.io/PROJECT_ID/edutrack-backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=PROJECT_ID:us-central1:edutrack-db \
  --set-env-vars="DATABASE_URL=postgresql://postgres:PASSWORD@/edutrack?host=/cloudsql/PROJECT_ID:us-central1:edutrack-db,SECRET_KEY=YOUR_SECRET_KEY" \
  --memory 512Mi \
  --port 8000
```

### **4. Deploy Frontend:**
```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe edutrack-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Build with backend URL
docker build \
  --build-arg REACT_APP_API_URL=$BACKEND_URL \
  -t gcr.io/PROJECT_ID/edutrack-frontend:latest \
  ./frontend

# Push image
docker push gcr.io/PROJECT_ID/edutrack-frontend:latest

# Deploy to Cloud Run
gcloud run deploy edutrack-frontend \
  --image gcr.io/PROJECT_ID/edutrack-frontend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --port 80
```

### **5. Update CORS:**
```bash
# Get frontend URL
FRONTEND_URL=$(gcloud run services describe edutrack-frontend \
  --region=us-central1 \
  --format='value(status.url)')

# Update backend CORS
gcloud run services update edutrack-backend \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=$FRONTEND_URL"
```

---

## 🔄 AUTOMATED DEPLOYMENT (CI/CD)

### **Setup Cloud Build Trigger:**

1. **Connect GitHub:**
   - Go to Cloud Console → Cloud Build → Triggers
   - Click "Connect Repository"
   - Select GitHub and authorize
   - Select repository: `EduTrack`

2. **Create Trigger:**
   ```bash
   gcloud builds triggers create github \
     --name=edutrack-deploy \
     --repo-name=EduTrack \
     --repo-owner=YOUR_USERNAME \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

3. **Push to main branch:**
   - Any push to `main` branch triggers build
   - Cloud Build runs `cloudbuild.yaml`
   - Automatic deployment to Cloud Run

---

## 📝 KEY CONCEPTS

### **1. Serverless:**
- No server management
- Auto-scaling
- Pay-per-use
- Cloud Run is serverless

### **2. Containerization:**
- Docker images for consistency
- Works same in dev and prod
- Easy to deploy and scale

### **3. CI/CD:**
- Continuous Integration: Build on every push
- Continuous Deployment: Deploy automatically
- Cloud Build handles both

### **4. Environment Variables:**
- Configuration without code changes
- Different values for different environments
- Secure secrets (use Secret Manager for production)

### **5. Unix Socket Connection:**
- Cloud Run → Cloud SQL via Unix socket
- More secure than TCP
- Faster than network connection
- No public IP needed

### **6. Build Arguments:**
- Pass values to Docker build
- Frontend needs backend URL at build time
- React env vars are baked into build

### **7. Versioning:**
- Images tagged with git commit SHA
- Can rollback to any version
- Traceability (which code = which image)

---

## 🎯 PRESENTATION TALKING POINTS

### **Architecture:**
"I deployed EduTrack on Google Cloud Platform using a serverless architecture. The backend and frontend run on Cloud Run, which automatically scales based on traffic and only charges for actual usage."

### **Database:**
"I use Cloud SQL for PostgreSQL, which is fully managed with automatic backups. Cloud Run connects to Cloud SQL via Unix socket, which is more secure than network connections."

### **CI/CD:**
"I set up automated deployment using Cloud Build. When I push code to GitHub, Cloud Build automatically builds Docker images, pushes them to Container Registry, and deploys to Cloud Run. The entire process takes about 5-7 minutes."

### **Challenges Solved:**
"One challenge was that the frontend needs the backend URL at build time, but the backend URL is only known after deployment. I solved this by having Cloud Build get the backend URL after deployment, save it to a file, and pass it as a build argument to the frontend build."

### **CORS Configuration:**
"Another challenge was CORS configuration. The backend needs the frontend URL for CORS headers, but the frontend URL is only known after deployment. I solved this by having Cloud Build update the backend's environment variables with the frontend URL after both services are deployed."

---

## 📚 GCP SERVICES SUMMARY

| Service | Purpose | How We Use It |
|---------|---------|--------------|
| **Cloud Run** | Serverless containers | Hosts backend and frontend |
| **Cloud SQL** | Managed database | PostgreSQL for data storage |
| **Cloud Build** | CI/CD pipeline | Automated builds and deployments |
| **Container Registry** | Docker image storage | Stores built images |
| **Cloud SDK** | CLI tool | Command-line operations |
| **Cloud Logging** | Log management | Centralized logging |

---

## ✅ CHECKLIST FOR DEPLOYMENT

- [ ] GCP project created
- [ ] Billing enabled
- [ ] APIs enabled (Cloud Run, Cloud SQL, Cloud Build)
- [ ] Cloud SQL instance created
- [ ] Database schema applied
- [ ] Docker images built
- [ ] Images pushed to GCR
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Cloud Run
- [ ] CORS configured
- [ ] Cloud Build trigger created
- [ ] Test deployment works
- [ ] Monitor logs and errors

---

## 🎓 WHAT YOU LEARNED

1. **Serverless Architecture**: Deploy without managing servers
2. **Container Orchestration**: Docker + Cloud Run
3. **CI/CD Pipelines**: Automated deployment workflows
4. **Managed Databases**: Cloud SQL for PostgreSQL
5. **Environment Configuration**: Variables and secrets
6. **Cloud Networking**: Unix sockets, CORS, HTTPS
7. **Cost Optimization**: Pay-per-use, scale to zero
8. **Production Deployment**: Real-world cloud deployment

---

This comprehensive guide covers all GCP services and configurations used in EduTrack. Use this for understanding, troubleshooting, and presenting your cloud deployment strategy.
