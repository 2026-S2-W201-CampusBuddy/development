# backend/make_admin.py
#
# Give (or take away) admin rights. You can have as many admins as you like.
# Run it from the backend folder:
#
#   python make_admin.py Sedric Jun          make these accounts admins
#   python make_admin.py --remove Jun        take admin rights away
#   python make_admin.py --list              show who is an admin right now
#
# Names are not case-sensitive. After a change, that person must LOG OUT and
# LOG BACK IN: the Admin bubble only appears after a fresh login.
import argparse


def apply_changes(users, names, remove=False, list_only=False, force=False, say=print):
    """
    Works on a list of user objects (anything with .username and .role) and
    returns an exit code (0 = fine, 1 = something needs your attention).
    Kept separate from the database so it can be tested on its own.
    """
    by_lower = {u.username.lower(): u for u in users}
    admins = lambda: [u for u in users if u.role == 'admin']

    if list_only or not names:
        current = admins()
        say(f"{len(current)} admin(s):" if current else "There are no admins yet.")
        for u in current:
            say(f"  {u.username}")
        if not names:
            say("\nTo change who is an admin:  python make_admin.py NAME [NAME ...]")
            say("To remove an admin:         python make_admin.py --remove NAME")
        return 0

    problems = 0
    seen = set()
    for name in names:
        user = by_lower.get(name.lower())
        if user is None:
            say(f"✗ No account named '{name}'.")
            problems += 1
            continue
        if user.username in seen:
            continue
        seen.add(user.username)

        if remove:
            if user.role != 'admin':
                say(f"- '{user.username}' is not an admin. Nothing changed.")
            elif len(admins()) == 1 and not force:
                say(f"✗ '{user.username}' is the ONLY admin, so I won't remove them (nobody could resolve disputes). "
                    "Make another admin first, or add --force.")
                problems += 1
            else:
                user.role = 'student'
                say(f"✓ '{user.username}' is no longer an admin.")
        else:
            if user.role == 'admin':
                say(f"- '{user.username}' is already an admin. Nothing changed.")
            else:
                user.role = 'admin'
                say(f"✓ '{user.username}' is now an admin.")

    if problems:
        say("\nAccounts that exist: " + ", ".join(u.username for u in users))
    say("\nAdmins now: " + (", ".join(u.username for u in admins()) or "none"))
    say("Anyone changed must log out and back in to see (or lose) the Admin bubble.")
    return 1 if problems else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Give or take away CampusBuddy admin rights.")
    parser.add_argument('usernames', nargs='*', help="account name(s), e.g. Sedric Jun")
    parser.add_argument('--remove', action='store_true', help="take admin rights away instead of giving them")
    parser.add_argument('--list', action='store_true', help="show the current admins and stop")
    parser.add_argument('--force', action='store_true', help="allow removing the last remaining admin")
    args = parser.parse_args(argv)

    from app import app, db          # imported here so apply_changes() can be tested without Flask
    from models.user_model import User

    with app.app_context():
        users = User.query.order_by(User.id).all()
        code = apply_changes(users, args.usernames, remove=args.remove, list_only=args.list, force=args.force)
        db.session.commit()
    return code


if __name__ == '__main__':
    raise SystemExit(main())
