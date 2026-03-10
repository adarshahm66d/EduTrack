# Presentation Script - Feature Explanations

## 1. Automatic Attendance System

**What I Built:**
"I built an automatic attendance system that calculates attendance from video watch time in real-time. The system automatically marks students as present or absent based on their total watch time for the day."

**How I Implemented It:**
"I used SQL aggregation with `SUM()` to calculate total watch time from all progress records for a user on a given day. On every progress update, I query the sum of all watch_time intervals and update the attendance record. If total time is >= 30 seconds, status becomes 'present', otherwise it stays 'in progress' during the day."

**The Logic:**
"The attendance table stores daily summaries, while progress table stores per-video details. I use PostgreSQL INTERVAL type for time durations and convert to seconds for comparison. The system runs this calculation automatically on every video pause or end event."

---

## 2. Real-Time Progress Tracking

**What I Built:**
"I implemented real-time progress tracking that automatically saves watch time on play, pause, and end events. The system tracks when a video starts, when it pauses, and calculates the exact watch time."

**How I Implemented It:**
"I integrated YouTube IFrame API event handlers - `onStateChange` detects play/pause/end events. When video plays, I send `start_time` to backend. When it pauses, I calculate `watchtime_seconds` from the difference and send it along with `end_time`. The backend stores this in a progress table with INTERVAL type."

**The Logic:**
"I use `useRef` to store latest state values in React, preventing stale closures in YouTube API callbacks. On component unmount or video change, I call `saveProgress()` to ensure no data is lost. The backend creates one record per video per day per user and accumulates watch time."

---

## 3. Past Date Finalization

**What I Built:**
"I implemented past date finalization that auto-marks absent students when viewing historical data. When an admin views attendance for a past date, the system automatically finalizes statuses."

**How I Implemented It:**
"In the `get_attendance_by_date` endpoint, I check if the requested date is in the past. For past dates, I iterate through attendance records and mark any with < 30 seconds as 'absent'. I also query all students and create 'absent' records for those who never started watching that day."

**The Logic:**
"I use a map structure `{user_id: attendance}` for O(1) lookup when checking which students have records. For students not in the map, I create new attendance records with `total_time=0` and `status='absent'`. This ensures complete historical data without gaps."

---

## 4. Progress Accumulation

**What I Built:**
"The system accumulates watch time across multiple sessions for accurate tracking. If a student watches the same video multiple times in a day, all watch time is added together."

**How I Implemented It:**
"In the backend, I check if a progress record exists for the user, video, and date. If it exists, I add the new `watch_time_delta` to the existing `watch_time` using `+=` operator. If it doesn't exist, I create a new record. This ensures one record per video per day with accumulated time."

**The Logic:**
"I use a database query to find existing progress: `filter(user_id, video_id, date == today)`. PostgreSQL INTERVAL type supports addition, so I can directly add timedelta objects. The attendance calculation then sums all these accumulated progress records."

---

## 5. Reusable Modal with Random Popups

**What I Built:**
"I built a reusable modal component that triggers random pop-ups for feedback, star ratings, and captchas to verify student engagement during videos."

**How I Implemented It:**
"I created a single `VideoPopup` component that accepts a `type` prop ('feedback', 'rating', 'captcha'). I use a `switch` statement to render different content based on type. For captcha, I use lazy state initialization `useState(() => generateCaptcha())` to create a new math problem each time the popup opens."

**The Logic:**
"I schedule random popups using `setTimeout` with random intervals between 2-5 minutes. The popup type is randomly selected from an array. When user submits, I validate input (feedback text, rating selection, captcha answer) and call `onSubmit` callback with the data. If captcha is wrong, I generate a new problem."

---

## 6. Back Button

**What I Built:**
"I implemented a back button component that appears on multiple pages, allowing users to navigate back to the previous page or dashboard."

**How I Implemented It:**
"I used React Router's `Link` component with `to="/dashboard"` prop. I styled it with an SVG arrow icon and text. The button uses CSS classes for consistent styling across pages and includes a `title` attribute for accessibility."

