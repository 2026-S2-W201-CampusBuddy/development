import { TERMS_VERSION } from '../termsVersion'
import './TermsContent.css'

// IMPORTANT: if you change the wording below in any way that matters,
// bump TERMS_VERSION (src/termsVersion.js) AND CURRENT_TERMS_VERSION
// (backend/models/user_model.py). Everyone will then be asked to accept
// the new version before using Peer Review again.
export default function TermsContent() {
  return (
    <div className="termsTextBox termsFull">
      <p className="termsVersionLine">Terms and Conditions — version {TERMS_VERSION}</p>

      <h4>1. About CampusBuddy</h4>
      <p>
        CampusBuddy is a student project created as part of coursework at AUT. It is not an
        official AUT service. It is provided "as is", without warranties of any kind.
      </p>

      <h4>2. Your account</h4>
      <p>
        Register with your own AUT email address and give accurate information. Keep your login
        private, do not let anyone else use your account, and do not create more than one
        account. You are responsible for everything done through your account.
      </p>

      <h4>3. Community</h4>
      <p>
        Posts and comments you make in Community can be seen by other CampusBuddy users. Do not
        post anything unlawful, abusive, discriminatory or misleading.
      </p>

      <h4>4. Peer Review — how it works</h4>
      <p>
        Peer Review lets you create a group, invite classmates, and rate group members on
        documentation, product, attendance and overall contribution (1 to 5), with optional
        comments. A rating only counts towards someone's score once they have confirmed they
        were in that group.
      </p>
      <p>
        <strong>What you write is private.</strong> Other students, including the person you
        rate, cannot see your individual ratings or comments, or who submitted them.
      </p>
      <p>
        <strong>One score is public.</strong> Each student has a single overall score: the
        average of the "Overall" ratings they have received. It is shown only once at least 3
        different group members have rated them, and any CampusBuddy user can look it up by
        username.
      </p>
      <p>
        <strong>Administrators can see everything.</strong> CampusBuddy administrators, which
        may include the CampusBuddy developers and AUT lecturers or tutors who have been given
        admin access, can see all Peer Review data, including who gave each rating, the scores,
        the comments and when they were submitted. By using Peer Review you consent to this.
      </p>

      <h4>5. Ratings must be honest</h4>
      <p>
        Only rate people you genuinely worked with in that group, and make sure your ratings
        and comments are your honest, fair assessment. You must not:
      </p>
      <ul>
        <li>submit false or exaggerated ratings or comments, or invent a group or a working relationship;</li>
        <li>arrange with others to raise or lower someone's score, or rate in exchange for anything;</li>
        <li>rate someone to retaliate against, pressure or harass them, or try to identify, confront or retaliate against the author of a rating;</li>
        <li>write comments that are defamatory, abusive, discriminatory, or that reveal someone's private information;</li>
        <li>use more than one account, or try to get around the group confirmation or minimum-rater rules.</li>
      </ul>

      <h4>6. If you break these rules</h4>
      <p>
        We may, at our discretion and without notice, investigate (including using administrator
        records and automated checks such as ratings submitted unusually quickly), remove or
        void ratings, recalculate scores, and suspend or delete your account. We may also report
        suspected misuse to your course coordinator or to AUT, who may deal with it under the
        university's academic integrity or conduct processes.
      </p>
      <p>
        Separately, a person harmed by a false or harmful rating may have legal rights against
        the person who wrote it. In New Zealand this can include legal action in defamation and
        proceedings under the Harmful Digital Communications Act 2015.
      </p>

      <h4>7. Your responsibility for what you submit</h4>
      <p>
        You are responsible for the ratings, comments and posts you submit. To the extent the
        law allows, you agree to be responsible for any loss, claim or cost suffered by
        CampusBuddy's creators because of content you submit that is false, unlawful or breaks
        these terms.
      </p>

      <h4>8. Scores are not guarantees</h4>
      <p>
        A score is only a summary of the opinions of a small number of classmates. It may be
        inaccurate, incomplete or unfair, and it is not verified by CampusBuddy or AUT. Do not
        rely on it as the sole basis for decisions about hiring, grades or choosing group
        members, and do not present it as an official reference or qualification.
      </p>

      <h4>9. Disputes</h4>
      <p>
        If you believe a rating or score about you is false or abusive, tell the CampusBuddy
        team (or your course tutor, who can pass it on). We will review it using the
        administrator records and may remove it. We cannot promise any particular outcome or
        timeframe.
      </p>

      <h4>10. Limits of our responsibility</h4>
      <p>
        To the maximum extent permitted by New Zealand law, CampusBuddy's creators are not liable
        for loss arising from your use of CampusBuddy or from content posted by other users,
        including ratings and scores. Nothing in these terms limits any right you have under
        law that cannot be excluded.
      </p>

      <h4>11. Your information</h4>
      <p>
        We store your account details, your groups, ratings and comments, and a record of which
        version of these terms you accepted and when. We use this to run CampusBuddy, to show
        scores as described above, and to investigate misuse. Your email is used for
        verification and essential account messages. You can ask to see or correct the personal
        information we hold about you.
      </p>

      <h4>12. Changes</h4>
      <p>
        We may update these terms. If an update affects Peer Review, you will need to accept the
        new version before you can use it again.
      </p>
    </div>
  )
}
