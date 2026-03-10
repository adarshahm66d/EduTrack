# Backend Service Files Explanation - Part 3 (Final 3 Files)

## File 7: `main.py`

### Purpose
**API Gateway** - Central entry point that:
- Creates FastAPI application instance
- Configures CORS middleware
- Registers all service routers
- Creates database tables on startup
- Provides health check and API documentation endpoints

### Core Logic (Line-by-Line)

```python
from models import User, Course, CourseVideo, CourseStatus, Progress, Attendance
```
- **Import models**: Ensures SQLAlchemy discovers all models
- **Why?** Needed for `Base.metadata.create_all()` to work

```python
Base.metadata.create_all(bind=engine)
```
- **Auto-create tables**: Creates all tables on application startup
- **Why?** Convenient for development, ensures tables exist
- **Production**: Usually use migrations (Alembic) instead

```python
app = FastAPI(title="EduTrack API Gateway", version="1.0.0")
```
- **FastAPI instance**: Main application object
- **Title/Version**: Used in API documentation (Swagger UI)
- **Why?** Auto-generates OpenAPI docs at `/docs`

```python
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[...],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- **CORS configuration**: Allows cross-origin requests
- **Multiple origins**: Local dev + production frontend
- **allow_credentials**: Allows cookies/auth headers
- **Why?** Frontend on different port/domain needs CORS

```python
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(video_router)
app.include_router(progress_router)
app.include_router(attendance_router)
```
- **Router registration**: Mounts all service routers
- **Why?** Modular routing, each service has its own router

### Request → Service → DB Flow

```
HTTP Request from Frontend
    ↓
FastAPI Application (main.py)
    ↓
1. CORS Middleware
   - Checks origin
   - Adds CORS headers if allowed
   ↓
2. Route Matching
   - Matches URL to router
   - Example: /auth/login → auth_router
   ↓
3. Service Router
   - auth_service.py → login()
   ↓
4. Dependency Injection
   - get_db() → Database session
   - get_current_user() → User object (if needed)
   ↓
5. Service Logic
   - Business logic execution
   - Database queries
   ↓
6. Response
   - Returns JSON response
   - CORS headers added
   ↓
