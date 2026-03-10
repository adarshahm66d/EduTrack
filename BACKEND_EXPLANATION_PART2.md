# Backend Service Files Explanation - Part 2 (Final 3 Files)

## File 4: `attendance_service.py`

### Purpose
**Progress tracking and attendance management microservice** that handles:
- Video watch time tracking (progress records)
- Automatic attendance calculation based on watch time
- Daily attendance records with status (present/absent/in progress)
- Attendance queries by user, date, and current user

### Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/progress` | Track video watchtime | Yes | Student |
| GET | `/progress/video/{video_id}` | Get video progress | Yes | None |
| GET | `/progress/attendance/me` | Get my attendance | Yes | None |
| GET | `/progress/attendance/user/{user_id}` | Get user attendance | Yes | Admin |
| GET | `/progress/attendance/date/{date}` | Get attendance by date | Yes | Admin |
| GET | `/progress/attendance/today` | Get today's attendance | Yes | None |
| POST | `/progress/attendance/update-status` | Update attendance status | Yes | Admin |
| GET | `/progress/health` | Health check | No | None |
| GET | `/attendance/*` | Same as above (backward compatibility) | Yes | Varies |

**Note**: Attendance endpoints are available at both `/progress/attendance/*` and `/attendance/*` for backward compatibility.

### Request → Service → DB Flow

#### 1. POST `/progress` - Track Video Watchtime

This is the **most complex endpoint** - it handles progress tracking with automatic attendance calculation.

```
Frontend Request
    ↓
POST /progress
Headers: Authorization: Bearer <token>
Body: {
    video_id: 123,
    start_time: "14:30:00" (optional),
    end_time: "14:35:00" (optional),
    watchtime_seconds: 300 (optional)
}
    ↓
dependencies.py → get_current_user_id()
    ↓
attendance_service.py → track_progress()
    ↓
1. Verify video exists
   db.query(CourseVideo).filter(CourseVideo.id == video_id).first()
   ↓
2. Get today's date
   today = date.today()
   ↓
3. Helper: ensure_attendance()
   - Check if attendance record exists for today
   - If not, create: Attendance(user_id, date, total_time=0, status="in progress")
   - db.commit()
   ↓
4. Parse time strings (if provided)
   start_time_obj = datetime.strptime(start_time, "%H:%M:%S").time()
   end_time_obj = datetime.strptime(end_time, "%H:%M:%S").time()
   ↓
5. Calculate watch_time from watchtime_seconds
   watch_time_delta = timedelta(seconds=watchtime_seconds)
   ↓
6. Check if progress record exists for today
   existing_progress = db.query(Progress)
      .filter(user_id, video_id, date == today)
      .first()
   ↓
7a. If EXISTS (update existing):
    - Update start_time (if provided and not set)
    - Update end_time (if provided)
    - Accumulate watch_time: existing.watch_time += watch_time_delta
    - db.commit()
   ↓
7b. If NOT EXISTS (create new):
    - Create: Progress(user_id, video_id, date, start_time, end_time, watch_time)
    - db.add() → db.commit()
   ↓
8. Update attendance total_time
   - Query: SUM(Progress.watch_time) WHERE user_id = ? AND date = today
   - Update: attendance.total_time = total_watch_time
   ↓
9. Check attendance status
   - If total_seconds >= MINIMUM_ATTENDANCE_SECONDS (30 seconds for dev, 3 hours for prod):
     → attendance.status = "present"
   - db.commit()
   ↓
10. Format response
    - Convert watch_time INTERVAL to "HH:MM:SS" string
    - Return ProgressResponse
```

**Database Operations:**
- **SELECT**: Verify video exists (1 query)
- **SELECT**: Check existing progress (1 query)
- **SELECT**: Check existing attendance (1 query)
- **UPDATE or INSERT**: Progress record (1 query)
- **SELECT**: SUM watch_time for attendance (1 query)
- **UPDATE**: Attendance total_time and status (1 query)
- **Total**: 6-7 database queries

**Why This Flow?**
- **Automatic attendance**: Calculates attendance from progress
- **Accumulation**: Multiple play sessions accumulate watch time
- **Status update**: Auto-updates to "present" when threshold met
- **Transaction safety**: All updates in one transaction

