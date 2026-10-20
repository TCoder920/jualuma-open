from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from uuid import UUID

from sqlalchemy.orm import Session

from backend.models import UserDocument

MULTIMODAL_MAX_ATTACHMENTS = 4
MULTIMODAL_MAX_BYTES = 12 * 1024 * 1024

_FILE_TYPE_TO_MIME = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
    "bmp": "image/bmp",
}


@dataclass(frozen=True)
class AttachmentAsset:
    id: str
    name: str
    file_type: str
    mime_type: str
    file_path: str
    size_bytes: int


def normalize_attachment_ids(attachment_ids: Iterable[str] | None) -> list[UUID]:
    normalized: list[UUID] = []
    for raw_id in attachment_ids or []:
        try:
            normalized.append(UUID(str(raw_id)))
        except (TypeError, ValueError):
            continue
    return normalized


def get_multimodal_attachment_assets(
    *,
    user_id: str,
    db: Session,
    attachment_ids: Iterable[str] | None,
) -> list[AttachmentAsset]:
    normalized_ids = normalize_attachment_ids(attachment_ids)
    if not normalized_ids:
        return []

    docs = (
        db.query(UserDocument)
        .filter(UserDocument.uid == user_id, UserDocument.id.in_(normalized_ids))
        .order_by(UserDocument.created_at.desc())
        .all()
    )

    assets: list[AttachmentAsset] = []
    for doc in docs:
        file_type = (doc.file_type or "").lower()
        mime_type = _FILE_TYPE_TO_MIME.get(file_type)
        if not mime_type:
            continue

        path = Path(doc.file_path)
        if not path.exists():
            continue

        size_bytes = int(doc.size_bytes or path.stat().st_size or 0)
        if size_bytes <= 0 or size_bytes > MULTIMODAL_MAX_BYTES:
            continue

        assets.append(
            AttachmentAsset(
                id=str(doc.id),
                name=doc.name,
                file_type=file_type,
                mime_type=mime_type,
                file_path=str(path),
                size_bytes=size_bytes,
            )
        )
        if len(assets) >= MULTIMODAL_MAX_ATTACHMENTS:
            break

    return assets