Frontend receives response
```

**Why This Flow?**
- **Middleware first**: CORS handled before routing
- **Router dispatch**: Routes to correct service
- **Dependencies**: Injected before route handler
- **Clean separation**: Gateway → Service → Database

### Why This Structure?

1. **API Gateway Pattern**:
   - **Single entry point**: All requests go through main.py
   - **Service routing**: Dispatches to appropriate service
   - **Why?** Centralized configuration, easy to add middleware

2. **CORS Middleware**:
   - **Problem**: Browser blocks cross-origin requests
   - **Solution**: CORS middleware adds required headers
   - **Why?** Frontend on different port/domain needs this

3. **Router Registration**:
   - **Modular**: Each service has its own router
   - **Prefix**: Each router has prefix (/auth, /courses, etc.)
   - **Why?** Clean organization, easy to split later

4. **Auto Table Creation**:
   - **Development**: Convenient, no migrations needed
   - **Production**: Should use Alembic migrations
   - **Why current?** Simpler for MVP, works for small apps

5. **Health Check Endpoints**:
   - **Gateway health**: `/health`
   - **Service health**: Each service has `/health`
   - **Why?** Monitoring, load balancer checks

### Endpoints Provided

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and service list |
| GET | `/health` | Gateway health check |
| GET | `/docs` | Swagger UI documentation (auto-generated) |
| GET | `/openapi.json` | OpenAPI schema (auto-generated) |

**All other endpoints** come from registered routers:
- `/auth/*` → auth_service.py
- `/courses/*` → course_service.py
- `/videos/*` → video_service.py
- `/progress/*` → attendance_service.py
- `/attendance/*` → attendance_service.py

### What Panel Can Ask

**Architecture:**
1. "Why use API Gateway pattern instead of direct service access?"
   - **Centralized**: Single entry point, easier to manage
   - **Middleware**: CORS, logging, rate limiting in one place
   - **Why?** Better organization, easier to scale

2. "What if you want to split into separate microservices?"
   - **Current**: Monolith with service separation
   - **Future**: Each router can become separate service
   - **Why current?** Simpler for MVP, can split later

3. "Why auto-create tables instead of migrations?"
   - **Current**: `Base.metadata.create_all()` on startup
   - **Better**: Alembic migrations for production
   - **Why current?** Simpler for development, works for small apps

**CORS:**
4. "Why allow all methods and headers?"
   - **Current**: `allow_methods=["*"]`, `allow_headers=["*"]`
   - **Security**: Could restrict to needed methods/headers
   - **Why current?** Simpler, works for all use cases

5. "What if frontend URL changes?"
   - **Environment variable**: `FRONTEND_URL` can be set
   - **Hardcoded**: Production URL also in code
   - **Better**: All URLs from environment variables

**Routing:**
6. "Why include both progress_router and attendance_router?"
   - **Backward compatibility**: Old frontend might use `/attendance/*`
   - **New paths**: New code uses `/progress/attendance/*`
   - **Why?** Don't break existing code

---

## File 8: `dependencies.py`

### Purpose
**Dependency injection functions** for FastAPI. Provides reusable authentication and database dependencies used across all service files.

### Core Logic (Line-by-Line)

```python
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)
```
- **HTTPBearer**: FastAPI security scheme for Bearer tokens
- **security**: Required token (raises error if missing)
- **security_optional**: Optional token (returns None if missing)
- **Why?** Different endpoints need different auth requirements

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
```
- **Dependency injection**: FastAPI automatically calls this
- **credentials**: Extracted from `Authorization: Bearer <token>` header
- **db**: Database session from `get_db()`
- **Why?** Reusable across all protected endpoints

```python
token = credentials.credentials
payload = verify_token(token)

if not payload:
    raise HTTPException(status_code=401, ...)
```
- **Extract token**: Gets token string from credentials
- **Verify token**: Decodes and validates JWT
- **Error handling**: Returns 401 if invalid
- **Why?** Centralized authentication logic

```python
user_name = payload.get("sub")
user = db.query(User).filter(User.user_name == user_name).first()
if user is None:
    raise HTTPException(status_code=401, ...)
return user
```
- **Extract username**: Gets from JWT payload
- **Query user**: Fetches user from database
- **Why query?** Gets fresh user data (role might have changed)
- **Return user**: Injected into route handler

```python
def get_current_user_id(...) -> int:
    user_id = payload.get("user_id")
    return user_id
```
- **Lightweight**: Only returns user_id, no database query
- **Why?** Some endpoints only need user_id, faster

```python
def get_current_user_optional(...) -> Optional[User]:
    if credentials is None:
        return None
    try:
        # ... verify and return user
    except Exception:
        return None
```
- **Optional auth**: Returns None if no token or invalid token
- **Why?** Public endpoints that can track authenticated users

### Request → Service → DB Flow

```
Route Handler
    ↓
Depends(get_current_user)
    ↓
dependencies.py → get_current_user()
    ↓
1. Extract token from header
   credentials.credentials → token string
   ↓
2. Verify JWT token
   verify_token(token) → payload or None
   ↓
3. Extract username from payload
   payload.get("sub") → user_name
   ↓
4. Query user from database
   db.query(User).filter(User.user_name == user_name).first()
   ↓
5. Return User object
   ↓
Route handler receives User object
   Can use: current_user.id, current_user.role, etc.
```

**Why This Flow?**
- **Reusable**: Same logic for all protected endpoints
- **Automatic**: FastAPI calls dependency before route handler
- **Type-safe**: Returns User object, not just ID

### Why This Structure?

1. **Dependency Injection Pattern**:
   - **Problem**: Every endpoint needs auth logic
   - **Solution**: Centralized dependency function
   - **Why?** DRY principle, consistent authentication

2. **Three Variants**:
   - **get_current_user**: Required auth, returns User
   - **get_current_user_id**: Required auth, returns int (faster)
   - **get_current_user_optional**: Optional auth, returns User or None
   - **Why?** Different endpoints have different needs

3. **Database Query in Dependency**:
   - **Problem**: Token might be valid but user deleted
   - **Solution**: Query user from database
   - **Why?** Ensures user still exists, gets fresh data

4. **Error Handling**:
   - **HTTPException**: Returns proper 401 status
   - **WWW-Authenticate header**: Tells client to authenticate
   - **Why?** RESTful error responses

5. **Optional Auth Pattern**:
   - **Public endpoints**: Can work without auth
   - **Tracking**: Can identify authenticated users
   - **Why?** Better analytics, but doesn't block access

### Data Flow Diagram

```
┌─────────────────────────────────┐
│   FastAPI Route Handler          │
│   def my_endpoint(               │
│       current_user: User =        │
│           Depends(get_current_user)│
│   ):                             │
└──────┬───────────────────────────┘
       │ FastAPI calls dependency
       ↓
┌─────────────────────────────────┐
│   dependencies.py                │
│   get_current_user()             │
└──────┬───────────────────────────┘
       │
       ├─→ Extract token from header
       │   HTTPBearer extracts from Authorization header
       │
       ├─→ auth.py
       │   verify_token(token)
       │   → Decodes JWT, validates signature
       │
       ├─→ database.py
       │   get_db() → Returns session
       │
       ├─→ models.py
       │   db.query(User).filter(...)
       │
       ↓
┌─────────────────────────────────┐
│   Returns User object            │
│   Injected into route handler   │
└─────────────────────────────────┘
```

### What Panel Can Ask

**Dependency Injection:**
1. "Why use dependency injection instead of calling auth function directly?"
   - **Automatic**: FastAPI calls dependency before route handler
   - **Reusable**: Same dependency used across all endpoints
   - **Why?** Less code, consistent behavior

2. "What if dependency raises exception?"
   - **FastAPI handles**: Returns error response, route handler not called
   - **Why?** Prevents unauthorized access, clean error handling

3. "Why three different dependency functions?"
   - **Performance**: `get_current_user_id` faster (no DB query)
   - **Flexibility**: `get_current_user_optional` for public endpoints
   - **Why?** Optimize for different use cases

**Security:**
4. "Why query user from database instead of trusting JWT payload?"
   - **Fresh data**: User role might have changed
   - **User might be deleted**: Token valid but user doesn't exist
   - **Why?** Security best practice, ensures data accuracy

5. "What if token is valid but user is deleted?"
   - **Current**: Returns 401 "User not found"
   - **Why?** Prevents access with stale tokens

6. "Why use HTTPBearer instead of manual header parsing?"
   - **Automatic**: FastAPI extracts token from header
   - **Standard**: Follows OAuth2 Bearer token standard
   - **Why?** Less code, standard implementation

**Performance:**
7. "Why query user on every request? Couldn't you cache?"
   - **Current**: Database query on every request
   - **Caching**: Could cache user data, but needs invalidation
   - **Why current?** Simpler, ensures fresh data, acceptable for small apps

8. "Why have get_current_user_id if it doesn't query database?"
   - **Faster**: No database query needed
   - **Use case**: Endpoints that only need user_id
   - **Why?** Performance optimization

---

## File 9: `auth.py`

### Purpose
**Authentication utilities** - Provides password hashing and JWT token creation/verification functions. Low-level authentication operations.

### Core Logic (Line-by-Line)

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```
- **CryptContext**: Password hashing context from passlib
- **bcrypt**: Hashing algorithm (slow by design)
- **Why bcrypt?** Industry standard, resistant to brute force

```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours
```
- **SECRET_KEY**: Used to sign JWT tokens
- **Environment variable**: Should be set in production
- **HS256**: HMAC-SHA256 algorithm for JWT signing
- **24 hours**: Token expiration time
- **Why?** Security best practices

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```
- **Password verification**: Compares plain password to hash
- **Timing-safe**: bcrypt prevents timing attacks
- **Why?** Secure password checking

```python
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```
- **Password hashing**: Creates bcrypt hash
- **One-way**: Cannot reverse hash to get password
- **Why?** Never store plain passwords

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```
- **JWT creation**: Encodes payload into JWT token
- **Expiration**: Adds `exp` claim to token
- **Why?** Tokens expire automatically, no server-side storage needed

```python
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```
- **JWT verification**: Decodes and validates token
- **Exception handling**: Returns None if invalid/expired
- **Why?** Graceful error handling, caller checks for None

### Request → Service → DB Flow

#### Password Hashing (Signup)

```
auth_service.py → signup()
    ↓
auth.py → get_password_hash(password)
    ↓
1. bcrypt hashes password
   pwd_context.hash(password)
   → "$2b$12$..." (bcrypt hash string)
   ↓
2. Return hash
   ↓
auth_service.py → Stores hash in database
   User(password=hashed_password)
```

#### Password Verification (Login)

```
auth_service.py → login()
    ↓
auth.py → verify_password(plain_password, user.password)
    ↓
1. bcrypt compares passwords
   pwd_context.verify(plain, hash)
   → True/False
   ↓
2. Return boolean
   ↓
auth_service.py → If True, create token
```

#### JWT Token Creation (Login)

```
auth_service.py → login()
    ↓
auth.py → create_access_token({
    "sub": user.user_name,
    "user_id": user.id
})
    ↓
1. Add expiration
   expire = datetime.utcnow() + 24 hours
   data["exp"] = expire
   ↓
2. Encode JWT
   jwt.encode(data, SECRET_KEY, algorithm="HS256")
   → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ↓
3. Return token string
   ↓
auth_service.py → Returns token to frontend
```

#### JWT Token Verification (Every Request)

```
dependencies.py → get_current_user()
    ↓
auth.py → verify_token(token)
    ↓
1. Decode JWT
   jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
   ↓
2. Validate signature
   - Checks signature matches SECRET_KEY
   - Checks expiration (exp claim)
   ↓
3. Return payload or None
   { "sub": "username", "user_id": 123, "exp": 1234567890 }
   ↓
dependencies.py → Extracts user_name from payload
```

### Why This Structure?

1. **Separate Utility File**:
   - **Problem**: Auth logic needed in multiple places
   - **Solution**: Centralized utility functions
   - **Why?** DRY principle, easier to test

2. **bcrypt for Password Hashing**:
   - **Problem**: Need secure password storage
   - **Solution**: bcrypt (slow by design)
   - **Why?** Resistant to brute force, industry standard

3. **JWT for Authentication**:
   - **Problem**: Need stateless authentication
   - **Solution**: JWT tokens (self-contained)
   - **Why?** Scalable, works across multiple servers

4. **Environment Variable for SECRET_KEY**:
   - **Security**: Don't hardcode secret key
   - **Flexibility**: Different keys for different environments
   - **Why?** Security best practice

5. **24-Hour Token Expiration**:
   - **Balance**: Long enough for good UX, short enough for security
   - **Why?** Users stay logged in for a day, but tokens expire

6. **Exception Handling in verify_token**:
   - **Returns None**: Instead of raising exception
   - **Why?** Caller can handle gracefully, check for None

### Data Structures Used

1. **JWT Payload Structure**:
   ```python
   {
       "sub": "username",      # Subject (username)
       "user_id": 123,         # User ID
       "exp": 1234567890       # Expiration timestamp
   }
   ```

2. **Bcrypt Hash Format**:
   ```
   $2b$12$...salt...hashedpassword...
   ```
   - `$2b$`: bcrypt version
   - `12`: Cost factor (2^12 rounds)
   - Salt + hash: Combined in one string

3. **JWT Token Structure**:
   ```
   header.payload.signature
   ```
   - **Header**: Algorithm, type
   - **Payload**: User data, expiration
   - **Signature**: HMAC-SHA256 of header+payload

### How It Connects to Other Files

**Imports:**
- **passlib**: Password hashing library
- **jose**: JWT library (Python-JOSE)
- **os**: Environment variables

**Used By:**
- **auth_service.py**: `get_password_hash()`, `verify_password()`, `create_access_token()`
- **dependencies.py**: `verify_token()`

**Flow:**
```
auth_service.py → Uses auth.py functions
dependencies.py → Uses auth.py verify_token()
Both use same SECRET_KEY and ALGORITHM
```

### What Panel Can Ask

**Password Security:**
1. "Why use bcrypt instead of SHA-256?"
   - **bcrypt**: Slow by design (resistant to brute force)
   - **SHA-256**: Fast (vulnerable to brute force)
   - **Why bcrypt?** Even with powerful hardware, cracking is slow

2. "What is the cost factor (12) in bcrypt?"
   - **Cost factor**: 2^12 = 4096 rounds
   - **Higher cost**: More secure but slower
   - **Why 12?** Balance between security and performance

3. "What if SECRET_KEY is leaked?"
   - **Problem**: Attacker can create valid tokens
   - **Solution**: Rotate SECRET_KEY, invalidate all tokens
   - **Mitigation**: Keep SECRET_KEY secret, use environment variables

**JWT Tokens:**
4. "Why use JWT instead of session cookies?"
   - **JWT**: Stateless, works across servers
   - **Sessions**: Stateful, requires shared storage
   - **Why JWT?** Better for microservices, scalable

5. "What if token is stolen?"
   - **Problem**: Token valid until expiration (24 hours)
   - **Solution**: Short expiration, refresh tokens, token blacklist
   - **Current**: No revocation (could add blacklist)

6. "Why include user_id in token payload?"
   - **Performance**: Can get user_id without database query
   - **Use case**: `get_current_user_id()` uses it
   - **Why?** Faster for endpoints that only need ID

**Security:**
7. "Why use HS256 instead of RS256?"
   - **HS256**: Symmetric (same key for sign/verify)
   - **RS256**: Asymmetric (public/private key pair)
   - **Why HS256?** Simpler, works for single server
   - **RS256**: Better for distributed systems

8. "What about token refresh?"
   - **Current**: No refresh tokens, user must re-login after 24 hours
   - **Better**: Add refresh tokens for longer sessions
   - **Why current?** Simpler, works for MVP

**Error Handling:**
9. "Why return None from verify_token instead of raising exception?"
   - **Flexibility**: Caller can handle error differently
   - **Why?** Some callers might want to return None, others raise 401

10. "What if token is expired?"
    - **jwt.decode()**: Raises JWTError if expired
    - **verify_token()**: Catches exception, returns None
    - **Why?** Graceful handling, caller checks for None

---

**Summary of Files 7-9:**

1. **main.py**: API Gateway with CORS, router registration, table creation
2. **dependencies.py**: Dependency injection for authentication and database
3. **auth.py**: Password hashing and JWT token utilities

**Complete Backend Architecture Flow:**

```
HTTP Request
    ↓
main.py (API Gateway)
    ├─→ CORS Middleware
    ├─→ Route Matching
    └─→ Service Router
         ↓
    Service File (auth_service.py, etc.)
         ├─→ dependencies.py
         │   ├─→ get_current_user()
         │   │   ├─→ auth.py → verify_token()
         │   │   └─→ database.py → get_db()
         │   └─→ models.py → User query
         │
         ├─→ auth.py (if needed)
         │   ├─→ get_password_hash()
         │   ├─→ verify_password()
         │   └─→ create_access_token()
         │
         └─→ database.py
             └─→ get_db() → Session
                 ↓
             models.py
                 ↓
         PostgreSQL Database
```

**Key Patterns:**
- **API Gateway**: Single entry point
- **Dependency Injection**: Reusable authentication
- **Utility Functions**: Centralized auth operations
- **JWT Tokens**: Stateless authentication
- **Password Hashing**: bcrypt for security

**Why This Structure?**
- **Modular**: Each file has single responsibility
- **Reusable**: Dependencies used across all services
- **Secure**: Industry-standard authentication
- **Scalable**: Stateless JWT works across servers
- **Maintainable**: Clear separation of concerns
