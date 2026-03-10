# Backend Service Files Explanation - Part 1 (First 3 Files)

## File 1: `auth_service.py`

### Purpose
**Authentication microservice** that handles user registration, login, and user management. It provides:
- User registration with password hashing
- User authentication with JWT token generation
- User information retrieval
- Role-based access control

### Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/auth/signup` | Register new user | No | None |
| POST | `/auth/login` | Login user, get JWT token | No | None |
| GET | `/auth/users/me` | Get current user info | Yes | None |
| GET | `/auth/users/students` | Get all students | Yes | None |
| GET | `/auth/users` | Get all users | Yes | Admin |
| GET | `/auth/health` | Health check | No | None |

### Request → Service → DB Flow

#### 1. POST `/auth/signup` - User Registration

```
Frontend Request
    ↓
POST /auth/signup
Body: { name, email, user_name, password, role }
    ↓
auth_service.py → signup()
    ↓
1. Validate email uniqueness
   db.query(User).filter(User.email == email).first()
   ↓
2. Validate username uniqueness
   db.query(User).filter(User.user_name == user_name).first()
   ↓
3. Auto-detect role (if email contains "admin")
   detected_role = "admin" if "admin" in email.lower() else "student"
   ↓
4. Hash password
   get_password_hash(password) → bcrypt hash
   ↓
5. Create User object
   new_user = User(name, email, user_name, hashed_password, role)
   ↓
6. Save to database
   db.add(new_user)
   db.commit()
   db.refresh(new_user)
   ↓
7. Return UserResponse
   { id, name, email, user_name, role, created_at }
```

**Database Operations:**
- **SELECT**: Check email/username existence (2 queries)
- **INSERT**: Create new user record (1 query)
- **Total**: 3 database queries

**Why This Flow?**
- **Validation first**: Prevents duplicate accounts before hashing
- **Password hashing**: Never store plain passwords
- **Role detection**: Simplifies registration (no dropdown)
- **Auto-commit**: Ensures data persistence

#### 2. POST `/auth/login` - User Authentication

```
Frontend Request
    ↓
POST /auth/login
Body: { user_name, password }
    ↓
auth_service.py → login()
    ↓
1. Find user by username
   db.query(User).filter(User.user_name == user_name).first()
   ↓
2. Verify password
   verify_password(plain_password, user.password)
   → bcrypt.compare() → True/False
   ↓
3. Generate JWT token
   create_access_token({
       "sub": user.user_name,
       "user_id": user.id
   })
   → JWT.encode() → token string
   ↓
4. Return token + user data
   {
       access_token: "eyJ...",
       token_type: "bearer",
       user: { id, name, email, ... }
   }
```

