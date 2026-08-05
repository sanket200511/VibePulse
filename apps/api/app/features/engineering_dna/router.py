import urllib.parse
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.engineering_dna.schemas import EngineeringDNARead
from app.features.engineering_dna.service import get_engineering_dna

router = APIRouter(prefix="/projects/{project_id}/files", tags=["engineering_dna"])


@router.get("/{file_id:path}/dna", response_model=EngineeringDNARead)
async def read_engineering_dna(
    project_id: uuid.UUID,
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> EngineeringDNARead:
    file_path = urllib.parse.unquote(file_id)
    dna = await get_engineering_dna(db, project_id, file_path)

    if not dna:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Engineering DNA not found for this file."
        )
    return dna