**The Logic:**
"React Router handles the navigation without page reload, maintaining SPA behavior. The `Link` component renders as an anchor tag but prevents default navigation, using client-side routing instead. I placed it in the header section of CourseCatalog and other pages."

---

## 7. Search Bar

**What I Built:**
"I implemented a client-side search bar that filters courses in real-time as the user types, with a clear button to reset the search."

**How I Implemented It:**
"I used `useState` for `searchTerm` and created a `filteredCourses` computed value: `courses.filter(course => course.course_title.toLowerCase().includes(searchTerm.toLowerCase()))`. I render the filtered array instead of the full courses array. The clear button conditionally renders when `searchTerm` has value."

**The Logic:**
"Client-side filtering is fast and doesn't require API calls. I use `toLowerCase()` for case-insensitive matching and `includes()` for partial string matching. The filter runs on every render, but it's efficient for typical course lists (under 100 items)."

---

## 8. Video Player

**What I Built:**
"I integrated YouTube IFrame API to embed and control video playback, with playlist navigation and auto-play functionality."

**How I Implemented It:**
"I load YouTube IFrame API script dynamically and create a player instance using `new YT.Player()`. I set up event handlers for `onStateChange` to detect play, pause, and end events. When a video ends, I automatically load the next video in the playlist using `player.loadVideoById()`."

**The Logic:**
"I use `useRef` to store the player instance and latest state values, preventing stale closures in event handlers. The player state constants (PLAYING=1, PAUSED=2, ENDED=0) help me detect events. I track `selectedVideoIndex` to know which video to play next, incrementing it on video end."

---

## 9. Login/Signup

**What I Built:**
"I implemented authentication forms with client-side validation, JWT token storage, and automatic navigation to dashboard after successful login."

**How I Implemented It:**
"For login, I call the `/auth/login` API endpoint with email and password. On success, I store the JWT token in `localStorage` and dispatch a custom `tokenUpdated` event. For signup, I validate password match and email format, then call `/auth/signup` which automatically assigns 'student' role."

**The Logic:**
"I use controlled components with `useState` for form inputs. The backend uses bcrypt to hash passwords and returns a JWT token with user data. I use `useNavigate` from React Router to redirect after successful authentication. The token is attached to all subsequent API requests via Axios interceptors."

---

## 10. Course Card

**What I Built:**
"I created reusable course cards that display course thumbnails, titles, expandable descriptions, and action buttons based on user role."

**How I Implemented It:**
"I fetch course thumbnails by extracting YouTube video IDs from the first video's URL and generating thumbnail URLs: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`. I use `expandedCourses` array state to track which cards are expanded. For students, I show 'Register' or 'Start Course' buttons based on enrollment status."

**The Logic:**
"I use `Array.includes()` and `Array.filter()` to manage expanded state (not Set, because React tracks array changes better). I fetch thumbnails in parallel using `Promise.all()` for performance. The card uses conditional rendering: if enrolled, show 'Start Course' link, else show 'Register' button that calls the registration API."

---

## 11. Student List

**What I Built:**
"I built an admin-only page that displays all students with their attendance status for a selected date, with search functionality."

**How I Implemented It:**
"I fetch all students using `getAllStudents()` and attendance for a date using `getAttendanceByDate()`. I combine them using a map structure for O(1) lookup. I filter students by search term using `filter()` on the student name. I display status badges with different colors: green for 'present', yellow for 'in progress', red for 'absent'."

**The Logic:**
"I use `Promise.all()` to fetch students and attendance in parallel. I create a map `{user_id: attendance}` to quickly find attendance for each student. For students without attendance records, I display 'Not Started'. The search filters on the client side using `includes()` for partial matching."

---

## 12. Admin Dashboard

**What I Built:**
"I created an admin dashboard that shows all courses with management options: add new courses from YouTube playlists and delete existing courses."

