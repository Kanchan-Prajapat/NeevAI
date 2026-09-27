import json
import sys
from pathlib import Path
import requests
import firebase_admin
from firebase_admin import credentials, firestore


# ============================================================
# PATHS
# ============================================================

ROOT_DIR = Path(__file__).resolve().parent.parent

DATASET_PATH = (
    ROOT_DIR
    / "data"
    / "neevai_synthetic_lifecycle_dataset.json"
)

SERVICE_ACCOUNT_PATH = (
    ROOT_DIR
    / "firebase-service-account.json"
)


# ============================================================
# FIREBASE INITIALIZATION
# ============================================================

def initialize_firestore():
    """
    Initialize Firebase Admin SDK using the local
    service-account JSON file.
    """

    if not SERVICE_ACCOUNT_PATH.exists():
        print(
            f"\nERROR: Firebase service account not found:\n"
            f"{SERVICE_ACCOUNT_PATH}\n"
        )
        sys.exit(1)

    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(
            str(SERVICE_ACCOUNT_PATH)
        )

        firebase_admin.initialize_app(cred)

    return firestore.client()


# ============================================================
# LOAD DATASET
# ============================================================

def load_dataset():
    """
    Load the synthetic lifecycle dataset JSON.
    """

    if not DATASET_PATH.exists():
        print(
            f"\nERROR: Dataset file not found:\n"
            f"{DATASET_PATH}\n"
        )
        sys.exit(1)

    try:
        with open(
            DATASET_PATH,
            "r",
            encoding="utf-8"
        ) as file:
            dataset = json.load(file)

    except json.JSONDecodeError as error:
        print("\nERROR: Invalid JSON file.")
        print(error)
        sys.exit(1)

    return dataset


# ============================================================
# IMPORT PROJECTS
# ============================================================

def import_projects(db, projects):
    """
    Import projects into Firestore.

    Document ID = projectId

    This makes the import deterministic and prevents
    duplicate project documents when the script is run again.
    """

    collection = db.collection("projects")

    count = 0

    for project in projects:

        project_id = project.get("projectId")

        if not project_id:
            print("WARNING: Project without projectId skipped.")
            continue

        document_ref = collection.document(str(project_id))

        document_ref.set(
            project,
            merge=True
        )

        count += 1

        print(
            f"  ✓ Project imported: {project_id}"
        )

    return count


# ============================================================
# IMPORT SNAPSHOTS
# ============================================================

def import_snapshots(db, snapshots):
    """
    Import project snapshots into Firestore.

    Document ID = snapshotId

    This keeps snapshot IDs stable across repeated imports.
    """

    collection = db.collection("projectSnapshots")

    count = 0

    for snapshot in snapshots:

        snapshot_id = snapshot.get("snapshotId")
        project_id = snapshot.get("projectId")

        if not snapshot_id:
            print(
                "WARNING: Snapshot without snapshotId skipped."
            )
            continue

        if not project_id:
            print(
                f"WARNING: Snapshot {snapshot_id} "
                f"has no projectId. Skipped."
            )
            continue

        document_ref = collection.document(
            str(snapshot_id)
        )

        document_ref.set(
            snapshot,
            merge=True
        )

        count += 1

        print(
            f"  ✓ Snapshot imported: "
            f"{snapshot_id} → {project_id}"
        )

    return count


# ============================================================
# VALIDATE DATASET
# ============================================================

def validate_dataset(dataset):
    """
    Basic validation before writing anything.
    """

    required_keys = [
        "datasetName",
        "datasetVersion",
        "projects",
        "snapshots",
    ]

    for key in required_keys:

        if key not in dataset:
            print(
                f"\nERROR: Dataset missing required key: {key}"
            )
            sys.exit(1)

    projects = dataset["projects"]
    snapshots = dataset["snapshots"]

    if not isinstance(projects, list):
        print("\nERROR: 'projects' must be a list.")
        sys.exit(1)

    if not isinstance(snapshots, list):
        print("\nERROR: 'snapshots' must be a list.")
        sys.exit(1)

    project_ids = {
        str(project.get("projectId"))
        for project in projects
        if project.get("projectId")
    }

    invalid_snapshots = [
        snapshot.get("snapshotId")
        for snapshot in snapshots
        if str(snapshot.get("projectId"))
        not in project_ids
    ]

    if invalid_snapshots:

        print(
            "\nERROR: Some snapshots reference "
            "unknown projects:"
        )

        for snapshot_id in invalid_snapshots:
            print(f"  - {snapshot_id}")

        sys.exit(1)

    print("\nDataset validation passed.")
    print(f"  Projects : {len(projects)}")
    print(f"  Snapshots: {len(snapshots)}")


