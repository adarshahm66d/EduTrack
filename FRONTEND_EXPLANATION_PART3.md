# Frontend Files Explanation - Part 3 (Next 3 Files)

## File 7: `components/Dashboard.js`

### Purpose
**Main student dashboard** that displays personalized course catalog with registration status. It:
- Shows user information and welcome message
- Displays all available courses with thumbnails
- Shows registration status for each course (enrolled/not enrolled)
- Allows students to register for courses
- Provides search functionality
- Includes user menu with logout

### Core Logic (Line-by-Line)

```javascript
const [user, setUser] = useState(null);
const [courses, setCourses] = useState([]);
const [courseThumbnails, setCourseThumbnails] = useState({});
const [courseRegistrations, setCourseRegistrations] = useState({});
const [loading, setLoading] = useState(true);
const [coursesLoading, setCoursesLoading] = useState(true);
```
- **Multiple loading states**: `loading` for initial load, `coursesLoading` for courses specifically
- **Why separate?** Can show user info while courses are still loading
- **Registration map**: Object with `{ courseId: boolean }` for quick lookup

```javascript
useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        navigate('/login');
        return;
    }
```
- **Route protection**: Checks token before fetching data
- **Early return**: Prevents unnecessary API calls if not authenticated
- **Why not rely on App.js?** Extra safety check

```javascript
const extractVideoId = (url) => {
    // Try multiple patterns to extract video ID
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};
```
- **Multiple regex patterns**: Handles different YouTube URL formats
- **Why loop?** Some URLs might match multiple patterns, first match wins
- **More robust than Landing.js**: Handles edge cases like `?v=ID&list=...`

```javascript
const [userData, coursesData] = await Promise.all([
    getCurrentUser(),
    getCourses()
]);
```
- **Parallel fetching**: User and courses fetched simultaneously
- **Why?** Independent data, no need to wait for one before the other

```javascript
// Fetch registration status for each course (only for students)
if (userData.role === 'student') {
    const registrationPromises = coursesData.map(async (course) => {
        const registration = await getCourseRegistration(course.id);
        return {
            courseId: course.id,
            enrolled: registration.enrolled
        };
    });
    const registrationResults = await Promise.all(registrationPromises);
    const registrationMap = {};
    registrationResults.forEach(({ courseId, enrolled }) => {
        registrationMap[courseId] = enrolled;
    });
    setCourseRegistrations(registrationMap);
}
```
- **Conditional fetching**: Only fetches registrations for students
- **Why?** Admins don't need registration status
- **Parallel fetching**: All registration checks happen simultaneously
- **Map construction**: Converts array to object for O(1) lookup

```javascript
const handleRegister = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRegisteringCourseId(courseId);
    await registerForCourse(courseId);
    setCourseRegistrations(prev => ({
        ...prev,
        [courseId]: true
    }));
};
```
- **Optimistic update**: Updates UI immediately after API call
- **Why?** Better UX, no need to refetch all courses
- **`stopPropagation`**: Prevents event bubbling (if button is in card)

```javascript
const filteredCourses = courses.filter(course =>
    course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
);
```
- **Client-side filtering**: Filters courses in memory
- **Why not server-side?** Simpler, works for small datasets
- **Case-insensitive**: Converts both to lowercase

```javascript
useEffect(() => {
    const handleClickOutside = (event) => {
        if (showUserMenu && !event.target.closest('.user-menu-container')) {
            setShowUserMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [showUserMenu]);
```
- **Click outside handler**: Closes dropdown when clicking outside
- **`closest()` method**: Checks if click is inside menu container
- **Why mousedown?** Fires before click, better UX
- **Cleanup**: Removes listener to prevent memory leaks

```javascript
{user?.role === 'student' && (
    <div className="course-card-footer">
        {courseRegistrations[course.id] ? (
            <Link to={`/course/${course.id}`} className="btn-enroll">
                Start Course
            </Link>
        ) : (
            <button onClick={(e) => handleRegister(course.id, e)}>
                Register
            </button>
        )}
    </div>
)}
```
- **Conditional rendering**: Only shows registration UI for students
- **Dynamic button**: Changes based on registration status
- **Why Link vs button?** Different actions (navigate vs register)

### Why This Approach?

