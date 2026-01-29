# EduTrack - Microservices Architecture

## Architecture Overview

EduTrack is now structured as a microservices application with the following services:

### Services

1. **Auth Service** (`/auth`)
   - User registration (`POST /auth/signup`)
   - User login (`POST /auth/login`)
   - Get current user (`GET /auth/users/me`)
   - Health check (`GET /auth/health`)

2. **Course Service** (`/courses`)
   - Get all courses (`GET /courses`)
   - Get course by ID (`GET /courses/{course_id}`)
   - Health check (`GET /courses/health`)

3. **Video Service** (`/videos`)
   - Get course videos (`GET /videos/course/{course_id}`)
   - Add YouTube playlist (`POST /videos/youtube-playlist`)
   - Health check (`GET /videos/health`)

### API Gateway

The main FastAPI application (`backend/main.py`) acts as an API Gateway that:
- Routes requests to appropriate services
- Handles CORS
- Provides unified entry point
- Health checks for all services

## Service Structure

```
backend/
├── main.py              # API Gateway
├── auth_service.py      # Authentication microservice
├── course_service.py    # Course management microservice
├── video_service.py     # Video management microservice
├── models.py            # Shared database models
├── schemas.py           # Shared Pydantic schemas
├── database.py          # Shared database connection
└── auth.py              # Shared authentication utilities
```

## API Endpoints

### Authentication Service
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/users/me?token=...` - Get current user
- `GET /auth/health` - Service health check

### Course Service
- `GET /courses` - Get all courses
- `GET /courses/{course_id}` - Get specific course
- `GET /courses/health` - Service health check

### Video Service
- `GET /videos/course/{course_id}` - Get videos for a course
- `POST /videos/youtube-playlist` - Add YouTube playlist
- `GET /videos/health` - Service health check

## Benefits of Microservices Architecture

1. **Separation of Concerns**: Each service handles a specific domain
2. **Scalability**: Services can be scaled independently
3. **Maintainability**: Easier to maintain and update individual services
4. **Technology Flexibility**: Each service could use different technologies
5. **Fault Isolation**: Issues in one service don't affect others

## Running the Application

The application runs as a single container with all services, but they are logically separated:

```bash
# Start the pod
./creat-pod.sh

# Start backend (runs all services via API Gateway)
podman exec -it backend /bin/sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

## Future Enhancements

- Deploy services as separate containers
- Add service discovery
- Implement API rate limiting per service
- Add service-to-service authentication
- Implement circuit breakers
- Add distributed tracing
