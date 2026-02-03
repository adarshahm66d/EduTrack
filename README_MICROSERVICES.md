# EduTrack - Microservices Architecture

## Architecture Overview

EduTrack is structured as a microservices application with the following services:

### Services

1. **Auth Service** (`/auth`)
   - User registration (`POST /auth/signup`)
   - User login (`POST /auth/login`)
   - Get current user (`GET /auth/users/me`)
   - Health check (`GET /auth/health`)

2. **Course Service** (`/courses`)
   - Get all courses (`GET /courses`)
   - Get course by ID (`GET /courses/{course_id}`)
   - Course registration (`POST /courses/{course_id}/register`)
   - Check registration status (`GET /courses/{course_id}/registration`)
   - Health check (`GET /courses/health`)

3. **Video Service** (`/videos`)
   - Get course videos (`GET /videos/course/{course_id}`)
   - Add YouTube playlist (`POST /videos/youtube-playlist`)
   - Health check (`GET /videos/health`)

4. **Attendance Service** (`/progress`, `/attendance`)
   - Track video progress (`POST /progress`)
   - Get video progress (`GET /progress/video/{video_id}`)
   - Get user attendance (`GET /attendance/me`)
   - Get attendance by user (`GET /attendance/user/{user_id}`) - Admin only
   - Get attendance by date (`GET /attendance/date/{date}`) - Admin only
   - Get today's attendance (`GET /attendance/today`)
   - Health check (`GET /progress/health`)

### API Gateway

The main FastAPI application (`backend/main.py`) acts as an API Gateway that:
- Routes requests to appropriate services
- Handles CORS
- Provides unified entry point
- Health checks for all services
- JWT token validation

## Service Structure

```
backend/
├── main.py              # API Gateway
├── auth_service.py      # Authentication microservice
├── course_service.py    # Course management microservice
├── video_service.py     # Video management microservice
├── attendance_service.py # Progress & Attendance microservice
├── models.py            # Shared database models
├── schemas.py           # Shared Pydantic schemas
├── database.py          # Shared database connection
├── dependencies.py      # Dependency injection & auth
└── auth.py              # Shared authentication utilities
```

## API Endpoints

### Authentication Service

**Base Path:** `/auth`

- `POST /auth/signup` - Register new user
  - Request: `{ "username": string, "email": string, "password": string, "role": "student" | "admin" }`
  - Response: `{ "message": string, "user_id": int }`

- `POST /auth/login` - Login user
  - Request: `{ "username": string, "password": string }`
  - Response: `{ "access_token": string, "token_type": "bearer" }`

- `GET /auth/users/me?token=...` - Get current user
  - Response: `{ "id": int, "username": string, "email": string, "role": string }`

- `GET /auth/health` - Service health check

### Course Service

**Base Path:** `/courses`

- `GET /courses` - Get all courses
  - Response: `[{ "id": int, "course_title": string, ... }]`

- `GET /courses/{course_id}` - Get specific course
  - Response: `{ "id": int, "course_title": string, ... }`

- `POST /courses/{course_id}/register` - Register for course (student only)
  - Requires: Authentication token
  - Response: `{ "message": string }`

- `GET /courses/{course_id}/registration` - Check registration status
  - Requires: Authentication token
  - Response: `{ "enrolled": boolean }`

- `GET /courses/health` - Service health check

### Video Service

**Base Path:** `/videos`

- `GET /videos/course/{course_id}` - Get videos for a course
  - Response: `[{ "id": int, "title": string, "video_link": string, ... }]`

- `POST /videos/youtube-playlist` - Add YouTube playlist
  - Requires: Authentication token (admin only)
  - Request: `{ "playlist_url": string }`
  - Response: `{ "id": int, "course_title": string, ... }`

- `GET /videos/health` - Service health check

### Attendance Service

**Base Path:** `/progress`, `/attendance`

#### Progress Tracking

- `POST /progress` - Track video watchtime progress
  - Requires: Authentication token (student only)
  - Request Body:
    ```json
    {
      "video_id": int,
      "start_time": "HH:MM:SS" (optional, sent on play),
      "end_time": "HH:MM:SS" (optional, sent on pause),
      "watchtime_seconds": int (optional, calculated on pause)
    }
    ```
  - Behavior:
    - First play: Creates record with `start_time` only
    - First pause: Updates with `end_time` and `watchtime_seconds`
    - Subsequent plays: Updates `start_time`
    - Subsequent pauses: Updates `end_time` and accumulates `watchtime_seconds`
  - Response: Progress record with accumulated watch time