1. **Separate Loading States**:
   - **Problem**: User info loads faster than courses
   - **Solution**: Show user info immediately, courses separately
   - **Why?** Better perceived performance

2. **Registration Map Object**:
   - **Problem**: Need to check if course is enrolled (frequent operation)
   - **Solution**: Object with courseId as key for O(1) lookup
   - **Why not array?** Array lookup is O(n), object is O(1)

3. **Optimistic UI Updates**:
   - **Problem**: Waiting for API response feels slow
   - **Solution**: Update UI immediately, API call in background
   - **Why?** Better UX, feels instant

4. **Client-Side Search**:
   - **Problem**: Server-side search requires API call on every keystroke
   - **Solution**: Filter in memory
   - **Why?** Instant results, no network delay
   - **Trade-off**: Only works for small datasets (< 1000 items)

5. **Click Outside Handler**:
   - **Problem**: Dropdown stays open after clicking
   - **Solution**: Close when clicking outside
   - **Why?** Standard UX pattern, expected behavior

6. **Role-Based UI**:
   - **Problem**: Different users need different features
   - **Solution**: Conditional rendering based on role
   - **Why?** Cleaner than separate components

### Data Structures Used

1. **State**:
   - `user` (Object): `{ id, name, email, user_name, role, created_at }`
   - `courses` (Array): List of course objects
   - `courseThumbnails` (Object): `{ courseId: thumbnailUrl }`
   - `courseRegistrations` (Object): `{ courseId: boolean }`
   - `loading` (boolean): Initial load state
   - `coursesLoading` (boolean): Courses loading state
   - `showUserMenu` (boolean): Dropdown visibility
   - `registeringCourseId` (number | null): Currently registering course
   - `searchTerm` (string): Search input value

2. **Registration Map**:
   ```javascript
   {
       1: true,   // Course 1 is enrolled
       2: false,  // Course 2 is not enrolled
       3: true    // Course 3 is enrolled
   }
   ```

### How It Connects to Other Files

**Imports:**
- `react-router-dom`: `useNavigate`, `Link` for navigation
- `../api`: Multiple API functions

**API Calls:**
```
Dashboard.js → getCurrentUser() → api.js → Backend /auth/users/me
Dashboard.js → getCourses() → api.js → Backend /courses
Dashboard.js → getCourseVideos(courseId) → api.js → Backend /courses/{id}/videos
Dashboard.js → getCourseRegistration(courseId) → api.js → Backend /courses/{id}/registration
Dashboard.js → registerForCourse(courseId) → api.js → Backend POST /courses/{id}/register
```

**Navigation Flow:**
```
User clicks "Start Course" → Link to="/course/{id}" → App.js router → CourseDetail.js
User clicks "Admin Dashboard" → Link to="/admin" → App.js router → AdminDashboard.js
User clicks logout → navigate('/') → App.js router → Landing.js
```

**Event Flow:**
```
handleRegister → registerForCourse() → Updates registrationMap → UI updates
handleLogout → localStorage.removeItem() → window.dispatchEvent('tokenUpdated') → App.js updates
```

### What Panel Can Ask

**State Management:**
1. "Why use object for courseRegistrations instead of array?"
   - Object: O(1) lookup with `registrations[courseId]`
   - Array: O(n) lookup with `find()`
   - For frequent lookups, object is more efficient

2. "Why two separate loading states?"
   - `loading`: Overall page load (user + courses)
   - `coursesLoading`: Just courses (can show user info while courses load)
   - Better UX: Show partial content instead of blank screen

3. "How would you handle registration status updates from other tabs?"
   - Listen to `storage` event for localStorage changes
   - Or use WebSocket for real-time updates
   - **Current**: No cross-tab sync (acceptable for this use case)

**Performance:**
4. "Why fetch registrations in parallel instead of sequentially?"
   - Sequential: N requests × 100ms = 1 second for 10 courses
   - Parallel: All requests simultaneously = ~100ms total
   - Much faster, but more server load

5. "What if there are 1000 courses? Would client-side search still work?"
   - **Current**: Yes, but might be slow
   - **Better**: Server-side search with debouncing
   - **Trade-off**: Network delay vs computation time

