# Backend Service Files Explanation - Part 4 (Configuration & Schema Files)

## File 10: `schemas.py`

### Purpose
**Pydantic models for request/response validation** - Defines data structures for API requests and responses. Ensures type safety, automatic validation, and OpenAPI documentation generation.

### Core Logic (Line-by-Line)

```python
from pydantic import BaseModel, EmailStr
```
- **BaseModel**: Base class for all Pydantic models
- **EmailStr**: Validates email format automatically
- **Why?** Type safety and automatic validation

```python
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    user_name: str
    password: str
    role: Optional[str] = "student"
```
- **Request model**: Validates signup request body
- **EmailStr**: Ensures valid email format
- **Optional role**: Defaults to "student" if not provided
- **Why?** Validates input before processing

```python
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    user_name: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```
- **Response model**: Defines API response structure
- **from_attributes**: Allows conversion from SQLAlchemy models
- **Why?** Type-safe responses, automatic serialization

```python
class ProgressRequest(BaseModel):
    video_id: int
    start_time: Optional[str] = None  # "HH:MM:SS"
    end_time: Optional[str] = None    # "HH:MM:SS"
    watchtime_seconds: Optional[int] = None
```
- **Request model**: Validates progress tracking data
- **Optional fields**: All fields optional (flexible tracking)
- **String times**: Frontend sends time as string, backend parses
- **Why?** Flexible progress tracking (start-only or full tracking)

```python
class ProgressResponse(BaseModel):
    watch_time: Optional[str] = None  # "00:05:30"
```
- **String format**: INTERVAL converted to "HH:MM:SS" string
- **Why?** JSON doesn't support INTERVAL type, string is readable

### Request → Service → DB Flow

#### Request Validation Flow

```
Frontend Request
    ↓
POST /auth/signup
Body: { name, email, user_name, password }
    ↓
FastAPI receives request
    ↓
schemas.py → UserSignup model
    ↓
1. Automatic validation
   - Checks required fields present
   - Validates email format (EmailStr)
   - Validates types (str, int, etc.)
   ↓
2. If invalid:
   → Returns 422 Validation Error
   → Shows which fields are invalid
   ↓
3. If valid:
   → Passes validated data to route handler
   → auth_service.py receives UserSignup object
```

#### Response Serialization Flow

```
Service returns SQLAlchemy model
    ↓
auth_service.py → return new_user  # User SQLAlchemy object
    ↓
FastAPI response_model=UserResponse
    ↓
schemas.py → UserResponse model
    ↓
1. Convert SQLAlchemy to Pydantic
   from_attributes=True allows conversion
   ↓
2. Serialize to JSON
   - datetime → ISO string
   - All fields converted to JSON types
   ↓
3. Return JSON response
   { "id": 1, "name": "John", ... }
```

**Why This Flow?**
- **Automatic validation**: Catches invalid data before processing
- **Type safety**: Ensures correct data types
- **Documentation**: Auto-generates OpenAPI/Swagger docs
- **Serialization**: Converts Python objects to JSON

### Why This Structure?

1. **Pydantic Models**:
   - **Problem**: Need to validate request/response data
   - **Solution**: Pydantic models with automatic validation
   - **Why?** Type safety, less boilerplate, automatic docs

2. **Separate Request/Response Models**:
   - **Request**: What client sends (e.g., UserSignup)
   - **Response**: What server returns (e.g., UserResponse)
   - **Why?** Different structures, response includes generated fields (id, created_at)

3. **from_attributes = True**:
   - **Problem**: SQLAlchemy models need conversion to Pydantic
   - **Solution**: `from_attributes=True` allows automatic conversion
   - **Why?** No manual mapping needed

4. **Optional Fields**:
   - **Flexibility**: Some fields optional (e.g., role, start_time)
   - **Why?** Different use cases need different fields

5. **String Types for Times**:
   - **Problem**: JSON doesn't support Time/Interval types
   - **Solution**: Convert to string format ("HH:MM:SS")
   - **Why?** JSON-compatible, human-readable

### Data Structures Used

1. **Request Models** (Input):
   - `UserSignup`: Registration data
   - `UserLogin`: Login credentials
   - `ProgressRequest`: Progress tracking data
   - `YouTubePlaylistRequest`: Playlist URL