#### 2. GET `/progress/video/{video_id}` - Get Video Progress

```
Frontend Request
    ↓
GET /progress/video/{video_id}
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user_id()
    ↓
attendance_service.py → get_video_progress()
    ↓
1. Query all progress records for video
   db.query(Progress)
      .filter(user_id == user_id, video_id == video_id)
      .order_by(Progress.date.desc())
      .all()
   ↓
2. Format each record
   - Convert watch_time INTERVAL to "HH:MM:SS" string
   - Convert date to ISO string
   - Convert start_time/end_time to "HH:MM:SS" strings
   ↓
3. Return list of ProgressResponse
   [{ id, user_id, video_id, date, start_time, end_time, watch_time }, ...]
```

**Database Operations:**
- **SELECT**: Get all progress records for video (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Multiple records**: One record per day per video
- **Ordered by date**: Most recent first
- **Format conversion**: INTERVAL to string for JSON response

#### 3. GET `/progress/attendance/date/{date}` - Get Attendance by Date

```
Frontend Request
    ↓
GET /progress/attendance/date/2024-01-15
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user()
    ↓
attendance_service.py → get_attendance_by_date()
    ↓
1. Check user is admin
   if current_user.role != 'admin': raise 403
   ↓
2. Query attendance for date
   db.query(Attendance)
      .filter(Attendance.date == attendance_date)
      .order_by(Attendance.user_id)
      .all()
   ↓
3. Format each record
   - Convert total_time INTERVAL to "HH:MM:SS" string
   - Convert date to ISO string
   ↓
4. Return list of AttendanceResponse
   [{ id, user_id, date, total_time, status }, ...]
```

**Database Operations:**
- **SELECT**: Get all attendance for date (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Admin only**: Only admins can view attendance by date
- **All users**: Returns attendance for all users on that date
- **Used by**: StudentList.js to show attendance table

### Why This Structure?

1. **Automatic Attendance Calculation**:
   - **Problem**: Need to track daily attendance based on watch time
   - **Solution**: Auto-calculates on every progress update
   - **Why?** Real-time updates, no separate attendance tracking needed

2. **Progress Accumulation**:
   - **Problem**: Multiple play sessions create multiple records
   - **Solution**: Accumulates watch_time across sessions
   - **Why?** Shows total time watched, not just one session

3. **Two-Mode Progress Saving**:
   - **start_only**: When video starts (sends start_time)
   - **pause_with_watchtime**: When video pauses (sends end_time + watchtime_seconds)
   - **Why?** Frontend calculates watch time, backend validates

4. **Attendance Status Logic**:
   - **"in progress"**: Default when attendance created
   - **"present"**: When total_time >= threshold (3 hours)
   - **"absent"**: Can be set manually (not auto-set)
   - **Why?** Clear status tracking for admin dashboard

5. **Dual Router Pattern**:
   - **`/progress/attendance/*`**: New unified path
   - **`/attendance/*`**: Old path (backward compatibility)
   - **Why?** Don't break existing frontend code

6. **INTERVAL Type Handling**:
   - **PostgreSQL INTERVAL**: Stores time duration
   - **Conversion**: INTERVAL → timedelta → seconds → "HH:MM:SS" string
   - **Why?** Database stores INTERVAL, API returns string

### Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│CourseDetail │
└──────┬──────┘
       │
       │ POST /progress
       │ {
       │   video_id: 123,
       │   start_time: "14:30:00",
       │   end_time: "14:35:00",
       │   watchtime_seconds: 300
       │ }
       ↓
┌─────────────────────────────────┐
│   attendance_service.py          │
│   track_progress()               │
└──────┬──────────────────────────┘
       │
       ├─→ Verify video exists
       │   db.query(CourseVideo)
       │
       ├─→ Check/Create attendance
       │   ensure_attendance()
       │
       ├─→ Update/Create progress
       │   db.query(Progress) or db.add(Progress)
       │
       ├─→ Calculate total watch time
       │   SUM(Progress.watch_time)
       │
       ├─→ Update attendance
       │   attendance.total_time = sum
       │   attendance.status = "present" (if >= threshold)
       │
       ↓
┌─────────────────────────────────┐
│   PostgreSQL Database            │
│   1. SELECT * FROM course_video  │
│   2. SELECT * FROM progress      │
│   3. INSERT/UPDATE progress      │
│   4. SELECT SUM(watch_time)     │
│   5. UPDATE attendance          │
└─────────────────────────────────┘
```

### What Panel Can Ask

**Progress Tracking:**
1. "Why accumulate watch_time instead of storing each session separately?"
   - **Current**: Accumulates in one record per day
   - **Alternative**: Store each session separately
   - **Why current?** Simpler queries, faster aggregation
   - **Trade-off**: Lose session-level detail, but gain performance

2. "What if user watches same video multiple times in one day?"
   - **Current**: Updates same progress record, accumulates watch_time
   - **Result**: One record per video per day
   - **Why?** Simpler, shows total time watched

3. "Why calculate attendance on every progress update?"
   - **Current**: Updates attendance.total_time on every progress save
   - **Alternative**: Calculate on-demand or scheduled job
   - **Why current?** Real-time updates, always accurate
   - **Trade-off**: More database queries, but better UX

**Attendance Logic:**
4. "Why MINIMUM_ATTENDANCE_SECONDS = 30 for dev?"
   - **Dev**: 30 seconds (for testing)
   - **Prod**: 10800 seconds (3 hours)
   - **Why?** Faster testing, don't need to watch 3 hours

5. "What if user watches 2 hours, then stops?"
   - **Status**: Remains "in progress" (not "present")
   - **Why?** Didn't meet 3-hour threshold
   - **Can update**: Admin can manually update status

6. "Why create attendance record on first video play?"
   - **Current**: Creates attendance when start_time is sent
   - **Why?** Tracks that user started watching today
   - **Status**: "in progress" until threshold met

**Database:**
7. "Why use INTERVAL type instead of storing seconds?"
   - **INTERVAL**: PostgreSQL native type for time duration
   - **Benefits**: Handles hours/minutes/seconds, easy calculations
   - **Why?** Database-level type safety, easier queries

8. "What if SUM query returns NULL?"
   - **Current**: Checks `if total_watch_time is None: total_watch_time = timedelta(0)`
   - **Why?** SUM returns NULL if no records, need to handle

**Performance:**
9. "What if 1000 students update progress simultaneously?"
   - **Current**: Each request does SUM query
   - **Performance**: Might be slow with many concurrent updates
   - **Better**: Batch updates, or cache attendance calculations

10. "Why not use database triggers for attendance calculation?"
    - **Current**: Application-level calculation
    - **DB triggers**: Would auto-calculate on progress insert
    - **Why current?** More control, easier to debug

---

## File 5: `database.py`

### Purpose
**Database connection and session management** - Provides SQLAlchemy engine, session factory, and database session dependency for FastAPI.

### Core Logic (Line-by-Line)

```python
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/edutrack")
```
- **Environment variable**: `DATABASE_URL` for production (Cloud SQL)
- **Fallback**: Defaults to localhost for development
- **Why?** Different databases for dev vs production

```python
engine = create_engine(DATABASE_URL)
```
- **SQLAlchemy engine**: Connection pool manager
- **Why?** Manages database connections efficiently
- **Connection pooling**: Reuses connections, improves performance

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```
- **Session factory**: Creates database sessions
- **autocommit=False**: Manual commit control
- **autoflush=False**: Manual flush control
- **Why?** Full control over transactions

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
- **Generator function**: Yields database session
- **Dependency injection**: Used in FastAPI `Depends(get_db)`
- **try/finally**: Ensures session is always closed
- **Why?** Prevents connection leaks

### Request → Service → DB Flow

```
FastAPI Request
    ↓
Route handler with Depends(get_db)
    ↓
database.py → get_db()
    ↓
1. Create new session
   db = SessionLocal()
   ↓
2. Yield session to route handler
   yield db
   ↓
3. Route handler uses session
   db.query(User).filter(...)
   db.add(new_user)
   db.commit()
   ↓
4. Request completes
   ↓
5. Finally block executes
   db.close()
   ↓
6. Session returned to pool
```

**Why This Flow?**
- **One session per request**: Each request gets its own session
- **Automatic cleanup**: Session closed after request
- **Connection pooling**: Engine manages connection reuse

### Why This Structure?

1. **Dependency Injection Pattern**:
   - **Problem**: Need database session in every route
   - **Solution**: `Depends(get_db)` provides session automatically
   - **Why?** DRY principle, automatic cleanup

2. **Generator Function (yield)**:
   - **Problem**: Need to close session after request
   - **Solution**: `yield` allows cleanup in `finally` block
   - **Why?** FastAPI dependency system supports generators

3. **Connection Pooling**:
   - **Engine**: Manages connection pool
   - **Why?** Reuses connections, faster than creating new each time
   - **Default pool size**: 5 connections (SQLAlchemy default)

4. **Manual Commit Control**:
   - **autocommit=False**: Must call `db.commit()`
   - **Why?** Full control over transactions, can rollback on errors

5. **Environment Variable for URL**:
   - **Production**: Cloud SQL connection string
   - **Development**: Localhost connection
   - **Why?** Different databases for different environments

### Data Structures Used

1. **Engine**:
   - SQLAlchemy engine object
   - Manages connection pool
   - Bound to database URL

2. **SessionLocal**:
   - Session factory class
   - Creates new sessions
   - Bound to engine

3. **Session**:
   - SQLAlchemy session object
   - Used for queries and transactions
   - Returned by `get_db()`

### How It Connects to Other Files

**Used By:**
- **All service files**: `auth_service.py`, `course_service.py`, etc.
- **Dependencies**: `dependencies.py` uses `get_db()`
- **Models**: `models.py` uses `Base` (from database.py)

**Imports:**
- **SQLAlchemy**: `create_engine`, `sessionmaker`, `declarative_base`
- **os**: Environment variables

**Flow:**
```
main.py → Imports models → Models use Base → Base from database.py
Service files → Depends(get_db) → database.py → Returns session
Service files → Use session → Query models → Database
```

### What Panel Can Ask

**Connection Management:**
1. "Why use connection pooling?"
   - **Problem**: Creating new connection for each request is slow
   - **Solution**: Engine maintains pool of connections
   - **Why?** Reuses connections, much faster

2. "What happens if all connections in pool are busy?"
   - **Current**: Waits for available connection (default timeout)
   - **Better**: Increase pool size or add queue
   - **Why current?** Works for small-medium apps

3. "Why close session in finally block?"
   - **Problem**: Session must be closed to return connection to pool
   - **Solution**: `finally` ensures cleanup even if error occurs
   - **Why?** Prevents connection leaks

**Dependency Injection:**
4. "Why use generator function (yield) instead of return?"
   - **FastAPI pattern**: Supports generator dependencies
   - **Cleanup**: Code after `yield` runs after request
   - **Why?** Perfect for resource cleanup (sessions, files, etc.)

5. "What if get_db() is called multiple times in one request?"
   - **FastAPI caches**: Same dependency called once per request
   - **Result**: Same session object reused
   - **Why?** Efficient, ensures transaction consistency

**Configuration:**
6. "Why use environment variable for DATABASE_URL?"
   - **Security**: Don't hardcode credentials
   - **Flexibility**: Different URLs for dev/staging/prod
   - **Why?** Best practice, allows easy deployment

7. "What about connection string format?"
   - **PostgreSQL**: `postgresql://user:password@host:port/database`
   - **Cloud SQL**: Includes `/cloudsql/` path for socket connection
   - **Why?** Different connection methods for local vs cloud

---

## File 6: `models.py`

### Purpose
**SQLAlchemy ORM models** - Defines database table schemas as Python classes. Maps database tables to Python objects.

### Core Logic (Line-by-Line)

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Date, Time, Interval
from database import Base
```
- **SQLAlchemy types**: Column types map to database types
- **Base**: Declarative base for models
- **Why?** ORM pattern, database-agnostic code

```python
class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    user_name = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default='student')
```
- **Table name**: `"user"` (quoted because "user" is SQL keyword)
- **Primary key**: `id` with auto-increment
- **Indexes**: On `email` and `user_name` for fast lookups
- **Why?** Fast queries, data integrity

```python
class Progress(Base):
    __tablename__ = "progress"
    
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    watch_time = Column(Interval, nullable=True)
```
- **Date type**: Stores date only (no time)
- **Time type**: Stores time only (HH:MM:SS)
- **Interval type**: Stores time duration (PostgreSQL INTERVAL)
- **Why?** Matches database schema, proper type safety

```python
class Attendance(Base):
    __tablename__ = "attendance"
    
    total_time = Column(Interval, nullable=True)
    status = Column(String(50), nullable=True)
```
- **Interval**: Stores accumulated watch time
- **Status**: String for attendance status
- **Why?** Flexible status values, easy to query

### Request → Service → DB Flow

```
Service File (e.g., auth_service.py)
    ↓
db.query(User).filter(User.email == email).first()
    ↓
models.py → User model
    ↓
SQLAlchemy ORM translates to SQL
    ↓
SELECT * FROM "user" WHERE email = ?
    ↓
PostgreSQL executes query
    ↓
Returns row data
    ↓
SQLAlchemy maps to User object
    ↓
Service receives User object
```

**Why This Flow?**
- **ORM abstraction**: Write Python code, not SQL
- **Type safety**: Python types map to database types
- **Automatic mapping**: Rows → Objects automatically

### Why This Structure?

1. **ORM Pattern**:
   - **Problem**: Writing raw SQL is error-prone
   - **Solution**: SQLAlchemy ORM maps Python to SQL
   - **Why?** Type-safe, less SQL injection risk, easier to maintain

2. **Declarative Base**:
   - **Base class**: All models inherit from Base
   - **Why?** Provides table creation, relationship management
   - **Auto-discovery**: FastAPI can discover all models

3. **Column Types**:
   - **String(255)**: Limits length, prevents oversized data
   - **Integer**: Auto-increment primary keys
   - **Interval**: PostgreSQL-specific type for time duration
   - **Why?** Database type safety, proper constraints

4. **Indexes**:
   - **Primary key**: Always indexed
   - **Foreign keys**: Indexed for join performance
   - **Frequently queried**: email, user_name indexed
   - **Why?** Fast lookups, better query performance

5. **Table Naming**:
   - **`"user"`**: Quoted because "user" is SQL keyword
   - **snake_case**: Matches database convention
   - **Why?** Avoids SQL keyword conflicts

6. **Nullable vs Not Null**:
   - **nullable=False**: Required fields (email, password)
   - **nullable=True**: Optional fields (link, status)
   - **Why?** Database-level validation, prevents invalid data

### Data Structures Used

1. **Model Classes**:
   - `User`: User accounts
   - `Course`: Course information
   - `CourseVideo`: Video content
   - `CourseStatus`: Student enrollments
   - `Progress`: Video watch time tracking
   - `Attendance`: Daily attendance records

2. **Column Types**:
   - `Integer`: Numbers, primary keys
   - `String(n)`: Text with max length
   - `Text`: Unlimited text
   - `DateTime`: Timestamp
   - `Date`: Date only
   - `Time`: Time only
   - `Interval`: Time duration (PostgreSQL)
   - `Boolean`: True/False

3. **Column Options**:
   - `primary_key=True`: Unique identifier
   - `index=True`: Create database index
   - `unique=True`: Enforce uniqueness
   - `nullable=False`: Required field
   - `default='value'`: Default value

### How It Connects to Other Files

**Imports:**
- **database.py**: `Base` class for model inheritance
- **SQLAlchemy**: Column types and options

**Used By:**
- **All service files**: Query models, create instances
- **main.py**: `Base.metadata.create_all()` creates tables
- **schemas.py**: Pydantic models match SQLAlchemy models

**Table Creation:**
```
main.py → Base.metadata.create_all(bind=engine)
    ↓
SQLAlchemy reads all models
    ↓
Generates CREATE TABLE statements
    ↓
Executes on database
    ↓
Tables created
```

**Query Flow:**
```
Service file → db.query(User) → models.py → User class
    ↓
SQLAlchemy ORM → Generates SQL
    ↓
Database → Returns rows
    ↓
SQLAlchemy → Maps to User objects
    ↓
Service → Receives User objects
```

### What Panel Can Ask

**ORM Design:**
1. "Why use ORM instead of raw SQL?"
   - **ORM benefits**: Type-safe, less SQL injection risk, database-agnostic
   - **Raw SQL**: More control, but error-prone
   - **Why ORM?** Faster development, easier maintenance

2. "What about performance? Is ORM slower than raw SQL?"
   - **ORM overhead**: Slight overhead for object mapping
   - **For most apps**: Negligible difference
   - **Why acceptable?** Developer productivity > micro-optimizations

3. "Why use Interval type instead of storing seconds as Integer?"
   - **Interval**: PostgreSQL native type, handles hours/minutes/seconds
   - **Integer**: Simpler, but loses time structure
   - **Why Interval?** Database-level type safety, easier calculations

**Database Design:**
4. "Why separate Progress and Attendance tables?"
   - **Progress**: Per-video, per-day tracking (detailed)
   - **Attendance**: Per-user, per-day summary (aggregated)
   - **Why?** Normalized design, progress is source of truth

5. "Why use Date and Time separately instead of DateTime?"
   - **Date**: Tracks which day
   - **Time**: Tracks time of day (HH:MM:SS)
   - **Why?** Matches business logic (daily attendance, time tracking)

6. "What about foreign key constraints?"
   - **Current**: No explicit foreign keys in models
   - **Database**: Foreign keys defined in schema.sql
   - **Why?** SQLAlchemy can define them, but schema.sql is source of truth

**Indexing:**
7. "Why index email and user_name?"
   - **Frequent queries**: Login, signup validation
   - **Index benefit**: O(log n) lookup vs O(n) scan
   - **Why?** Much faster for large datasets

8. "What about composite indexes?"
   - **Current**: Single-column indexes only
   - **Could add**: Index on (user_id, date) for progress queries
   - **Why current?** Simple, works for current scale

**Type Safety:**
9. "What if database type doesn't match model type?"
   - **SQLAlchemy**: Handles type conversion
   - **Mismatch**: Might cause errors or data loss
   - **Why careful?** Ensure model types match database schema

10. "Why use String(255) instead of Text for some fields?"
    - **String(255)**: Limited length, indexed efficiently
    - **Text**: Unlimited, but harder to index
    - **Why?** Balance between flexibility and performance

---

**Summary of Files 4-6:**

1. **attendance_service.py**: Progress tracking with automatic attendance calculation
2. **database.py**: Database connection and session management
3. **models.py**: SQLAlchemy ORM models for database tables

**Complete Backend Architecture:**

```
┌─────────────────────────────────────────┐
│         FastAPI API Gateway              │
│              (main.py)                   │
│  - CORS Middleware                       │
│  - Route Dispatching                    │
└──────┬───────────────────────────────────┘
       │
       ├─→ auth_service.py (APIRouter)
       ├─→ course_service.py (APIRouter)
       ├─→ video_service.py (APIRouter)
       └─→ attendance_service.py (APIRouter)
              │
              ├─→ dependencies.py
              │   - get_current_user()
              │   - get_current_user_id()
              │   - get_db()
              │
              ├─→ database.py
              │   - get_db() → Session
              │   - Engine (connection pool)
              │
              ├─→ models.py
              │   - User, Course, Progress, etc.
              │   - SQLAlchemy ORM models
              │
              └─→ auth.py
                  - JWT token creation/verification
                  - Password hashing
```

**Key Architecture Patterns:**
- **Microservices**: Each service in separate file
- **Dependency Injection**: Reusable dependencies
- **ORM**: Database abstraction layer
- **Transaction Management**: Atomic operations
- **Error Handling**: HTTPException with proper status codes

**Why This Structure?**
- **Modular**: Easy to understand and maintain
- **Scalable**: Can split into separate services
- **Testable**: Dependencies can be mocked
- **RESTful**: Standard API design patterns