**UX:**
6. "Why optimistic update for registration?"
   - Feels instant to user
   - **Risk**: If API fails, UI shows wrong state
   - **Mitigation**: Could revert on error, but current approach assumes success

7. "How would you add loading skeleton instead of 'Loading...' text?"
   - Show course card skeletons with shimmer effect
   - Better perceived performance
   - More professional look

**Error Handling:**
8. "What happens if getCurrentUser() fails but getCourses() succeeds?"
   - Error in catch block → Clears token → Redirects to login
   - **Issue**: User might see courses briefly before redirect
   - **Better**: Handle errors individually, show partial content

---

## File 8: `components/AdminDashboard.js`

### Purpose
**Admin-only dashboard** for managing courses. It:
- Displays all courses with management options
- Allows adding new courses from YouTube playlists
- Allows deleting courses
- Provides search functionality
- Validates YouTube playlist URLs
- Shows detailed error messages for playlist operations

### Core Logic (Line-by-Line)

```javascript
// Check if user is admin
if (userData.role !== 'admin') {
    navigate('/dashboard');
    return;
}
```
- **Role-based access control**: Redirects non-admins
- **Why check here?** Extra security layer (backend also checks)
- **Defense in depth**: Multiple layers of protection

```javascript
const fetchCourses = async () => {
    // Separate function for reusability
    const data = await getCourses();
    setCourses(data);
    // ... fetch thumbnails
};
```
- **Extracted function**: Can be called from multiple places
- **Why?** Used in initial load and after add/delete operations
- **DRY principle**: Don't repeat code

```javascript
const validatePlaylistUrl = (url) => {
    const playlistPatterns = [
        /youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/i,
        /youtube\.com\/watch\?.*list=[a-zA-Z0-9_-]+/i,
        /youtu\.be\/.*\?list=[a-zA-Z0-9_-]+/i
    ];
    
    const isValid = playlistPatterns.some(pattern => pattern.test(trimmedUrl));
    
    if (!isValid) {
        return { valid: false, message: 'Please enter a valid YouTube playlist URL...' };
    }
    return { valid: true };
};
```
- **Client-side validation**: Validates before API call
- **Why?** Saves API call, immediate feedback
- **Multiple patterns**: Handles different YouTube URL formats
- **Returns object**: `{ valid, message }` for flexible error handling

```javascript
const handleAddPlaylist = async (e) => {
    const validation = validatePlaylistUrl(playlistUrl);
    if (!validation.valid) {
        setError(validation.message);
        return;
    }
    
    const newCourse = await addYouTubePlaylist(playlistUrl);
    
    // Add the new course directly to the state immediately
    setCourses(prevCourses => {
        const exists = prevCourses.some(c => c.id === newCourse.id);
        if (exists) {
            return prevCourses;
        }
        return [newCourse, ...prevCourses];
    });
    
    // Fetch thumbnail for the new course
    // ...
    
    // Also refresh the course list as a backup
    await fetchCourses();
};
```
- **Optimistic update**: Adds course to state immediately
- **Duplicate check**: Prevents adding same course twice
- **Thumbnail fetch**: Gets thumbnail for new course
- **Backup refresh**: Refetches all courses to ensure consistency
- **Why both?** Optimistic update for speed, refresh for accuracy