# ============================================================
# RECALCULATE PROJECTS
# ============================================================

BACKEND_URL = "http://127.0.0.1:8000"


def recalculate_projects(projects):
    """
    Trigger the existing NeevAI backend recalculation
    for every imported synthetic project.

    This uses the existing API and does NOT duplicate
    the risk/derived-metric calculation logic.
    """

    print("\n==============================================")
    print(" Recalculating Project Metrics")
    print("==============================================")

    success_count = 0
    failed_count = 0

    for project in projects:

        project_id = project.get("projectId")

        if not project_id:
            continue

        url = (
            f"{BACKEND_URL}"
            f"/api/projects/{project_id}/recalculate"
        )

        print(
            f"\n→ Recalculating {project_id}..."
        )

        try:

            response = requests.post(
                url,
                timeout=60
            )

            if response.ok:

                result = response.json()

                print(
                    f"  ✓ Recalculated successfully"
                )

                if result.get("derivedMetricId"):
                    print(
                        f"  Derived metric: "
                        f"{result['derivedMetricId']}"
                    )

                success_count += 1

            else:

                print(
                    f"  ✗ Recalculation failed"
                )

                print(
                    f"  HTTP {response.status_code}"
                )

                print(
                    f"  {response.text}"
                )

                failed_count += 1

        except requests.exceptions.ConnectionError:

            print(
                "  ✗ Could not connect to backend."
            )

            print(
                f"  Make sure FastAPI is running at "
                f"{BACKEND_URL}"
            )

            failed_count += 1

        except requests.exceptions.RequestException as error:

            print(
                f"  ✗ Request error: {error}"
            )

            failed_count += 1

    print("\n==============================================")
    print(" RECALCULATION SUMMARY")
    print("==============================================")

    print(
        f"Successful: {success_count}"
    )

    print(
        f"Failed    : {failed_count}"
    )

    return success_count, failed_count

# ============================================================
# MAIN
# ============================================================

def main():

    print("\n==============================================")
    print(" NeevAI Synthetic Dataset → Firestore Importer")
    print("==============================================")

    print("\nLoading dataset...")

    dataset = load_dataset()

    print(
        f"Dataset: {dataset.get('datasetName')}"
    )

    print(
        f"Version: {dataset.get('datasetVersion')}"
    )

    print(
        f"Status: "
        f"{dataset.get('officialDataStatus')}"
    )

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    validate_dataset(dataset)

    projects = dataset["projects"]
    snapshots = dataset["snapshots"]

    # --------------------------------------------------------
    # Firebase
    # --------------------------------------------------------

    print("\nConnecting to Firestore...")

    db = initialize_firestore()

    print("Firestore connection ready.")

    # --------------------------------------------------------
    # Import Projects
    # --------------------------------------------------------

    print("\nImporting projects...")

    project_count = import_projects(
        db,
        projects
    )

    # --------------------------------------------------------
    # Import Snapshots
    # --------------------------------------------------------

    print("\nImporting snapshots...")

    snapshot_count = import_snapshots(
        db,
        snapshots
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n==============================================")
    print(" IMPORT COMPLETED")
    print("==============================================")

    print(
        f"Projects imported : {project_count}"
    )

    print(
        f"Snapshots imported: {snapshot_count}"
    )

    print("\nFirestore collections updated:")
    print("  • projects")
    print("  • projectSnapshots")

    print(
        "\nSynthetic dataset was imported successfully."
        )

    print(
        "Remember: this dataset is NOT official PAIMANA data."
        )


# --------------------------------------------------------
# Recalculate Derived Metrics
# --------------------------------------------------------

    recalculate_projects(projects)


if __name__ == "__main__":
    main()