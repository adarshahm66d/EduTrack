# EduTrack - Login & Signup Setup

## Backend (FastAPI)

The backend is located in the `backend/` directory and includes:
- `main.py` - FastAPI application with login/signup endpoints
- `database.py` - Database connection and session management
- `models.py` - SQLAlchemy models
- `schemas.py` - Pydantic schemas for request/response validation
- `auth.py` - Password hashing and JWT token generation

### Backend Endpoints:
- `POST /signup` - Register a new user
- `POST /login` - Authenticate and get JWT token
- `GET /users/me` - Get current user info (requires token)

## Frontend (React)

The frontend is located in the `frontend/` directory and includes:
- Login form (`/login`)
- Signup form (`/signup`)
- Dashboard (`/dashboard`) - Shows user info after login

## Running the Application

### 1. Start the Podman Pod
```bash
./creat-pod.sh
```

### 2. Apply Database Schema
```bash
podman exec -i database psql -U postgres -d edutrack < database/schema.sql
```

### 3. Install Frontend Dependencies (if not already installed)
```bash
cd frontend
npm install
```

### 4. Access Containers

**Note:** The containers use Alpine Linux, so use `/bin/sh` instead of `bash`.

**Backend Container:**
```bash
podman exec -it backend /bin/sh
cd /app
pip install -r requirments.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend Container:**
```bash
# First, install dependencies (this may take a few minutes)
podman exec -it frontend /bin/sh
cd /app
npm install

# After installation completes, start the dev server
npm start
```

**Or run from outside the container:**
```bash
# Install dependencies
podman exec -it frontend /bin/sh -c "cd /app && npm install"

# Start the dev server
podman exec -it frontend /bin/sh -c "cd /app && npm start"
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Testing the Login/Signup

1. Go to http://localhost:3000
2. Click "Sign up" to create a new account
3. Fill in the form and submit
4. You'll be redirected to login
5. Login with your credentials
6. You'll be redirected to the dashboard showing your user info

## Database Connection

The backend connects to PostgreSQL using:
- Host: `localhost` (within the pod network)
- Port: `5432`
- Database: `edutrack`
- User: `postgres`
- Password: `postgres`

## Notes

- Passwords are hashed using bcrypt
- JWT tokens are stored in localStorage
- CORS is enabled for localhost:3000
- The backend automatically creates tables on startup