```javascript
const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}"? ...`)) {
        return;
    }
    
    await deleteCourse(courseId);
    await fetchCourses();
};
```
- **Confirmation dialog**: Prevents accidental deletion
- **Why window.confirm?** Simple, built-in browser API
- **Better alternative**: Custom modal component
- **Refetch after delete**: Updates UI with latest data

```javascript
if (err.message.includes('403') || err.message.includes('Forbidden')) {
    errorMessage = 'YouTube is blocking the request. Please ensure the playlist is public...';
} else if (err.message.includes('404') || err.message.includes('not found')) {
    errorMessage = 'Playlist not found. Please verify the URL is correct...';
}
```
- **Detailed error messages**: Different messages for different errors
- **Why?** Helps admin understand what went wrong
- **User-friendly**: Explains problem and solution

### Why This Approach?

1. **Client-Side URL Validation**:
   - **Problem**: Invalid URLs waste API calls
   - **Solution**: Validate before API call
   - **Why?** Immediate feedback, saves server resources

2. **Optimistic Update + Refresh**:
   - **Problem**: Optimistic update might be wrong
   - **Solution**: Update immediately, then refresh
   - **Why?** Best of both worlds: fast UI + accurate data

3. **Duplicate Prevention**:
   - **Problem**: Same course added twice
   - **Solution**: Check if course exists before adding
   - **Why?** Prevents UI duplicates

4. **Confirmation Dialog**:
   - **Problem**: Accidental deletion
   - **Solution**: Require confirmation
   - **Why?** Destructive action needs confirmation

5. **Detailed Error Messages**:
   - **Problem**: Generic errors don't help
   - **Solution**: Specific messages for each error type
   - **Why?** Better UX, helps admin fix issues

6. **Extracted fetchCourses Function**:
   - **Problem**: Same code in multiple places
   - **Solution**: Extract to reusable function
   - **Why?** DRY principle, easier maintenance

### Data Structures Used

1. **State**:
   - `user` (Object): Admin user data
   - `courses` (Array): List of all courses
   - `courseThumbnails` (Object): `{ courseId: thumbnailUrl }`
   - `loading` (boolean): Initial load state
   - `error` (string): Error message
   - `showAddForm` (boolean): Form visibility
   - `playlistUrl` (string): Input value
   - `adding` (boolean): Adding state
   - `deletingCourseId` (number | null): Currently deleting course
   - `showUserMenu` (boolean): Dropdown visibility
   - `searchTerm` (string): Search input

2. **Validation Result**:
   ```javascript
   {
       valid: boolean,
       message?: string
   }
   ```

### How It Connects to Other Files

**Imports:**
- `react-router-dom`: `useNavigate`, `Link`
- `../api`: Admin-specific API functions

**API Calls:**
```
AdminDashboard.js → getCurrentUser() → api.js → Backend /auth/users/me
AdminDashboard.js → getCourses() → api.js → Backend /courses
AdminDashboard.js → addYouTubePlaylist(url) → api.js → Backend POST /videos/youtube-playlist
AdminDashboard.js → deleteCourse(courseId) → api.js → Backend DELETE /courses/{id}
```

**Navigation Flow:**
```
Non-admin access → navigate('/dashboard') → Dashboard.js
User clicks "View Course" → Link to="/course/{id}" → CourseDetail.js
User clicks "Course Dashboard" → Link to="/dashboard" → Dashboard.js
```

**Error Flow:**
```
addYouTubePlaylist fails → Error handling → Specific error message → Display to admin
```

### What Panel Can Ask

**Security:**
1. "Is client-side role check sufficient?"
   - **No**: Client-side checks can be bypassed
   - **Backend must also check**: Server-side validation is required
   - **Current**: Backend checks role, client check is UX only

2. "What if someone modifies localStorage to set role='admin'?"
   - Backend validates JWT token (can't be faked)
   - Backend checks role from token, not request
   - **Secure**: Client-side role is just for UI, backend is source of truth

**Error Handling:**
3. "Why check error message strings instead of status codes?"
   - **Current**: Checks `err.message.includes('403')`
   - **Better**: Check `err.response?.status === 403`
   - **Why current?** Some errors don't have response object

4. "How would you handle network timeout for large playlists?"
   - Already handled: Checks for 'timeout' or 'ECONNABORTED'
   - Shows specific message
   - **Could improve**: Add retry mechanism

**UX:**
5. "Why use window.confirm instead of custom modal?"
   - **Simple**: Built-in, no extra code
   - **Trade-off**: Less customizable, not as pretty
   - **Better**: Custom modal component for better UX

6. "Why refresh courses after adding, if already optimistically updated?"
   - **Safety**: Ensures data consistency
   - **Backend might modify**: Course data might change on server
   - **Trade-off**: Extra API call, but ensures accuracy

**Performance:**
7. "What if admin adds 100 playlists? Would it be slow?"
   - Each playlist addition is independent
   - **Current**: Sequential (one at a time)
   - **Could improve**: Queue system for batch processing

---

## File 9: `components/CourseCatalog.js`

### Purpose
**Comprehensive course catalog page** that combines features from Landing and Dashboard. It:
- Displays all courses with expandable descriptions
- Allows admin to add courses (same as AdminDashboard)
- Allows students to register for courses
- Provides search functionality
- Shows registration status for students
- Generates intelligent course descriptions based on title

### Core Logic (Line-by-Line)

```javascript
const fetchCourses = useCallback(async () => {
    // ... fetch logic
}, []);
```
- **useCallback**: Memoizes function to prevent unnecessary re-renders
- **Why?** Used in useEffect dependency, prevents infinite loops
- **Empty deps**: Function doesn't depend on any props/state

```javascript
useEffect(() => {
    const fetchUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            const userData = await getCurrentUser();
            setUser(userData);
        }
    };
    
    fetchUser();
    fetchCourses();
}, [fetchCourses]);
```
- **Two separate fetches**: User and courses fetched independently
- **Why?** User fetch is optional (catalog works without login)
- **fetchCourses in deps**: Re-runs if fetchCourses changes (but it's memoized)

```javascript
useEffect(() => {
    const fetchRegistrations = async () => {
        if (user?.role === 'student' && courses.length > 0) {
            // Fetch registrations in parallel
        }
    };
    fetchRegistrations();
}, [user, courses]);
```
- **Conditional effect**: Only runs when user is student and courses exist
- **Why?** No need to fetch if not student or no courses
- **Dependencies**: Re-runs when user or courses change

```javascript
const getCourseDescription = (courseTitle) => {
    const titleLower = courseTitle.toLowerCase();
    
    if (titleLower.includes('python')) {
        if (titleLower.includes('full course') || titleLower.includes('2025')) {
            return 'Complete Python programming course for 2025-26...';
        }
        return 'Master Python programming from fundamentals...';
    }
    
    if (titleLower.includes('java')) {
        if (titleLower.includes('dsa') || (titleLower.includes('30 days') && titleLower.includes('placement'))) {
            return 'Intensive 30-day Java and Data Structures course...';
        }
        // ... more conditions
    }
    
    // Default fallback
    const words = courseTitle.split(/\s+/).filter(w => w.length > 2);
    const mainTopic = words[0] || 'this subject';
    return `Dive deep into ${mainTopic} with this comprehensive course...`;
};
```
- **Intelligent description generation**: Analyzes course title for keywords
- **Multiple conditions**: Checks for specific patterns
- **Fallback**: Generates generic description if no match
- **Why?** Better UX than empty descriptions, no backend changes needed

```javascript
// Add the new course directly to the state immediately
setCourses(prevCourses => {
    const exists = prevCourses.some(c => c.id === newCourse.id);
    if (exists) {
        return prevCourses;
    }
    return [newCourse, ...prevCourses];
});

