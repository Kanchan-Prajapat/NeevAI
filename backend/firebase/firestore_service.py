import os
import json
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore


# ---------------------------------------------------------------------------
# Firebase initialization
# ---------------------------------------------------------------------------


LOCAL_SERVICE_ACCOUNT_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
    ),
    "firebase-service-account.json",
)


def _initialize_firebase() -> None:
    """
    Initialize Firebase Admin SDK once.

    Production:
    Uses FIREBASE_SERVICE_ACCOUNT_JSON environment variable.

    Local development:
    Falls back to firebase-service-account.json.
    """

    if firebase_admin._apps:
        return

    firebase_service_account_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )

    if firebase_service_account_json:
        try:
            service_account_info = json.loads(
                firebase_service_account_json
            )

            credential = credentials.Certificate(
                service_account_info
            )

            firebase_admin.initialize_app(
                credential
            )

            return

        except json.JSONDecodeError as error:
            raise ValueError(
                "FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON."
            ) from error

    if not os.path.exists(
        LOCAL_SERVICE_ACCOUNT_PATH
    ):
        raise FileNotFoundError(
            "Firebase credentials not found. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON "
            "or provide firebase-service-account.json locally."
        )

    credential = credentials.Certificate(
        LOCAL_SERVICE_ACCOUNT_PATH
    )

    firebase_admin.initialize_app(
        credential
    )

_initialize_firebase()


db = firestore.client()


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

def get_project_by_project_id(
    project_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Find a project using NeevAI's business projectId.

    IMPORTANT:
    projectId is NOT assumed to be the Firestore
    document ID.
    """

    projects_ref = db.collection(
        "projects"
    )

    query = (
        projects_ref
        .where(
            "projectId",
            "==",
            project_id,
        )
        .limit(1)
        .stream()
    )

    for document in query:
        data = document.to_dict()

        return {
            "id": document.id,
            **data,
        }

    return None


# ---------------------------------------------------------------------------
# Get all projects
# ---------------------------------------------------------------------------

def get_all_projects() -> List[Dict[str, Any]]:
    """
    Get all projects from the Firestore projects collection.

    Returns the complete project records along with
    their Firestore document IDs.
    """

    projects_ref = db.collection(
        "projects"
    )

    documents = projects_ref.stream()

    projects: List[
        Dict[str, Any]
    ] = []

    for document in documents:
        data = document.to_dict()

        projects.append(
            {
                "id": document.id,
                **data,
            }
        )

    return projects

# ---------------------------------------------------------------------------
# Project snapshots
# ---------------------------------------------------------------------------

def get_project_snapshots(
    project_id: str,
) -> List[Dict[str, Any]]:
    """
    Get all snapshots belonging to a project.

    Snapshots are linked using the business
    projectId field.
    """

    snapshots_ref = db.collection(
        "projectSnapshots"
    )

    query = (
        snapshots_ref
        .where(
            "projectId",
            "==",
            project_id,
        )
        .stream()
    )

    snapshots: List[
        Dict[str, Any]
    ] = []

    for document in query:
        data = document.to_dict()

        snapshots.append(
            {
                "id": document.id,
                **data,
            }
        )

    return snapshots


# ---------------------------------------------------------------------------
# Latest snapshot
# ---------------------------------------------------------------------------

def get_latest_project_snapshot(
    project_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Return the latest snapshot for a project
    based on reportDate.
    """

    snapshots = get_project_snapshots(
        project_id
    )

    if not snapshots:
        return None

    def snapshot_sort_key(
        snapshot: Dict[str, Any],
    ) -> float:
        report_date = snapshot.get(
            "reportDate"
        )

        if report_date is None:
            return 0.0

        # Firestore Timestamp
        if hasattr(
            report_date,
            "timestamp",
        ):
            return float(
                report_date.timestamp()
            )

        # Python datetime
        if hasattr(
            report_date,
            "timestamp",
        ):
            return float(
                report_date.timestamp()
            )

        # ISO string
        if isinstance(
            report_date,
            str,
        ):
            try:
                from datetime import datetime

                parsed_date = datetime.fromisoformat(
                    report_date.replace(
                        "Z",
                        "+00:00",
                    )
                )

                return parsed_date.timestamp()

            except ValueError:
                return 0.0

        return 0.0

    snapshots.sort(
        key=snapshot_sort_key,
        reverse=True,
    )

    return snapshots[0]