2. **Response Models** (Output):
   - `UserResponse`: User data
   - `Token`: Login response (token + user)
   - `CourseResponse`: Course data
   - `ProgressResponse`: Progress data
   - `AttendanceResponse`: Attendance data

3. **Field Types**:
   - `str`: String
   - `int`: Integer
   - `EmailStr`: Validated email
   - `Optional[T]`: Optional field
   - `datetime`: Date/time
   - `list[T]`: List of items

### How It Connects to Other Files

**Used By:**
- **All service files**: Use schemas for request/response validation
- **FastAPI**: Auto-generates OpenAPI docs from schemas
- **Type hints**: IDE autocomplete and type checking

**Example Usage:**
```python
# auth_service.py
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    # user_data is validated UserSignup object
    # FastAPI already validated it before calling this function
```

**Flow:**
```
Frontend → JSON request
    ↓
FastAPI → Validates with Pydantic schema
    ↓
Service → Receives validated Python object
    ↓
Service → Returns SQLAlchemy model
    ↓
FastAPI → Converts to Pydantic response model
    ↓
Frontend → Receives JSON response
```

### What Panel Can Ask

**Validation:**
1. "What happens if client sends invalid data?"
   - **Pydantic**: Automatically validates before route handler
   - **Response**: Returns 422 with detailed error messages
   - **Why?** Catches errors early, better error messages

2. "Why use Pydantic instead of manual validation?"
   - **Automatic**: Validates types, formats, required fields
   - **Less code**: No manual if/else validation
   - **Why?** Faster development, fewer bugs

3. "What if email format is invalid?"
   - **EmailStr**: Pydantic validates email format
   - **Error**: Returns 422 "Invalid email format"
   - **Why?** Catches invalid emails before database

**Type Safety:**
4. "Why separate request and response models?"
   - **Different structures**: Request might not have id, created_at
   - **Response**: Includes generated fields
   - **Why?** Clear separation, type safety

5. "What is from_attributes = True?"
   - **SQLAlchemy conversion**: Allows converting SQLAlchemy models to Pydantic
   - **Why?** No manual mapping needed, automatic conversion

**API Design:**
6. "Why use Optional fields in ProgressRequest?"
   - **Flexibility**: Different tracking modes (start-only, full tracking)
   - **Why?** Supports different use cases, progressive enhancement

7. "Why convert INTERVAL to string in response?"
   - **JSON limitation**: JSON doesn't support INTERVAL type
   - **String format**: "HH:MM:SS" is readable and standard
   - **Why?** JSON-compatible, human-readable

---

## File 11: `database/schema.sql`

### Purpose
**Database schema definition** - SQL script that creates all tables, foreign keys, indexes, and constraints. Source of truth for database structure.

### Core Logic (Line-by-Line)

```sql
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_name VARCHAR(100) NOT NULL UNIQUE,
    ...
);
```
- **SERIAL**: Auto-incrementing integer (PostgreSQL)
- **PRIMARY KEY**: Unique identifier
- **UNIQUE**: Ensures no duplicates
- **Why?** Data integrity, fast lookups

```sql
CREATE TABLE progress (
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    date DATE NOT NULL,
    watch_time INTERVAL,
    CONSTRAINT fk_progress_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) 
        ON DELETE CASCADE
);
```
- **FOREIGN KEY**: Links to parent table
- **ON DELETE CASCADE**: Deletes child records when parent deleted
- **Why?** Referential integrity, automatic cleanup

```sql
CREATE TABLE course_status (
    ...
    CONSTRAINT unique_user_course 
        UNIQUE (user_id, course_ID)
);
```
- **UNIQUE constraint**: Prevents duplicate enrollments
- **Composite key**: Combination of user_id and course_ID
- **Why?** One enrollment per user per course

```sql
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_date ON progress(date);
```
- **Indexes**: Speed up queries on these columns
- **Why?** Fast lookups, better query performance

### Request → Service → DB Flow