// Fetch thumbnail for the new course
// ...

// Also refresh the course list as a backup
await fetchCourses();
```
- **Triple update strategy**:
  1. Optimistic update (immediate)
  2. Fetch thumbnail (for new course)
  3. Full refresh (backup)
- **Why?** Fast UI + complete data + consistency

```javascript
const handleRegister = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRegisteringCourseId(courseId);
    await registerForCourse(courseId);
    setCourseRegistrations(prev => ({
        ...prev,
        [courseId]: true
    }));
};
```
- **Same as Dashboard**: Optimistic update pattern
- **Why duplicate?** Both components need registration functionality

### Why This Approach?

1. **useCallback for fetchCourses**:
   - **Problem**: Function recreated on every render
   - **Solution**: Memoize with useCallback
   - **Why?** Prevents useEffect from running unnecessarily

2. **Conditional Registration Fetching**:
   - **Problem**: Unnecessary API calls for non-students
   - **Solution**: Only fetch if user is student
   - **Why?** Saves API calls, better performance

3. **Intelligent Description Generation**:
   - **Problem**: Backend might not have descriptions
   - **Solution**: Generate based on title keywords
   - **Why?** Better UX, no backend changes
   - **Trade-off**: Hardcoded logic, but works well

4. **Triple Update Strategy**:
   - **Problem**: Balance between speed and accuracy
   - **Solution**: Optimistic + thumbnail + refresh
   - **Why?** Best UX: instant feedback + complete data

5. **Optional User Fetch**:
   - **Problem**: Catalog should work without login
   - **Solution**: Fetch user only if token exists
   - **Why?** Public page, but shows more features if logged in

6. **Reusable Registration Logic**:
   - **Problem**: Same code in Dashboard and Catalog
   - **Solution**: Duplicate (acceptable for now)
   - **Better**: Extract to custom hook `useCourseRegistration()`

### Data Structures Used

1. **State**:
   - `courses` (Array): All courses
   - `courseThumbnails` (Object): `{ courseId: thumbnailUrl }`
   - `user` (Object | null): Current user (null if not logged in)
   - `loading` (boolean): Initial load
   - `error` (string): Error message
   - `showAddForm` (boolean): Admin form visibility
   - `playlistUrl` (string): Input value
   - `adding` (boolean): Adding state
   - `searchTerm` (string): Search input
   - `expandedCourses` (Set): Expanded course IDs
   - `courseRegistrations` (Object): `{ courseId: boolean }`
   - `registeringCourseId` (number | null): Currently registering

2. **Description Logic**:
   - String matching with `.includes()`
   - Multiple conditional checks
   - Fallback string generation

### How It Connects to Other Files

**Imports:**
- `react-router-dom`: `Link` for navigation
- `../api`: All API functions (auth, courses, videos, registration)

**API Calls:**
```
CourseCatalog.js → getCurrentUser() → api.js → Backend /auth/users/me (optional)
CourseCatalog.js → getCourses() → api.js → Backend /courses
CourseCatalog.js → getCourseVideos(courseId) → api.js → Backend /courses/{id}/videos
CourseCatalog.js → getCourseRegistration(courseId) → api.js → Backend /courses/{id}/registration (students only)
CourseCatalog.js → registerForCourse(courseId) → api.js → Backend POST /courses/{id}/register
CourseCatalog.js → addYouTubePlaylist(url) → api.js → Backend POST /videos/youtube-playlist (admin only)
```

**Navigation Flow:**
```
User clicks "Back" → Link to="/dashboard" → Dashboard.js
User clicks "Start Course" → Link to="/course/{id}" → CourseDetail.js
```

**Similar to:**
- **Landing.js**: Public course display, expandable descriptions
- **Dashboard.js**: Registration functionality, user menu
- **AdminDashboard.js**: Add course functionality

### What Panel Can Ask

**Code Reuse:**
1. "Why duplicate registration logic in Dashboard and Catalog?"
   - **Current**: Duplicated code
   - **Better**: Extract to custom hook `useCourseRegistration()`
   - **Why not done?** Time constraints, works fine as-is

2. "How would you share description generation logic?"
   - Extract `getCourseDescription()` to utility file
   - Import in both Landing and Catalog
   - **Current**: Duplicated, but acceptable

**Performance:**
3. "Why use useCallback for fetchCourses?"
   - Prevents function recreation on every render
   - Needed for useEffect dependency
   - **Without it**: useEffect would run on every render (infinite loop risk)

4. "What if description generation is slow for 1000 courses?"
   - **Current**: Runs on every render (O(n))
   - **Better**: Memoize with useMemo
   - **Trade-off**: More memory, but faster renders

**UX:**
5. "Why show different UI for logged-in vs logged-out users?"
   - **Logged in**: Can register, see registration status
   - **Logged out**: Can browse, but must sign up to enroll
   - **Why?** Encourages sign-ups, shows value

6. "How would you add course categories/filters?"
   - Add category field to course object
   - Filter by category: `courses.filter(c => c.category === selectedCategory)`
   - Or server-side filtering for large datasets

**Architecture:**
7. "Should Catalog be a separate page or part of Dashboard?"
   - **Current**: Separate page (better for navigation)
   - **Alternative**: Tab within Dashboard
   - **Why current?** Clearer URL structure, easier to bookmark

---

**Summary of Files 7-9:**

1. **Dashboard.js**: Student dashboard with course registration and search
2. **AdminDashboard.js**: Admin course management with add/delete functionality
3. **CourseCatalog.js**: Comprehensive catalog combining public browsing with authenticated features

These three files handle the **main application features**:
- Dashboard = **Student experience** (personalized course view)
- AdminDashboard = **Admin experience** (course management)
- Catalog = **Discovery experience** (browse all courses)

All three share similar patterns:
- Parallel data fetching
- Optimistic UI updates
- Client-side search/filtering
- Registration status tracking
