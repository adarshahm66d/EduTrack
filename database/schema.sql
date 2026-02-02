-- Create User table
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) default 'student'
);

-- Create Course table
CREATE TABLE course (
    id SERIAL PRIMARY KEY,
    course_title VARCHAR(255) NOT NULL,
    link TEXT
);

-- Create Attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_ID INTEGER NOT NULL,
    date DATE NOT NULL,
    total_time INTERVAL,
    status VARCHAR(50),
    CONSTRAINT fk_attendance_user 
        FOREIGN KEY (user_ID) 
        REFERENCES "user"(id) 
        ON DELETE CASCADE
);

-- Create Progress table
CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    watch_time INTERVAL,
    CONSTRAINT fk_progress_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_progress_video 
        FOREIGN KEY (video_id) 
        REFERENCES course_video(id) 
        ON DELETE CASCADE
);

-- Create Course_Status table
CREATE TABLE course_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_ID INTEGER NOT NULL,
    enrolled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_status_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_course_status_course 
        FOREIGN KEY (course_ID) 
        REFERENCES course(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_user_course 
        UNIQUE (user_id, course_ID)
);

-- Create Course_video table
CREATE TABLE course_video (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    video_link TEXT,
    CONSTRAINT fk_course_video_course 
        FOREIGN KEY (course_id) 
        REFERENCES course(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_attendance_user_id ON attendance(user_ID);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_video_id ON progress(video_id);
CREATE INDEX idx_progress_date ON progress(date);
CREATE INDEX idx_course_status_user_id ON course_status(user_id);
CREATE INDEX idx_course_status_course_id ON course_status(course_ID);
CREATE INDEX idx_course_video_course_id ON course_video(course_id);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_user_name ON "user"(user_name);

-- Add comments for documentation
COMMENT ON TABLE "user" IS 'Stores user account information';
COMMENT ON TABLE course IS 'Stores course information';
COMMENT ON TABLE attendance IS 'Tracks user attendance records';
COMMENT ON TABLE progress IS 'Tracks user progress on courses';
COMMENT ON TABLE course_status IS 'Tracks user enrollment status for courses';
COMMENT ON TABLE course_video IS 'Stores video information for courses';