**Database Operations:**
- **SELECT**: Find user by username (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Username lookup**: Fast indexed query
- **Password verification**: bcrypt handles timing attacks
- **JWT token**: Stateless authentication (no session storage)
- **User data in response**: Avoids extra API call

#### 3. GET `/auth/users/me` - Get Current User

```
Frontend Request
    ↓
GET /auth/users/me
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user()
    ↓
1. Extract token from header
   credentials.credentials → token string
   ↓
2. Verify JWT token
   verify_token(token) → payload { sub, user_id, exp }
   ↓
3. Query user from database
   db.query(User).filter(User.user_name == payload["sub"]).first()
   ↓
4. Return user or raise 401
   ↓
auth_service.py → get_current_user_endpoint()
    ↓
5. Return UserResponse
   { id, name, email, user_name, role, created_at }
```

**Database Operations:**
- **SELECT**: Find user by username (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Dependency injection**: `get_current_user` reusable across endpoints
- **Token verification**: Validates token before database query
- **User lookup**: Gets fresh user data (role might have changed)

#### 4. GET `/auth/users/students` - Get All Students

```
Frontend Request
    ↓
GET /auth/users/students
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user() (validates token)
    ↓
auth_service.py → get_all_students()
    ↓
1. Query all students
   db.query(User).filter(User.role == 'student').all()
   ↓
2. Return list of UserResponse
   [{ id, name, email, ... }, ...]
```

**Database Operations:**
- **SELECT**: Get all users with role='student' (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Filtered query**: Only returns students, not admins
- **No pagination**: Assumes small dataset (could add later)

### Why This Structure?

1. **Microservice Pattern**:
   - **Separation**: Auth logic isolated in one file
   - **Router prefix**: All routes under `/auth`
   - **Why?** Easy to split into separate service later

2. **Dependency Injection**:
   - **`get_db()`**: Provides database session
   - **`get_current_user()`**: Validates token, returns user
   - **Why?** Reusable, testable, clean code

3. **Password Hashing**:
   - **bcrypt**: Industry standard, slow by design
   - **Why?** Prevents rainbow table attacks, timing attacks

4. **JWT Tokens**:
   - **Stateless**: No server-side session storage
   - **Why?** Scalable, works across multiple servers
   - **Trade-off**: Can't revoke tokens (need refresh tokens)

5. **Role Detection in Signup**:
   - **Email-based**: Checks if "admin" in email
   - **Why?** Simplifies registration UI
   - **Security concern**: Anyone can register as admin (should be invite-only)

6. **Error Handling**:
   - **HTTPException**: FastAPI's exception handling
   - **Status codes**: 400 (bad request), 401 (unauthorized), 403 (forbidden)
   - **Why?** RESTful API standards

### Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ HTTP Request
       │ POST /auth/login
       │ { user_name, password }
       ↓
┌─────────────────────────────────┐
│   FastAPI API Gateway (main.py) │
│   - CORS Middleware              │
│   - Route to auth_service        │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   auth_service.py               │
│   - login() function             │
│   - Validate credentials        │
└──────┬──────────────────────────┘
       │
       ├─→ dependencies.py
       │   get_current_user() (if needed)
       │
       ├─→ auth.py
       │   verify_password()
       │   create_access_token()
       │
       ↓
┌─────────────────────────────────┐
│   database.py                    │
│   get_db() → SessionLocal()      │
│   Provides SQLAlchemy session    │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   models.py                     │
│   User model (SQLAlchemy ORM)   │
│   db.query(User).filter(...)    │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   PostgreSQL Database            │
│   SELECT * FROM "user"           │
│   WHERE user_name = ?            │
└─────────────────────────────────┘
```

### What Panel Can Ask

**Security:**
1. "Why hash passwords instead of encrypting?"
   - **Hashing**: One-way (can't decrypt)
   - **Encryption**: Two-way (can decrypt)
   - **Why hash?** Even if database is compromised, passwords are safe

2. "What if JWT token is stolen?"
   - **Problem**: Token valid until expiration (24 hours)
   - **Solution**: Short expiration, refresh tokens
   - **Current**: No refresh tokens (could add)

3. "Is email-based role detection secure?"
   - **No**: Anyone can register with "admin" in email
   - **Better**: Admin accounts created manually or via invite
   - **Why current?** MVP, simplifies demo

**Architecture:**
4. "Why use dependency injection for get_db()?"
   - **Automatic cleanup**: Closes session after request
   - **Testability**: Can mock database in tests
   - **Why?** FastAPI pattern, ensures proper resource management

5. "Why separate auth_service from main.py?"
   - **Modularity**: Each service in separate file
   - **Scalability**: Can split into separate microservice
   - **Why?** Clean code, easier maintenance

**Database:**
6. "Why query user on every request instead of caching?"
   - **Fresh data**: Role might change
   - **Simplicity**: No cache invalidation needed
   - **Trade-off**: More database queries, but ensures accuracy

7. "What about SQL injection?"
   - **SQLAlchemy ORM**: Parameterized queries
   - **Why safe?** ORM handles escaping automatically
   - **Example**: `db.query(User).filter(User.email == email)` is safe

---

## File 2: `course_service.py`

### Purpose
**Course management microservice** that handles course CRUD operations and student course registration. It provides:
- Course listing (public and authenticated)
- Course details retrieval
- Course deletion (admin only)
- Student course registration
- Registration status checking

### Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/courses` | Get all courses | Optional | None |
| GET | `/courses/{course_id}` | Get specific course | Yes | None |
| GET | `/courses/{course_id}/videos` | Get course videos | Optional | None |
| DELETE | `/courses/{course_id}` | Delete course | Yes | Admin |
| GET | `/courses/{course_id}/registration` | Check registration | Yes | None |
| POST | `/courses/{course_id}/register` | Register for course | Yes | Student |
| GET | `/courses/health` | Health check | No | None |

### Request → Service → DB Flow

#### 1. GET `/courses` - Get All Courses

```
Frontend Request
    ↓
GET /courses
Headers: Authorization: Bearer <token> (optional)
    ↓
course_service.py → get_courses()
    ↓
1. Optional authentication
   get_current_user_optional() → User or None
   ↓
2. Query all courses
   db.query(Course).all()
   ↓
3. Return list of CourseResponse
   [{ id, course_title, link }, ...]
```

**Database Operations:**
- **SELECT**: Get all courses (1 query)
- **Total**: 1 database query

**Why Optional Auth?**
- **Public endpoint**: Anyone can view courses
- **Tracks users**: Can log which users view courses (future feature)
- **Why?** Better analytics, but doesn't block access

#### 2. GET `/courses/{course_id}/videos` - Get Course Videos

```
Frontend Request
    ↓
GET /courses/{course_id}/videos
Headers: Authorization: Bearer <token> (optional)
    ↓
course_service.py → get_course_videos()
    ↓
1. Extract course_id from URL path
   Path parameter: course_id
   ↓
2. Query videos for course
   db.query(CourseVideo)
      .filter(CourseVideo.course_id == course_id)
      .all()
   ↓
3. Return list of CourseVideoResponse
   [{ id, course_id, title, video_link }, ...]
```

**Database Operations:**
- **SELECT**: Get videos where course_id = ? (1 query)
- **Total**: 1 database query

**Why This Flow?**
- **Simple query**: Filter by foreign key
- **No course validation**: Assumes course exists (could add check)

#### 3. POST `/courses/{course_id}/register` - Register for Course

```
Frontend Request
    ↓
POST /courses/{course_id}/register
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user_id()
    ↓
course_service.py → register_for_course()
    ↓
1. Verify course exists
   db.query(Course).filter(Course.id == course_id).first()
   ↓
2. Check existing registration
   db.query(CourseStatus)
      .filter(user_id == user_id, course_id == course_id)
      .first()
   ↓
3a. If exists and enrolled:
    → Raise 400 "Already registered"
   ↓
3b. If exists but not enrolled:
    → Update: existing_registration.enrolled = True
    → db.commit()
   ↓
3c. If doesn't exist:
    → Create: CourseStatus(user_id, course_id, enrolled=True)
    → db.add() → db.commit()
   ↓
4. Return CourseRegistrationResponse
   { course_id, enrolled: true, created_at }
```

**Database Operations:**
- **SELECT**: Check course exists (1 query)
- **SELECT**: Check existing registration (1 query)
- **UPDATE or INSERT**: Update or create registration (1 query)
- **Total**: 3 database queries

**Why This Flow?**
- **Idempotent**: Can call multiple times safely
- **Update existing**: Handles case where record exists but enrolled=false
- **Transaction safety**: All in one transaction

#### 4. DELETE `/courses/{course_id}` - Delete Course

```
Frontend Request
    ↓
DELETE /courses/{course_id}
Headers: Authorization: Bearer <token>
    ↓
dependencies.py → get_current_user()
    ↓
course_service.py → delete_course()
    ↓
1. Check user is admin
   if current_user.role != 'admin': raise 403
   ↓
2. Verify course exists
   db.query(Course).filter(Course.id == course_id).first()
   ↓
3. Delete all videos (CASCADE)
   db.query(CourseVideo)
      .filter(CourseVideo.course_id == course_id)
      .delete()
   ↓
4. Delete course
   db.delete(course)
   db.commit()
   ↓
5. Return success message
   { message: "Course deleted successfully", course_id }
```

**Database Operations:**
- **SELECT**: Check course exists (1 query)
- **DELETE**: Delete all videos (1 query)
- **DELETE**: Delete course (1 query)
- **Total**: 3 database queries

**Why This Flow?**
- **Manual cascade**: Deletes videos before course
- **Why not DB cascade?** More control, can add logging
- **Transaction**: All in one commit (atomic)

### Why This Structure?

1. **Optional Authentication**:
   - **`get_current_user_optional`**: Returns User or None
   - **Why?** Public endpoints (courses list) but can track users
   - **Trade-off**: More flexible than required auth

2. **Separate Registration Endpoint**:
   - **POST /register**: Explicit registration action
   - **Why?** Clear intent, can add validation later
   - **Alternative**: Auto-enroll on first video view

3. **Registration Status Check**:
   - **GET /registration**: Check if enrolled
   - **Why?** Frontend needs to show "Start Course" vs "Register"
   - **Efficient**: Single query, fast response

4. **Manual Cascade Delete**:
   - **Delete videos first**: Explicit control
   - **Why?** Can add logging, validation
   - **DB cascade**: Would be automatic, but less control

5. **Path Parameters**:
   - **`{course_id}`**: Extracted from URL
   - **Why?** RESTful design, clear resource identification

### Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  Dashboard  │
└──────┬──────┘
       │
       │ POST /courses/1/register
       │ Headers: Authorization: Bearer <token>
       ↓
┌─────────────────────────────────┐
│   FastAPI API Gateway           │
│   - Route to course_service     │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   course_service.py              │
│   register_for_course()          │
└──────┬──────────────────────────┘
       │
       ├─→ dependencies.py
       │   get_current_user_id()
       │   → Extracts user_id from JWT
       │
       ↓
┌─────────────────────────────────┐
│   Database Session               │
│   db.query(Course)               │
│   db.query(CourseStatus)         │
│   db.add(CourseStatus)           │
│   db.commit()                    │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   PostgreSQL Database            │
│   1. SELECT * FROM course        │
│      WHERE id = 1                │
│   2. SELECT * FROM course_status │
│      WHERE user_id = ? AND       │
│      course_id = 1               │
│   3. INSERT INTO course_status   │
│      (user_id, course_id,        │
│       enrolled) VALUES (...)     │
└─────────────────────────────────┘
```

### What Panel Can Ask

**Database Design:**
1. "Why separate CourseStatus table instead of adding enrolled column to User?"
   - **Many-to-many**: User can enroll in multiple courses
   - **CourseStatus**: Junction table (user_id, course_id, enrolled)
   - **Why?** Normalized design, supports multiple enrollments

2. "What if user registers twice?"
   - **Current**: Checks existing registration, updates if exists
   - **Idempotent**: Safe to call multiple times
   - **Why?** Prevents duplicate records

3. "Why not use database CASCADE for delete?"
   - **Current**: Manual delete of videos
   - **DB CASCADE**: Automatic, but less control
   - **Why manual?** Can add logging, validation, soft delete

**API Design:**
4. "Why separate GET /registration and POST /register?"
   - **GET**: Check status (read-only)
   - **POST**: Change status (write)
   - **Why?** RESTful design, clear separation of concerns

5. "Why optional auth for /courses endpoint?"
   - **Public access**: Anyone can view courses
   - **Tracks users**: Can log authenticated users
   - **Why?** Better UX (no login required to browse)

**Performance:**
6. "What if there are 10,000 courses? Would GET /courses be slow?"
   - **Current**: Returns all courses
   - **Better**: Add pagination, filtering
   - **Why current?** Assumes small dataset

7. "Why query course existence before registration?"
   - **Validation**: Ensures course exists
   - **Error handling**: Returns 404 if course not found
   - **Why?** Better error messages, prevents orphaned registrations

---

## File 3: `video_service.py`

### Purpose
**Video/YouTube playlist microservice** that handles YouTube playlist integration. It provides:
- Adding courses from YouTube playlists
- Extracting video metadata from playlists
- Handling YouTube API rate limiting and errors

### Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/videos/youtube-playlist` | Add course from playlist | Yes | Admin |
| GET | `/videos/health` | Health check | No | None |

**Note**: Course videos are retrieved via `/courses/{course_id}/videos` in course_service.py

### Request → Service → DB Flow

#### POST `/videos/youtube-playlist` - Add Course from YouTube Playlist

```
Frontend Request
    ↓
POST /videos/youtube-playlist
Headers: Authorization: Bearer <token>
Body: { playlist_url: "https://youtube.com/playlist?list=..." }
    ↓
dependencies.py → get_current_user()
    ↓
video_service.py → add_youtube_playlist()
    ↓
1. Check user is admin
   if current_user.role != 'admin': raise 403
   ↓
2. Extract playlist ID from URL
   re.search(r'[?&]list=([a-zA-Z0-9_-]+)', playlist_url)
   → playlist_id
   ↓
3. Normalize playlist URL
   Convert watch URL to playlist URL format
   ↓
4. Configure yt-dlp options
   ydl_opts = {
       'extract_flat': True,  # Fast extraction
       'ignoreerrors': True,  # Continue on errors
       'player_client': ['android'],  # Less likely blocked
       ...
   }
   ↓
5. Try extraction with multiple clients
   Attempt 1: Android client
   Attempt 2: iOS client (if 403)
   Attempt 3: Web client (if 403)
   ↓
6. Extract playlist info
   yt_dlp.YoutubeDL().extract_info(playlist_url)
   → { title, entries: [{ id, title, ... }] }
   ↓
7. Create Course record
   new_course = Course(
       course_title=playlist_title,
       link=playlist_url
   )
   db.add(new_course)
   db.flush()  # Get course.id without committing
   ↓
8. Create CourseVideo records for each entry
   for entry in entries:
       video_url = f"https://youtube.com/watch?v={video_id}"
       new_video = CourseVideo(
           course_id=new_course.id,
           title=video_title,
           video_link=video_url
       )
       db.add(new_video)
   ↓
9. Commit transaction
   db.commit()
   ↓
10. Return CourseResponse
    { id, course_title, link }
```

**Database Operations:**
- **INSERT**: Create course (1 query)
- **INSERT**: Create videos (N queries, N = number of videos)
- **Total**: 1 + N database queries

**Why This Flow?**
- **External API call**: yt-dlp calls YouTube API
- **Multiple client fallback**: Handles YouTube rate limiting
- **Transaction**: All videos in one commit (atomic)
- **Flush before commit**: Need course.id for videos

### Why This Structure?

1. **yt-dlp Library**:
   - **Why yt-dlp?** Handles YouTube API changes, extracts metadata
   - **extract_flat**: Fast, gets basic info without downloading
   - **Why?** We only need metadata, not video files

2. **Multiple Client Fallback**:
   - **Android → iOS → Web**: Different user agents
   - **Why?** YouTube blocks requests, different clients less likely blocked
   - **403 handling**: Retries with different client

3. **Error Handling**:
   - **Try-except blocks**: Handles YouTube API errors
   - **User-friendly messages**: Converts technical errors to readable messages
   - **Why?** Better UX, helps admin fix issues

4. **URL Normalization**:
   - **Multiple formats**: YouTube URLs come in different formats
   - **Normalize**: Converts all to standard playlist URL
   - **Why?** Consistent storage, easier validation

5. **Transaction Management**:
   - **db.flush()**: Gets course.id without committing
   - **db.commit()**: Commits course + all videos together
   - **Why?** Atomic operation, all-or-nothing

6. **Separate Service**:
   - **Why separate?** Video operations are complex, different from course CRUD
   - **Future**: Could add video editing, transcoding, etc.

### Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│ Admin Panel │
└──────┬──────┘
       │
       │ POST /videos/youtube-playlist
       │ { playlist_url: "..." }
       ↓
┌─────────────────────────────────┐
│   video_service.py               │
│   add_youtube_playlist()         │
└──────┬──────────────────────────┘
       │
       ├─→ Extract playlist ID
       │   Regex pattern matching
       │
       ├─→ yt-dlp Library
       │   YoutubeDL().extract_info()
       │   ↓
       │   External API Call
       │   ↓
       │   YouTube API
       │   (via yt-dlp)
       │
       ↓
┌─────────────────────────────────┐
│   Database Transaction           │
│   1. db.add(Course)              │
│   2. db.flush() → Get course.id  │
│   3. db.add(CourseVideo) × N    │
│   4. db.commit()                │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   PostgreSQL Database            │
│   INSERT INTO course (...)       │
│   INSERT INTO course_video (...) │
│   (N times)                      │
└─────────────────────────────────┘
```

### What Panel Can Ask

**YouTube Integration:**
1. "Why use yt-dlp instead of YouTube Data API?"
   - **yt-dlp**: Works without API key, handles rate limits better
   - **YouTube API**: Requires API key, rate limits stricter
   - **Why yt-dlp?** Simpler setup, more reliable for playlist extraction

2. "What if YouTube blocks all client types?"
   - **Current**: Returns 403 error
   - **Better**: Queue system, retry later
   - **Why current?** Simple, admin can retry manually

3. "What if playlist has 1000 videos?"
   - **Current**: Creates 1000 video records
   - **Performance**: Might be slow, but works
   - **Better**: Batch inserts, progress indicator

**Error Handling:**
4. "Why multiple extraction attempts?"
   - **YouTube blocking**: Different clients have different success rates
   - **Fallback strategy**: Try Android, then iOS, then Web
   - **Why?** Maximizes success rate

5. "What if some videos in playlist are private?"
   - **Current**: `ignoreerrors: True` skips private videos
   - **Result**: Course created with available videos only
   - **Why?** Better than failing entire operation

**Database:**
6. "Why use db.flush() instead of db.commit() for course?"
   - **flush()**: Gets ID without committing
   - **Why?** Need course.id for videos, but want atomic transaction
   - **commit()**: Final commit includes course + all videos

7. "What if transaction fails halfway?"
   - **db.rollback()**: Reverts all changes
   - **Why?** Prevents partial data (course without videos)
   - **Atomic**: All-or-nothing guarantee

**Architecture:**
8. "Why separate video_service from course_service?"
   - **Complexity**: Video operations are complex (external API)
   - **Separation**: Keeps course_service simple
   - **Why?** Single Responsibility Principle

9. "What if yt-dlp library breaks?"
   - **External dependency**: Risk of breaking changes
   - **Mitigation**: Pin version, test regularly
   - **Alternative**: Use YouTube Data API (more stable, but requires key)

---

**Summary of Files 1-3:**

1. **auth_service.py**: User authentication, registration, JWT tokens
2. **course_service.py**: Course CRUD, student registration
3. **video_service.py**: YouTube playlist integration

**Common Patterns:**
- **Dependency injection**: `get_db()`, `get_current_user()`
- **Router prefix**: Each service has its own prefix
- **Error handling**: HTTPException with appropriate status codes
- **Database transactions**: Atomic operations with commit/rollback
- **Role-based access**: Admin checks in service layer

**Architecture Benefits:**
- **Modular**: Each service independent
- **Scalable**: Can split into separate microservices
- **Testable**: Dependencies can be mocked
- **Maintainable**: Clear separation of concerns
