import { Avatar, Stars } from './ui.jsx';

export default function ReviewsList({ reviews, emptyText = 'No reviews yet.' }) {
  if (!reviews?.length) {
    return <p className="muted small">{emptyText}</p>;
  }
  return (
    <div className="stack" style={{ gap: 12 }}>
      {reviews.map((review) => (
        <div className="card review-item" key={review.id}>
          <div className="review-head">
            <Avatar
              user={{ name: review.reviewer_name, avatar_color: review.reviewer_color }}
              size={30}
            />
            <strong>{review.reviewer_name}</strong>
            <Stars value={review.rating} size={13} />
            <span className="review-context">
              {review.swap_teach ? `swapped on ${review.swap_teach}` : ''}
            </span>
          </div>
          {review.comment ? <p className="review-comment">“{review.comment}”</p> : null}
        </div>
      ))}
    </div>
  );
}