```
Service Query
    ↓
db.query(Progress).filter(Progress.user_id == user_id).all()
    ↓
SQLAlchemy ORM generates SQL
    ↓
SELECT * FROM progress WHERE user_id = ?
    ↓
PostgreSQL Query Planner
    ↓
1. Checks if index exists
   → Uses idx_progress_user_id index
   ↓
2. Executes query using index
   → Fast lookup (O(log n) instead of O(n))
   ↓
3. Returns results
    ↓
Service receives data
```

**Why This Flow?**
- **Indexes**: Make queries fast
- **Foreign keys**: Ensure data integrity
- **Constraints**: Prevent invalid data

### Why This Structure?

1. **Foreign Key Constraints**:
   - **Problem**: Need to ensure referential integrity
   - **Solution**: Foreign keys with CASCADE delete
   - **Why?** Prevents orphaned records, automatic cleanup

2. **ON DELETE CASCADE**:
   - **Problem**: What happens when user is deleted?
   - **Solution**: CASCADE deletes related records
   - **Why?** Automatic cleanup, no orphaned data

3. **Indexes on Foreign Keys**:
   - **Problem**: Joins and filters on foreign keys are slow
   - **Solution**: Index foreign key columns
   - **Why?** Fast joins, fast filters

4. **Composite UNIQUE Constraint**:
   - **Problem**: Prevent duplicate enrollments
   - **Solution**: UNIQUE (user_id, course_ID)
   - **Why?** Database-level enforcement, prevents duplicates

5. **INTERVAL Type**:
   - **Problem**: Need to store time duration
   - **Solution**: PostgreSQL INTERVAL type
   - **Why?** Native type, handles hours/minutes/seconds

6. **Separate Date and Time**:
   - **date**: DATE type (date only)
   - **start_time/end_time**: TIME type (time only)
   - **Why?** Matches business logic (daily attendance, time tracking)

### Database Schema Structure

```
user (1) ──┐
           │
           ├──→ (many) course_status
           │
           ├──→ (many) progress
           │
           └──→ (many) attendance

course (1) ──┐
            │
            ├──→ (many) course_video
            │
            └──→ (many) course_status

course_video (1) ──→ (many) progress
```

**Relationships:**
- **User → CourseStatus**: Many-to-many (via junction table)
- **User → Progress**: One-to-many
- **User → Attendance**: One-to-many
- **Course → CourseVideo**: One-to-many
- **CourseVideo → Progress**: One-to-many

### What Panel Can Ask

**Database Design:**
1. "Why use junction table (course_status) instead of direct relationship?"
   - **Many-to-many**: User can enroll in multiple courses
   - **Junction table**: Stores enrollment status
   - **Why?** Normalized design, supports additional fields (enrolled, created_at)

2. "Why ON DELETE CASCADE?"
   - **Automatic cleanup**: Deletes related records when parent deleted
   - **Why?** Prevents orphaned data, ensures data integrity
   - **Trade-off**: Can't recover deleted user's progress

3. "Why separate Progress and Attendance tables?"
   - **Progress**: Per-video, detailed tracking
   - **Attendance**: Per-day, aggregated summary
   - **Why?** Different granularity, attendance calculated from progress

**Indexing:**
4. "Why index foreign keys?"
   - **Performance**: Joins and filters are faster
   - **Why?** Without index, full table scan (slow)

5. "What about composite indexes?"
   - **Current**: Single-column indexes only
   - **Could add**: Index on (user_id, date) for progress queries
   - **Why current?** Simple, works for current queries

**Data Types:**
6. "Why use INTERVAL instead of storing seconds as INTEGER?"
   - **INTERVAL**: Native PostgreSQL type, handles hours/minutes/seconds
   - **INTEGER**: Simpler, but loses time structure
   - **Why INTERVAL?** Database-level type safety, easier calculations

7. "Why separate DATE and TIME instead of TIMESTAMP?"
   - **DATE**: Tracks which day (for daily attendance)
   - **TIME**: Tracks time of day (HH:MM:SS)
   - **Why?** Matches business logic, easier queries

**Constraints:**
8. "What if UNIQUE constraint is violated?"
   - **Database error**: Returns error to application
   - **Application**: Catches error, returns 400 to client
   - **Why?** Database-level enforcement, prevents duplicates

