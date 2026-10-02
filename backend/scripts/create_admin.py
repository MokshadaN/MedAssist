"""Bootstrap an administrator account for the doctor-verification workflow (P0).

Controlled manual workflow: run this in a trusted environment to create the
first admin (or promote an existing user). Admins approve/reject doctor
verification via /api/v1/admin/doctors.

Usage (from backend/ with the venv active):
    python scripts/create_admin.py --email admin@example.com --name "Ops Admin"
    # (will prompt for a password, or pass --password for scripting)

Existing users can be promoted:
    python scripts/create_admin.py --email existing@example.com --promote
"""

import argparse
import getpass
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.database import SessionLocal  # noqa: E402
from models.user import User  # noqa: E402
from utils.security import hash_password  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or promote a MedAssist admin user.")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--name", default="Administrator", help="Admin display name")
    parser.add_argument("--password", help="Password (prompted when omitted)")
    parser.add_argument("--phone", default=None, help="Optional phone number")
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Grant the admin role to an EXISTING user instead of creating a new one",
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    password = args.password or getpass.getpass("Admin password: ")

    if not args.promote and len(password) < 8:
        print("ERROR: password must be at least 8 characters.")
        return 1

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()

        if args.promote:
            if not existing:
                print(f"ERROR: no user exists with email {email} — create one first, then promote.")
                return 1
            existing.role = "admin"
            db.add(existing)
            db.commit()
            print(f"Promoted {email} to administrator.")
            return 0

        if existing:
            print(f"ERROR: a user with email {email} already exists. Use --promote to grant admin rights.")
            return 1

        user = User(
            name=args.name.strip() or "Administrator",
            email=email,
            password_hash=hash_password(password),
            role="admin",
            phone=args.phone,
        )
        db.add(user)
        db.commit()
        print(f"Administrator {email} created. They can now review doctor verifications at /api/v1/admin/doctors.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())