**How I Implemented It:**
"I fetch all courses and display them in a grid. I check `user.role === 'admin'` to show admin-only buttons. The 'Add Course' button opens a form that accepts YouTube playlist URLs. On submit, I call `addYouTubePlaylist()` API which uses `yt-dlp` to extract videos and create course records."

**The Logic:**
"I use role-based conditional rendering to show/hide admin features. The YouTube playlist endpoint validates the URL format, extracts playlist metadata using `yt-dlp`, and creates course and video records in a transaction. I use optimistic UI updates - immediately add the course to state, then refresh from server."

---

## 13. Next Videos in Playlist

**What I Built:**
"I implemented a video list below the player that shows all videos in the course, with progress indicators and click-to-play functionality."

**How I Implemented It:**
"I fetch all videos for the course using `getCourseVideos(courseId)`. I map through the videos array and render each as a list item. I highlight the currently playing video using `selectedVideoIndex`. I fetch progress for all videos in parallel using `Promise.all()` and display watch time for each."

**The Logic:**
"I maintain `selectedVideoIndex` state that tracks which video is playing. When a video is clicked, I update `selectedVideoIndex` and call `player.loadVideoById()`. I use `videoProgress` state object `{videoId: {watchTime}}` to store progress for all videos. I calculate progress percentage by comparing watch time to video duration."

---

## 14. Add Course Feature

**What I Built:**
"I implemented a feature for admins to add courses by providing a YouTube playlist URL, which automatically extracts all videos and creates the course."

**How I Implemented It:**
"I created a form in CourseCatalog that accepts YouTube playlist URLs. I validate the URL format using regex patterns for different YouTube URL formats. On submit, I call `addYouTubePlaylist()` API endpoint. The backend uses `yt-dlp` library to extract playlist information and creates course and video records in the database."

**The Logic:**
"I validate URLs client-side before API call for better UX. The backend validates the URL, uses `yt-dlp` to fetch playlist metadata (title, video links), and creates records in a database transaction. I use optimistic UI updates - add course to state immediately, then fetch thumbnail and refresh list. I handle errors like private playlists, timeouts, and invalid URLs with specific error messages."

---

## Quick Reference - One-Liners

1. **Attendance System**: "Real-time calculation using SQL SUM aggregation, updates on every progress save, marks present/absent based on 30-second threshold."

2. **Progress Tracking**: "YouTube API event handlers track play/pause/end, calculate watch time from start/end difference, save automatically using useRef to avoid stale closures."

3. **Past Date Finalization**: "Auto-marks absent when viewing past dates, creates absent records for non-starters, uses map for O(1) student lookup."

4. **Progress Accumulation**: "One record per video per day, accumulates watch time with += operator, PostgreSQL INTERVAL type supports addition."

5. **Random Popups**: "Single reusable component with type prop, lazy state initialization for captcha, scheduled with random setTimeout intervals."

6. **Back Button**: "React Router Link component, client-side navigation, consistent styling with SVG icon."

7. **Search Bar**: "Client-side filtering with includes(), case-insensitive matching, real-time results as user types."

8. **Video Player**: "YouTube IFrame API integration, event handlers for state changes, auto-play next video on end."

9. **Login/Signup**: "JWT token storage in localStorage, bcrypt password hashing, automatic role assignment, Axios interceptors for token attachment."

10. **Course Card**: "Thumbnail extraction from YouTube URLs, array-based expansion state, parallel thumbnail fetching, conditional action buttons."

11. **Student List**: "Parallel data fetching, map structure for attendance lookup, client-side search filtering, status badges with colors."

12. **Admin Dashboard**: "Role-based conditional rendering, YouTube playlist extraction with yt-dlp, optimistic UI updates, transaction-based course creation."

13. **Video Playlist**: "Parallel progress fetching, selectedVideoIndex state tracking, click-to-play functionality, progress percentage calculation."

14. **Add Course**: "URL validation with regex, yt-dlp for playlist extraction, database transaction for course creation, specific error handling."