9. "Why quote 'user' table name?"
   - **SQL keyword**: "user" is reserved keyword in SQL
   - **Quotes**: Tells database it's a table name, not keyword
   - **Why?** Avoids SQL syntax errors

---

## File 12: `cloudbuild.yaml`

### Purpose
**CI/CD pipeline configuration** - Google Cloud Build configuration that automates building Docker images and deploying to Cloud Run. Handles both backend and frontend deployment.

### Core Logic (Line-by-Line)

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-backend'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/edutrack-backend:$SHORT_SHA'
      - './backend'
```
- **Docker build**: Builds backend Docker image
- **$SHORT_SHA**: Git commit SHA (unique tag)
- **Why?** Versioned images, can rollback to specific commit

```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'deploy-backend'
  args:
    - 'run'
    - 'deploy'
    - 'edutrack-backend'
    - '--image'
    - 'gcr.io/$PROJECT_ID/edutrack-backend:$SHORT_SHA'
    - '--add-cloudsql-instances'
    - '${_CLOUDSQL_CONNECTION_NAME}'
```
- **Cloud Run deploy**: Deploys container to Cloud Run
- **Cloud SQL connection**: Connects to PostgreSQL database
- **Why?** Serverless deployment, managed database

```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'build-frontend'
  args:
    - '--build-arg'
    - 'REACT_APP_API_URL="$$BACKEND_URL"'
```
- **Build argument**: Passes backend URL to frontend build
- **Why?** Frontend needs to know backend URL at build time

```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'update-cors'
  args:
    - 'run'
    - 'services'
    - 'update'
    - 'edutrack-backend'
    - '--update-env-vars="FRONTEND_URL=$$FRONTEND_URL"'
```
- **CORS update**: Updates backend CORS with frontend URL
- **Why?** Backend needs frontend URL for CORS headers

### Deployment Flow

```
Git Push to Repository
    ↓
Cloud Build Triggered
    ↓
Step 1: Build Backend Docker Image
    - docker build ./backend
    - Tag: gcr.io/PROJECT_ID/edutrack-backend:SHORT_SHA
    ↓
Step 2: Push Backend Image
    - docker push to Google Container Registry
    ↓
Step 3: Deploy Backend to Cloud Run
    - gcloud run deploy edutrack-backend
    - Connect to Cloud SQL
    - Set environment variables
    ↓
Step 4: Get Backend URL
    - gcloud run services describe
    - Save URL to file
    ↓
Step 5: Build Frontend Docker Image
    - docker build with REACT_APP_API_URL=backend_url
    - Tag: gcr.io/PROJECT_ID/edutrack-frontend:SHORT_SHA
    ↓
Step 6: Push Frontend Image
    - docker push to Google Container Registry
    ↓
Step 7: Deploy Frontend to Cloud Run
    - gcloud run deploy edutrack-frontend
    ↓
Step 8: Update Backend CORS
    - Update FRONTEND_URL environment variable
    - Backend now allows frontend origin
    ↓
Deployment Complete
```

**Why This Flow?**
- **Sequential**: Backend must deploy first (frontend needs URL)
- **Dynamic URL**: Frontend gets backend URL at build time
- **CORS update**: Backend CORS updated after frontend deploys

### Why This Structure?

1. **Docker Images**:
   - **Problem**: Need consistent deployment environment
   - **Solution**: Docker containers with all dependencies
   - **Why?** Works same in dev and production

2. **Versioned Images**:
   - **$SHORT_SHA**: Git commit SHA as image tag
   - **Why?** Can rollback to specific version, traceability

3. **Build Arguments**:
   - **REACT_APP_API_URL**: Passed to frontend build
   - **Why?** Frontend needs backend URL at build time (React env vars)

4. **Cloud SQL Connection**:
   - **Socket connection**: Uses Unix socket for database
   - **Why?** Secure, no network exposure, managed by Google

5. **Environment Variables**:
   - **DATABASE_URL**: Cloud SQL connection string
   - **SECRET_KEY**: JWT secret key
   - **Why?** Configuration without hardcoding

6. **CORS Update Step**:
   - **Problem**: Frontend URL unknown until deployment
   - **Solution**: Update backend CORS after frontend deploys
   - **Why?** Backend needs frontend URL for CORS headers

### Configuration Details

**Substitutions:**
```yaml
substitutions:
  _CLOUDSQL_CONNECTION_NAME: 'sms-capstone:us-central1:edutrack-db'
  _SECRET_KEY: '5j3Q-xtu9Kpih84L0uQ4jBfpRBuJt6PVtWDURCo8iCs'
