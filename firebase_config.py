import os
import json
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

    global _db

    with _lock:

        if _db is not None:
            return _db

        try:
            firebase_app = firebase_admin.get_app()

        except ValueError:

            # VERCEL CLOUD CONFIGURATION
            firebase_json = os.getenv(
                "FIREBASE_SERVICE_ACCOUNT", ""
            ).strip()

            if firebase_json:

                try:
                    service_account = json.loads(
                        firebase_json
                    )

                    cred = credentials.Certificate(
                        service_account
                    )

                except (ValueError, TypeError) as error:
                    raise RuntimeError(
                        "Invalid Firebase service account configuration."
                    ) from error

            # LOCAL PYCHARM CONFIGURATION
            else:

                credential_path = os.getenv(
                    "GOOGLE_APPLICATION_CREDENTIALS",
                    "ServiceAccountKey.json"
                )

                if not os.path.isabs(credential_path):
                    credential_path = os.path.join(
                        BASE_DIR,
                        credential_path
                    )

                if not os.path.isfile(credential_path):
                    raise FileNotFoundError(
                        "Firebase service account file not found."
                    )

                cred = credentials.Certificate(
                    credential_path
                )

            firebase_app = firebase_admin.initialize_app(
                cred
            )

        # CREATE FIRESTORE CLIENT
        _db = firestore.client(app=firebase_app)

        print("=" * 50)
        print("THE WILLOW | LIBRARY BOOK MANAGER")
        print("Firebase initialized successfully.")
        print("Firestore client is ready.")
        print("=" * 50)

        return _db
