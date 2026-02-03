import React, { useState } from 'react';

const VideoPopup = ({ type, onClose, onSubmit }) => {
    const [feedback, setFeedback] = useState('');
    const [rating, setRating] = useState(0);
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [captchaQuestion, setCaptchaQuestion] = useState(() => {
        // Generate a simple math captcha
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        return { question: `${num1} + ${num2}`, answer: num1 + num2 };
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let isValid = true;
        let data = {};

        switch (type) {
            case 'feedback':
                if (!feedback.trim()) {
                    isValid = false;
                    alert('Please provide feedback before submitting.');
                } else {
                    data = { feedback };
                }
                break;
            case 'rating':
                if (rating === 0) {
                    isValid = false;
                    alert('Please select a rating before submitting.');
                } else {
                    data = { rating };
                }
                break;
            case 'captcha':
                if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
                    isValid = false;
                    alert('Incorrect answer. Please try again.');
                    // Generate new captcha
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    setCaptchaQuestion({ question: `${num1} + ${num2}`, answer: num1 + num2 });
                    setCaptchaAnswer('');
                } else {
                    data = { captcha: true };
                }
                break;
            default:
                isValid = false;
        }

        if (isValid) {
            onSubmit(data);
        }
    };

    const renderContent = () => {
        switch (type) {
            case 'feedback':
                return (
                    <div className="popup-content">
                        <h2>How was this video?</h2>
                        <p>We'd love to hear your feedback!</p>
                        <textarea
                            className="popup-textarea"
                            placeholder="Share your thoughts about this video..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows="5"
                        />
                    </div>
                );
            case 'rating':
                return (
                    <div className="popup-content">
                        <h2>Rate this video</h2>
                        <p>How would you rate this video?</p>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`star-btn ${rating >= star ? 'active' : ''}`}
                                    onClick={() => setRating(star)}
                                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="rating-text">You rated: {rating} star{rating !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                );
            case 'captcha':
                return (
                    <div className="popup-content">
                        <h2>Verify you're watching</h2>
                        <p>Please solve this simple math problem to continue:</p>
                        <div className="captcha-question">
                            <p className="captcha-text">{captchaQuestion.question} = ?</p>
                            <input
                                type="number"
                                className="popup-input"
                                placeholder="Enter answer"
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                            />
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="popup-content">
                        <h2>Quick Check</h2>
                        <p>Are you still watching?</p>
                    </div>
                );
        }
    };

    return (
        <div className="video-popup-overlay">
            <div className="video-popup-container">
                <form onSubmit={handleSubmit}>
                    {renderContent()}
                    <div className="popup-actions">
                        <button type="submit" className="popup-submit-btn">
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VideoPopup;