```
- **Cloud SQL**: Database instance connection name
- **Secret Key**: JWT signing key (should be in secret manager)
- **Why?** Reusable across builds, centralized config

**Resource Limits:**
```yaml
--memory: '512Mi'
--port: '8000' (backend), '80' (frontend)
```
- **Memory**: 512MB per service
- **Why?** Cost-effective, sufficient for current load

### What Panel Can Ask

**CI/CD:**
1. "Why use Cloud Build instead of GitHub Actions?"
   - **Cloud Build**: Native Google Cloud integration
   - **GitHub Actions**: More flexible, works with any cloud
   - **Why Cloud Build?** Simpler for GCP deployment, integrated

2. "What if build fails halfway?"
   - **Rollback**: Previous version still running
   - **Why?** Zero-downtime deployment, old version serves traffic

3. "Why build frontend after backend?"
   - **Dependency**: Frontend needs backend URL
   - **Why?** Frontend API calls need correct backend URL

**Security:**
4. "Why is SECRET_KEY in cloudbuild.yaml?"
   - **Problem**: Should be in secret manager
   - **Current**: Hardcoded (not secure)
   - **Better**: Use Google Secret Manager
   - **Why current?** Simpler for MVP, but should be changed

5. "How is database password secured?"
   - **Connection string**: Includes password
   - **Better**: Use Cloud SQL IAM authentication
   - **Why current?** Simpler, but password in connection string

**Deployment:**
6. "Why use Cloud Run instead of VMs?"
   - **Serverless**: Auto-scales, pay per request
   - **VMs**: Always running, fixed cost
   - **Why Cloud Run?** Cost-effective, auto-scaling

7. "What about database migrations?"
   - **Current**: `Base.metadata.create_all()` on startup
   - **Better**: Alembic migrations in CI/CD pipeline
   - **Why current?** Simpler, but not production-ready

**Build Process:**
8. "Why bake backend URL into frontend image?"
   - **React env vars**: Set at build time, not runtime
   - **Why?** React apps are static, env vars compiled in
   - **Trade-off**: Need to rebuild if backend URL changes

9. "What if frontend URL changes?"
   - **CORS update**: Backend CORS updated after frontend deploys
   - **Why?** Backend needs to know frontend URL for CORS

---

**Summary of Files 10-12:**

1. **schemas.py**: Pydantic models for request/response validation
2. **database/schema.sql**: Database schema with tables, foreign keys, indexes
3. **cloudbuild.yaml**: CI/CD pipeline for automated deployment

**Complete Project Architecture:**

```
┌─────────────────────────────────────────┐
│         Git Repository                  │
│         (Source Code)                   │
└──────┬──────────────────────────────────┘
       │ Git Push
       ↓
┌─────────────────────────────────────────┐
│      Google Cloud Build                  │
│      (cloudbuild.yaml)                   │
│  - Build Docker Images                  │
│  - Deploy to Cloud Run                  │
│  - Update CORS                          │
└──────┬──────────────────────────────────┘
       │
       ├─→ Cloud Run (Backend)
       │   - FastAPI Application
       │   - Connected to Cloud SQL
       │
       └─→ Cloud Run (Frontend)
           - React Application
           - Served by Nginx
```

**Key Patterns:**
- **Pydantic Validation**: Type-safe API contracts
- **Database Schema**: Source of truth for data structure
- **CI/CD Pipeline**: Automated deployment
- **Docker Containers**: Consistent environments
- **Cloud Run**: Serverless deployment

**Why This Structure?**
- **Validation**: Pydantic ensures data correctness
- **Database**: SQL schema defines data structure
- **Deployment**: Automated, repeatable, versioned
- **Scalability**: Cloud Run auto-scales
- **Maintainability**: Clear separation of concerns
