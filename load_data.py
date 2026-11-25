from app import app


# ======================================================
# MIDNIGHT LIBRARY MANAGER
# AUTOMATIC SAMPLE DATA LOADER
# Flask + Firebase Cloud Firestore
# ======================================================

def load_data():

    print("=" * 60)
    print("MIDNIGHT LIBRARY MANAGER")
    print("Sample Collection Loader")
    print("=" * 60)

    with app.test_client() as client:

        # ==============================================
        # 1. CHECK FIRESTORE CONNECTION
        # ==============================================

        print("\nChecking Firestore connection...")

        connection = client.get("/test-firestore")

        result = connection.get_json(silent=True) or {}

        if connection.status_code != 200:

            print("[ERROR] Firestore connection failed.")
            print(result.get("message", "Unknown error."))

            return False

        print("[SUCCESS] Firestore connected successfully.")


        # ==============================================
        # 2. INSERT SAMPLE DATA
        # ==============================================

        print("\nLoading sample collection...")
        print("Preparing books, members, and borrowings...")

        response = client.post("/api/seed")

        result = response.get_json(silent=True) or {}

        if response.status_code not in (200, 201):

            print("[ERROR] Unable to load sample data.")

            if response.status_code == 404:
                print("The /api/seed endpoint is missing in app.py.")
            else:
                print(result.get("message", "Unknown error."))

            return False

        print(
            result.get(
                "message",
                "Sample collection loaded successfully."
            )
        )


        # ==============================================
        # 3. DISPLAY DATABASE SUMMARY
        # ==============================================

        summary = client.get("/api/summary")

        result = summary.get_json(silent=True) or {}

        if summary.status_code == 200:

            data = result.get("data") or {}

            print("\n" + "=" * 60)
            print("LIBRARY DATABASE SUMMARY")
            print("=" * 60)

            print(
                "Total Book Titles     :",
                data.get("total_books", 0)
            )

            print(
                "Total Book Copies     :",
                data.get("total_copies", 0)
            )

            print(
                "Available Copies      :",
                data.get("available_copies", 0)
            )

            print(
                "Registered Members    :",
                data.get("total_members", 0)
            )

            print(
                "Total Borrowings      :",
                data.get("total_borrowings", 0)
            )

            print(
                "Active Borrowings     :",
                data.get("active_borrowings", 0)
            )

            print(
                "Returned Books        :",
                data.get("returned_books", 0)
            )

        else:

            print("[WARNING] Unable to retrieve database summary.")


        # ==============================================
        # 4. COMPLETION MESSAGE
        # ==============================================

        print("\n" + "=" * 60)
        print("SAMPLE DATA LOADING COMPLETED")
        print("=" * 60)

        print("Your library collection is ready.")
        print("Records are stored in Firebase Cloud Firestore.")
        print("You can manage them through your library system.")

        print("\nRun the application using:")
        print("py app.py")

        print("\nOpen your browser:")
        print("http://127.0.0.1:5000")

        print("=" * 60)

        return True


# ======================================================
# RUN SAMPLE DATA LOADER
# ======================================================

if __name__ == "__main__":

    try:

        success = load_data()

        raise SystemExit(0 if success else 1)

    except Exception as error:

        print("\n[ERROR] Sample data loading failed.")
        print(str(error))

        raise SystemExit(1)