-- Add video_progress table for tracking user watch progress
CREATE TABLE IF NOT EXISTS video_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    watch_time INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_progress_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_video_progress_course 
        FOREIGN KEY (course_id) 
        REFERENCES course(id) 
        ON DELETE CASCADE,
    -- Note: video_id references course_video(id) but foreign key constraint
    -- may not be enforced if course_video table doesn't have proper primary key
    -- The relationship is maintained logically in the application
    CONSTRAINT unique_user_course_video 
        UNIQUE (user_id, course_id, video_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_course_id ON video_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);

-- Add comment for documentation
COMMENT ON TABLE video_progress IS 'Tracks user watch progress for individual videos in courses';
