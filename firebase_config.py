import os
import firebase_admin

from threading import RLock
from firebase_admin import credentials, firestore
from dotenv import load_dotenv


# ======================================================
# ENVIRONMENT CONFIGURATION
# ======================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, ".env"))


# ======================================================
# FIREBASE CONNECTION VARIABLES
# ======================================================

_db = None
_lock = RLock()


# ======================================================
# INITIALIZE FIREBASE FIRESTORE
# ======================================================

def get_db():
    """Return a cached and thread-safe Firestore client."""

    global _db

    with _lock:

        # Reuse existing Firestore connection
        if _db is not None:
            return _db

        # Check if Firebase is already initialized
        try:
            firebase_app = firebase_admin.get_app()

        except ValueError:

            # Get Firebase credentials
            credential_path = os.getenv(
                "GOOGLE_APPLICATION_CREDENTIALS",
                "ServiceAccountKey.json"
            )

            # Resolve relative file path
            if not os.path.isabs(credential_path):
                credential_path = os.path.join(
                    BASE_DIR,
                    credential_path
                )

            # Validate credentials file
            if not os.path.isfile(credential_path):
                raise FileNotFoundError(
                    f"Firebase service-account file "
                    f"was not found: {credential_path}"
                )

            # Load Firebase credentials
            cred = credentials.Certificate(credential_path)

            # Initialize Firebase only once
            try:
                firebase_app = firebase_admin.initialize_app(cred)

            except ValueError:
                # Reuse the app if another initializer created it
                firebase_app = firebase_admin.get_app()

        # Create Firestore client
        _db = firestore.client(app=firebase_app)

        print("=" * 50)
        print("MIDNIGHT LIBRARY MANAGER")
        print("Firebase initialized successfully.")
        print("Firestore client is ready.")
        print("=" * 50)

        return _db