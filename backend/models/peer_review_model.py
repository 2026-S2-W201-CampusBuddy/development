# This file is like a "Warehouse" — it stores peer review groups,
# memberships, and ratings.
#
# DESIGN SUMMARY (see conversation / docs for the full reasoning):
# - A group is created by one student, who names it. The creator is
#   automatically a CONFIRMED member. Anyone they add starts PENDING and
#   must personally confirm before they count as a real member.
# - Any confirmed member can submit ratings for anyone in the group
#   (confirmed or still pending) — a pending invite does not block being
#   rated, only confirming gives you visibility into your own public score.
# - An individual rating (all 4 categories + comments) is visible to
#   EXACTLY ONE person: whoever wrote it. No one — not the person rated,
#   not other group members — can ever see an individual rating.
# - The only thing ever surfaced publicly is a single rolling average of
#   the "overall" category, per student, across every group where THAT
#   STUDENT has personally confirmed membership. It only appears once a
#   student has at least MIN_RATERS_FOR_PUBLIC_SCORE confirmed raters,
#   so a single rating can never be directly exposed as a number.
from datetime import datetime
from extensions import db

MIN_RATERS_FOR_PUBLIC_SCORE = 2


class PeerReviewGroup(db.Model):
    __tablename__ = 'peer_review_groups'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    creator_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def create(name, creator_id):
        group = PeerReviewGroup(name=name.strip(), creator_id=creator_id)
        db.session.add(group)
        db.session.flush()  # get group.id before commit

        # Creator is automatically a confirmed member of their own group
        membership = PeerReviewGroupMembership(
            group_id=group.id,
            user_id=creator_id,
            status='confirmed',
            confirmed_at=datetime.utcnow(),
        )
        db.session.add(membership)
        db.session.commit()
        return group

    @staticmethod
    def get_by_id(group_id):
        return PeerReviewGroup.query.get(group_id)


class PeerReviewGroupMembership(db.Model):
    __tablename__ = 'peer_review_group_memberships'

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending' | 'confirmed'
    invited_at = db.Column(db.DateTime, default=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    @staticmethod
    def get_membership(group_id, user_id):
        return PeerReviewGroupMembership.query.filter_by(group_id=group_id, user_id=user_id).first()

    @staticmethod
    def is_confirmed_member(group_id, user_id):
        m = PeerReviewGroupMembership.get_membership(group_id, user_id)
        return m is not None and m.status == 'confirmed'

    @staticmethod
    def is_any_member(group_id, user_id):
        return PeerReviewGroupMembership.get_membership(group_id, user_id) is not None

    @staticmethod
    def invite(group_id, user_id):
        existing = PeerReviewGroupMembership.get_membership(group_id, user_id)
        if existing:
            return existing, False  # already invited or already a member
        membership = PeerReviewGroupMembership(group_id=group_id, user_id=user_id, status='pending')
        db.session.add(membership)
        db.session.commit()
        return membership, True

    @staticmethod
    def confirm(membership_id, user_id):
        m = PeerReviewGroupMembership.query.get(membership_id)
        if not m or m.user_id != user_id:
            return None
        m.status = 'confirmed'
        m.confirmed_at = datetime.utcnow()
        db.session.commit()
        return m

    @staticmethod
    def decline(membership_id, user_id):
        m = PeerReviewGroupMembership.query.get(membership_id)
        if not m or m.user_id != user_id:
            return False
        db.session.delete(m)
        db.session.commit()
        return True

    @staticmethod
    def get_pending_invites_for_user(user_id):
        return PeerReviewGroupMembership.query.filter_by(user_id=user_id, status='pending').all()

    @staticmethod
    def get_confirmed_memberships_for_user(user_id):
        return PeerReviewGroupMembership.query.filter_by(user_id=user_id, status='confirmed').all()

    @staticmethod
    def get_members_of_group(group_id):
        return PeerReviewGroupMembership.query.filter_by(group_id=group_id).all()


class PeerReviewRating(db.Model):
    __tablename__ = 'peer_review_ratings'

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, nullable=False)
    rater_id = db.Column(db.Integer, nullable=False)
    rated_id = db.Column(db.Integer, nullable=False)

    documentation_rating = db.Column(db.Integer, nullable=False)
    documentation_comment = db.Column(db.String(1000))
    product_rating = db.Column(db.Integer, nullable=False)
    product_comment = db.Column(db.String(1000))
    attendance_rating = db.Column(db.Integer, nullable=False)
    attendance_comment = db.Column(db.String(1000))
    overall_rating = db.Column(db.Integer, nullable=False)
    overall_comment = db.Column(db.String(1000))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def upsert_rating(group_id, rater_id, rated_id, scores):
        """A rater can only have ONE rating row per teammate per group —
        submitting again updates it rather than creating a duplicate."""
        existing = PeerReviewRating.query.filter_by(
            group_id=group_id, rater_id=rater_id, rated_id=rated_id
        ).first()

        if existing:
            existing.documentation_rating = scores['documentation_rating']
            existing.documentation_comment = scores.get('documentation_comment')
            existing.product_rating = scores['product_rating']
            existing.product_comment = scores.get('product_comment')
            existing.attendance_rating = scores['attendance_rating']
            existing.attendance_comment = scores.get('attendance_comment')
            existing.overall_rating = scores['overall_rating']
            existing.overall_comment = scores.get('overall_comment')
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return existing

        rating = PeerReviewRating(
            group_id=group_id, rater_id=rater_id, rated_id=rated_id,
            documentation_rating=scores['documentation_rating'],
            documentation_comment=scores.get('documentation_comment'),
            product_rating=scores['product_rating'],
            product_comment=scores.get('product_comment'),
            attendance_rating=scores['attendance_rating'],
            attendance_comment=scores.get('attendance_comment'),
            overall_rating=scores['overall_rating'],
            overall_comment=scores.get('overall_comment'),
        )
        db.session.add(rating)
        db.session.commit()
        return rating

    @staticmethod
    def get_ratings_given_by(rater_id):
        """A rater's own private history of what they've submitted —
        the only view in this whole feature where ratings are shown
        with full detail, since it's always the author looking at their
        own words."""
        return PeerReviewRating.query.filter_by(rater_id=rater_id).order_by(
            PeerReviewRating.updated_at.desc()
        ).all()

    @staticmethod
    def get_public_overall_score(user_id):
        """Only counts a rating toward the public score if the RATED
        person has personally confirmed membership in that specific
        group — this stops a stranger from fabricating a group and
        tanking someone's real public reputation without their
        knowledge. Returns None if below the minimum-raters threshold,
        so a single rating (or two) is never directly exposed as a
        visible number."""
        ratings = db.session.query(PeerReviewRating).join(
            PeerReviewGroupMembership,
            db.and_(
                PeerReviewGroupMembership.group_id == PeerReviewRating.group_id,
                PeerReviewGroupMembership.user_id == PeerReviewRating.rated_id,
                PeerReviewGroupMembership.status == 'confirmed',
            )
        ).filter(PeerReviewRating.rated_id == user_id).all()

        distinct_raters = {r.rater_id for r in ratings}
        if len(distinct_raters) < MIN_RATERS_FOR_PUBLIC_SCORE:
            return {
                "meetsThreshold": False,
                "overallScore": None,
                "raterCount": len(distinct_raters),
            }

        average = sum(r.overall_rating for r in ratings) / len(ratings)
        return {
            "meetsThreshold": True,
            "overallScore": round(average, 2),
            "raterCount": len(distinct_raters),
        }