- `GET /progress/video/{video_id}` - Get video progress for current user
  - Requires: Authentication token
  - Response: `[{ "id": int, "date": string, "watch_time": "HH:MM:SS", ... }]`

#### Attendance

- `GET /attendance/me` - Get current user's attendance
  - Requires: Authentication token
  - Response: `[{ "date": string, "status": string, "total_time": "HH:MM:SS", ... }]`

- `GET /attendance/user/{user_id}` - Get user attendance (admin only)
  - Requires: Authentication token (admin role)
  - Response: `[{ "date": string, "status": string, "total_time": "HH:MM:SS", ... }]`

- `GET /attendance/date/{date}` - Get attendance by date (admin only)
  - Requires: Authentication token (admin role)
  - Date format: `YYYY-MM-DD`
  - Response: `[{ "user_id": int, "status": string, "total_time": "HH:MM:SS", ... }]`

- `GET /attendance/today` - Get today's attendance
  - Requires: Authentication token
  - Response: `{ "date": string, "status": string, "total_time": "HH:MM:SS", ... }`

- `GET /progress/health` - Service health check

## Progress Tracking Flow

### How Progress Tracking Works

1. **Video Play Event**:
   ```
   Client → POST /progress
   Body: { "video_id": 1, "start_time": "14:30:00" }
   ```
   - Creates/updates progress record with `start_time`
   - No watch time calculated yet

2. **Video Pause Event**:
   ```
   Client → POST /progress
   Body: { 
     "video_id": 1, 
     "end_time": "14:35:30",
     "watchtime_seconds": 330
   }
   ```
   - Updates progress record with `end_time`
   - Calculates watch time: `end_time - start_time = 330 seconds`
   - Accumulates with existing watch time (if any)

3. **Subsequent Play/Pause Cycles**:
   - Each play updates `start_time`
   - Each pause calculates new watch time and accumulates it
   - Total watch time = sum of all play sessions

### Data Model

**Progress Table:**
- `id`: Primary key
- `user_id`: Foreign key to users
- `video_id`: Foreign key to course_videos
- `date`: Date of tracking (YYYY-MM-DD)
- `start_time`: First play time of the day (HH:MM:SS)
- `end_time`: Latest pause time (HH:MM:SS)
- `watch_time`: Accumulated watch time (INTERVAL type)

**Attendance Table:**
- `id`: Primary key
- `user_id`: Foreign key to users
- `date`: Date of attendance (YYYY-MM-DD)
- `status`: "present" or "absent"
- `total_time`: Sum of all watch_time from progress table (INTERVAL type)

## Benefits of Microservices Architecture

1. **Separation of Concerns**: Each service handles a specific domain
2. **Scalability**: Services can be scaled independently
3. **Maintainability**: Easier to maintain and update individual services
4. **Technology Flexibility**: Each service could use different technologies
5. **Fault Isolation**: Issues in one service don't affect others
6. **Independent Development**: Teams can work on different services simultaneously

## Service Communication

Currently, all services share:
- Same database (PostgreSQL)
- Same authentication mechanism (JWT)
- Same API Gateway

Future enhancements could include:
- Service-to-service communication via HTTP/gRPC
- Message queues for async operations
- Service discovery
- Distributed tracing

## Running the Application

The application runs as a single container with all services, but they are logically separated:

```bash
# Start the pod
./creat-pod.sh

# Start backend (runs all services via API Gateway)
podman exec -it backend /bin/sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

## Authentication Flow

1. User signs up/logs in via Auth Service
2. Auth Service returns JWT token
3. Client stores token in localStorage
4. All subsequent requests include token in Authorization header or query parameter
5. API Gateway validates token via dependencies
6. Services use validated user_id from token

## Error Handling

Each service implements consistent error handling:
- HTTP status codes (200, 201, 400, 401, 404, 500)
- Detailed error messages in response body
- Health check endpoints for monitoring
- Graceful degradation

## Future Enhancements

- Deploy services as separate containers
- Add service discovery (Consul, etcd)
- Implement API rate limiting per service
- Add service-to-service authentication
- Implement circuit breakers
- Add distributed tracing (Jaeger, Zipkin)
- Message queue integration (RabbitMQ, Kafka)
- Caching layer (Redis)
- Load balancing
- Service mesh (Istio, Linkerd)
